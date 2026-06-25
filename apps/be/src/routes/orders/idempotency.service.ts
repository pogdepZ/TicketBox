import { ConflictException, Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { IdempotencyStatus } from "../../generated/prisma";

/** TTL cho idempotency cache trong Redis (24 giờ) */
const IDEMPOTENCY_REDIS_TTL_SECONDS = 24 * 60 * 60;

/** TTL cho record DB (24 giờ từ thời điểm tạo) */
const IDEMPOTENCY_DB_TTL_HOURS = 24;

export interface IdempotencyCachedResponse {
  status: number;
  body: unknown;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Tạo hash từ body request để phát hiện conflict khi dùng cùng key với body khác.
   */
  computeRequestHash(userId: string, payload: unknown): string {
    return createHash("sha256")
      .update(userId + JSON.stringify(payload))
      .digest("hex");
  }

  /**
   * Kiểm tra idempotency key.
   * - Trả về cached response nếu đã có (same key + same hash).
   * - Throw 409 nếu same key + different hash (conflict).
   * - Trả về null nếu chưa có → caller tiếp tục xử lý.
   */
  async check(
    key: string,
    requestHash: string,
  ): Promise<IdempotencyCachedResponse | null> {
    const redisKey = `idempotency:${key}`;

    // --- Lớp 1: Redis fast-path ---
    const cached = await this.redis.getJson<{
      hash: string;
      status: number;
      body: unknown;
    }>(redisKey);

    if (cached) {
      if (cached.hash !== requestHash) {
        throw new ConflictException({
          message: "Idempotency key conflict",
          key,
        });
      }
      this.logger.debug(`Idempotency cache HIT (Redis): ${key}`);
      return { status: cached.status, body: cached.body };
    }

    // --- Lớp 2: DB fallback ---
    const record = await this.prisma.idempotencyRecord.findUnique({
      where: { key },
    });

    if (!record) {
      return null; // chưa có → tạo mới
    }

    if (record.requestHash !== requestHash) {
      throw new ConflictException({
        message: "Idempotency key conflict",
        key,
      });
    }

    if (record.status === IdempotencyStatus.PROCESSING) {
      if (record.expiresAt.getTime() > Date.now()) {
        // Request đang được xử lý ở instance khác
        throw new ConflictException({
          message: "Request is already being processed",
          key,
        });
      }

      this.logger.warn(
        `Stale PROCESSING idempotency record detected, allowing retry: ${key}`,
      );
      return null;
    }

    if (
      record.status === IdempotencyStatus.COMPLETED &&
      record.responseBody !== null
    ) {
      // Hydrate lại Redis để lần sau nhanh hơn
      await this.redis.setJson(
        redisKey,
        {
          hash: requestHash,
          status: record.responseStatus,
          body: record.responseBody,
        },
        IDEMPOTENCY_REDIS_TTL_SECONDS,
      );
      this.logger.debug(`Idempotency cache HIT (DB): ${key}`);
      return {
        status: record.responseStatus ?? 200,
        body: record.responseBody,
      };
    }

    return null;
  }

  /**
   * Tạo record PROCESSING trước khi xử lý (ngăn concurrent duplicate).
   * Dùng upsert/transaction để an toàn nếu record đã được tạo hoặc đã FAILED trước đó.
   */
  async markProcessing(
    key: string,
    requestHash: string,
    userId?: string | null,
  ): Promise<void> {
    const expiresAt = new Date(
      Date.now() + IDEMPOTENCY_DB_TTL_HOURS * 60 * 60 * 1000,
    );

    await this.prisma.$transaction(async (tx) => {
      // Lock dòng idempotency key nếu đã tồn tại
      await tx.$executeRaw`SELECT key FROM idempotency_records WHERE key = ${key} FOR UPDATE`;

      const record = await tx.idempotencyRecord.findUnique({
        where: { key },
      });

      if (record) {
        if (
          record.status === IdempotencyStatus.PROCESSING &&
          record.expiresAt.getTime() > Date.now()
        ) {
          throw new ConflictException({
            message: "Request is already being processed",
            key,
          });
        }
        if (record.status === IdempotencyStatus.COMPLETED) {
          throw new ConflictException({
            message: "Request has already been completed",
            key,
          });
        }

        // Nếu trạng thái trước đó là FAILED, cho phép retry bằng cách cập nhật lại sang PROCESSING
        await tx.idempotencyRecord.update({
          where: { key },
          data: {
            requestHash,
            userId: userId ?? null,
            status: IdempotencyStatus.PROCESSING,
            expiresAt,
          },
        });
      } else {
        await tx.idempotencyRecord.create({
          data: {
            key,
            requestHash,
            userId: userId ?? null,
            status: IdempotencyStatus.PROCESSING,
            expiresAt,
          },
        });
      }
    });
  }

  /**
   * Cập nhật record sau khi xử lý xong (COMPLETED hoặc FAILED).
   * Đồng thời ghi cache vào Redis.
   */
  async store(
    key: string,
    requestHash: string,
    responseStatus: number,
    responseBody: unknown,
    status: IdempotencyStatus = IdempotencyStatus.COMPLETED,
  ): Promise<void> {
    await this.prisma.idempotencyRecord.update({
      where: { key },
      data: {
        status,
        responseStatus,
        responseBody: responseBody as any,
      },
    });

    if (status === IdempotencyStatus.COMPLETED) {
      const redisKey = `idempotency:${key}`;
      await this.redis.setJson(
        redisKey,
        { hash: requestHash, status: responseStatus, body: responseBody },
        IDEMPOTENCY_REDIS_TTL_SECONDS,
      );
    }
  }

  /**
   * Đánh dấu FAILED (dùng khi transaction rollback).
   */
  async markFailed(key: string): Promise<void> {
    await this.prisma.idempotencyRecord
      .update({
        where: { key },
        data: { status: IdempotencyStatus.FAILED },
      })
      .catch((err) => {
        this.logger.error(
          `Failed to mark idempotency record as FAILED: ${key}`,
          err,
        );
      });
  }

  async releaseStaleProcessing(
    key: string,
    olderThanMs: number,
  ): Promise<void> {
    await this.prisma.idempotencyRecord.updateMany({
      where: {
        key,
        status: IdempotencyStatus.PROCESSING,
        createdAt: {
          lt: new Date(Date.now() - olderThanMs),
        },
      },
      data: { status: IdempotencyStatus.FAILED },
    });
  }
}
