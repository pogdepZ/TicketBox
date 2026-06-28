import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { createHash } from "crypto";
import { PrismaService } from "../../common/prisma/prisma.service";
import { UploadedFileDto } from "./dto/uploaded-file.dto";
import { S3Service } from "../../common/s3/s3.service";
import { OutboxService } from "../../common/outbox/outbox.service";
import { IdempotencyService } from "../orders/idempotency.service";
import { IdempotencyStatus } from "../../generated/prisma";
import { QueueEvents } from "bullmq";
import redisConfig from "../../config/redis.config";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
const STALE_IDEMPOTENCY_GRACE_MS = 5 * 1000;

@Injectable()
export class AiBioService implements OnModuleDestroy {
  private readonly queueEvents: QueueEvents;

  constructor(
    private prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly s3Service: S3Service,
    private readonly idempotencyService: IdempotencyService,
    @Inject(redisConfig.KEY)
    private readonly redis: ConfigType<typeof redisConfig>,
  ) {
    this.queueEvents = new QueueEvents("ai", {
      connection: {
        host: redis.host,
        port: redis.port,
        password: redis.password,
        db: redis.db,
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queueEvents.close();
  }

  async generateBioFromPdf(
    concertId: string,
    file: UploadedFileDto,
    idempotencyKey: string,
  ): Promise<{ bio: string }> {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { id: true, artistBioStatus: true },
    });

    if (!concert) {
      throw new NotFoundException("Concert not found");
    }

    if (concert.artistBioStatus === "PROCESSING") {
      throw new ConflictException("AI bio request is already being processed");
    }

    if (!file) {
      throw new BadRequestException("PDF file is required");
    }

    if (file.mimetype !== "application/pdf") {
      throw new BadRequestException("Only PDF files are supported");
    }

    if (!file.buffer?.length) {
      throw new BadRequestException("Uploaded PDF is empty");
    }

    if (file.buffer.length > MAX_PDF_SIZE_BYTES) {
      throw new BadRequestException("PDF file size must not exceed 10 MB");
    }

    const scopedKey = this.buildArtistBioIdempotencyKey(
      concertId,
      idempotencyKey,
    );
    const requestHash = this.idempotencyService.computeRequestHash(concertId, {
      originalName: file.originalname || "unknown.pdf",
      size: file.buffer.length,
      mimetype: file.mimetype || "application/pdf",
    });

    // Recover records left PROCESSING by a crashed/timed-out request without
    // opening a race window for immediate double-submit.
    await this.idempotencyService.releaseStaleProcessing(
      scopedKey,
      STALE_IDEMPOTENCY_GRACE_MS,
    );

    const cached = await this.idempotencyService.check(scopedKey, requestHash);
    if (cached) {
      return cached.body as { bio: string };
    }

    await this.markBioRequestProcessing(
      scopedKey,
      requestHash,
      concertId,
      idempotencyKey,
    );

    const fileExtension = file.originalname?.split(".").pop() || "pdf";
    const s3Key = `concerts/${concertId}/artist-assets/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;

    // Upload file to S3
    const fileUrl = await this.s3Service.uploadFile(
      s3Key,
      file.buffer,
      file.mimetype || "application/pdf",
    );

    try {
      const asset = await this.prisma.artistAsset.create({
        data: {
          concertId,
          fileUrl,
          fileType: file.mimetype || "application/pdf",
          originalFileName: file.originalname || "unknown.pdf",
          status: "UPLOADED",
        },
      });

      await this.prisma.concert.update({
        where: { id: concertId },
        data: {
          artistBioStatus: "PROCESSING",
        },
      });

      const { job } = await this.outboxService.put("ai", "generate-bio", {
        concertId,
        assetId: asset.id,
      });

      if (!job) {
        throw new Error("AI queue is temporarily unavailable");
      }

      const result = (await job.waitUntilFinished(this.queueEvents)) as {
        bio: string;
      };

      await this.idempotencyService.store(
        scopedKey,
        requestHash,
        200,
        { bio: result.bio },
        IdempotencyStatus.COMPLETED,
      );

      return { bio: result.bio };
    } catch (error) {
      await this.idempotencyService.markFailed(scopedKey);
      throw error;
    }
  }

  async deleteArtistBio(concertId: string): Promise<{ success: true }> {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { id: true },
    });

    if (!concert) {
      throw new NotFoundException("Concert not found");
    }

    await this.prisma.concert.update({
      where: { id: concertId },
      data: {
        artistBio: null,
        artistBioStatus: "EMPTY",
      },
    });

    return { success: true };
  }

  private buildArtistBioIdempotencyKey(
    concertId: string,
    idempotencyKey: string,
  ): string {
    const digest = createHash("sha256")
      .update(`ai-bio:${concertId}:${idempotencyKey.trim()}`)
      .digest("hex");

    return `ai-bio:${digest}`;
  }

  private async markBioRequestProcessing(
    scopedKey: string,
    requestHash: string,
    concertId: string,
    idempotencyKey: string,
  ): Promise<void> {
    try {
      await this.idempotencyService.markProcessing(
        scopedKey,
        requestHash,
        null,
      );
      return;
    } catch (error) {
      const concert = await this.prisma.concert.findUnique({
        where: { id: concertId },
        select: { artistBioStatus: true },
      });

      if (concert?.artistBioStatus !== "PROCESSING") {
        await this.idempotencyService.releaseStaleProcessing(
          scopedKey,
          STALE_IDEMPOTENCY_GRACE_MS,
        );
        await this.idempotencyService.markProcessing(
          scopedKey,
          requestHash,
          null,
        );
        return;
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new ConflictException({
        message: "AI bio request is already being processed",
        key: idempotencyKey,
      });
    }
  }
}
