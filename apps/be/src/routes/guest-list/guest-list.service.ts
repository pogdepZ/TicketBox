import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UploadedFileDto } from './dto/uploaded-file.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import redisConfig from '../../config/redis.config';
import { ConfigType } from '@nestjs/config';

@Injectable()
export class GuestListService implements OnModuleDestroy {
  private queueEvents: QueueEvents;

  constructor(
    private prisma: PrismaService,
    @InjectQueue('csv') private readonly csvQueue: Queue,
    @Inject(redisConfig.KEY)
    private readonly redis: ConfigType<typeof redisConfig>,
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

    const batch = await this.prisma.guestImportBatch.create({
      data: {
        concertId,
        fileUrl: file?.originalname || 'local_path.csv',
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
