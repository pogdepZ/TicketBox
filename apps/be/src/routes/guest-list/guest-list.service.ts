import { BadRequestException, ConflictException, Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UploadedFileDto } from './dto/uploaded-file.dto';
import { QueueEvents } from 'bullmq';
import redisConfig from '../../config/redis.config';
import { ConfigType } from '@nestjs/config';
import { S3Service } from '../../common/s3/s3.service';
import { createHash } from 'crypto';
import { OutboxService } from '../../common/outbox/outbox.service';

@Injectable()
export class GuestListService implements OnModuleDestroy {
  private queueEvents: QueueEvents;

  constructor(
    private prisma: PrismaService,
    private readonly outboxService: OutboxService,
    @Inject(redisConfig.KEY)
    private readonly redis: ConfigType<typeof redisConfig>,
    private readonly s3Service: S3Service,
  ) {
    this.queueEvents = new QueueEvents('csv', {
      connection: {
        host: redis.host,
        port: redis.port,
        password: redis.password,
        db: redis.db,
      },
    });
  }

  async onModuleDestroy() {
    await this.queueEvents.close();
  }

  async importFromCsv(
    concertId: string,
    file: UploadedFileDto,
  ): Promise<{ imported: number; duplicates: number; errors: number }> {
    if (!file) {
      throw new BadRequestException(
        'CSV file is required. Send multipart/form-data with a file field named "file".',
      );
    }
    const fileHash = createHash('sha256').update(file.buffer).digest('hex');

    // Check if duplicate batch exists to prevent double-submit
    const existing = await this.prisma.guestImportBatch.findFirst({
      where: {
        concertId,
        fileHash,
        status: 'COMPLETED',
      },
    });
    if (existing) {
      throw new ConflictException('This guest list has already been successfully imported');
    }

    // Upload CSV to S3
    const s3Key = `concerts/${concertId}/guest-lists/${Date.now()}-${file.originalname}`;
    const fileUrl = await this.s3Service.uploadFile(
      s3Key,
      file.buffer,
      file.mimetype || 'text/csv',
    );

    const batch = await this.prisma.guestImportBatch.create({
      data: {
        concertId,
        fileUrl,
        fileHash,
        status: 'PENDING',
      },
    });

    const { job } = await this.outboxService.put('csv', 'import', {
      concertId,
      batchId: batch.id,
      s3Key,
    });

    if (job) {
      const result = await job.waitUntilFinished(this.queueEvents);
      return result as { imported: number; duplicates: number; errors: number };
    }

    return {
      imported: 0,
      duplicates: 0,
      errors: 0,
      message: 'Queue system is temporarily unavailable. The CSV file has been saved and will be processed automatically as soon as the queue recovers.',
    } as any;
  }

  async findAllForConcert(concertId: string) {
    return this.prisma.guestList.findMany({
      where: { concertId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
