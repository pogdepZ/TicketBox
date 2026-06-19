import { ConflictException, Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UploadedFileDto } from './dto/uploaded-file.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import redisConfig from '../../config/redis.config';
import { ConfigType } from '@nestjs/config';
import { S3Service } from '../../common/s3/s3.service';
import { createHash } from 'crypto';

@Injectable()
export class GuestListService implements OnModuleDestroy {
  private queueEvents: QueueEvents;

  constructor(
    private prisma: PrismaService,
    @InjectQueue('csv') private readonly csvQueue: Queue,
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
    console.log(
      `[GuestListService] Importing CSV for concert ${concertId}, file: ${file?.originalname}`,
    );

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

    const job = await this.csvQueue.add('import', {
      concertId,
      batchId: batch.id,
    });

    const result = await job.waitUntilFinished(this.queueEvents);

    return result as { imported: number; duplicates: number; errors: number };
  }
}
