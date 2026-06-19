import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UploadedFileDto } from './dto/uploaded-file.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AiBioService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('ai') private readonly aiQueue: Queue,
  ) {}

  async generateBioFromPdf(
    concertId: string,
    file: UploadedFileDto,
  ): Promise<{ bio: string }> {

    const asset = await this.prisma.artistAsset.create({
      data: {
        concertId,
        fileUrl: file?.originalname || 'local_path',
        fileType: 'application/pdf',
        originalFileName: file?.originalname || 'unknown.pdf',
        status: 'PROCESSING',
      },
    });

    // Queue the job to process in the background
    await this.aiQueue.add('generate-bio', {
      concertId,
      assetId: asset.id,
    });

    return {
      bio:
        `[Mock AI Bio] Nghệ sĩ biểu diễn tại concert ${concertId}. ` +
        'Đây là tiểu sử được tạo tự động từ file PDF press kit. ' +
        'Nội dung sẽ được sinh bởi AI model trong các tuần tiếp theo.',
    };
  }
}
