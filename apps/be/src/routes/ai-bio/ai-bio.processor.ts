import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Logger } from '@nestjs/common';

@Processor('ai')
export class AiBioProcessor extends WorkerHost {
  private readonly logger = new Logger(AiBioProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ concertId: string; assetId: string }>): Promise<any> {
    const { concertId, assetId } = job.data;
    this.logger.log(`Processing AI Bio job for concert ${concertId}, asset ${assetId}`);

    // Wait 2 seconds to simulate AI generation (matching UAT test timeout)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const generatedBio = `[Mock AI Bio] Nghệ sĩ biểu diễn tại concert ${concertId}. ` +
        'Đây là tiểu sử được tạo tự động từ file PDF press kit. ' +
        'Nội dung sẽ được sinh bởi AI model trong các tuần tiếp theo.';

      await this.prisma.artistAsset.update({
        where: { id: assetId },
        data: {
          status: 'DONE',
          generatedBio,
        },
      });

      this.logger.log(`AI Bio generation completed for asset ${assetId}`);
      return { bio: generatedBio };
    } catch (error) {
      this.logger.error(`Failed to process AI Bio for asset ${assetId}`, error);
      try {
        await this.prisma.artistAsset.update({
          where: { id: assetId },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        });
      } catch (dbError) {
        this.logger.error(`Failed to update FAILED status for asset ${assetId}`, dbError);
      }
      throw error;
    }
  }
}
