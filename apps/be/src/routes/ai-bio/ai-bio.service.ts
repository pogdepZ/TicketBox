import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UploadedFileDto } from './dto/uploaded-file.dto';
import { S3Service } from '../../common/s3/s3.service';
import { OutboxService } from '../../common/outbox/outbox.service';

@Injectable()
export class AiBioService {
  constructor(
    private prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly s3Service: S3Service,
  ) {}

  async generateBioFromPdf(
    concertId: string,
    file: UploadedFileDto,
  ): Promise<{ bio: string }> {
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }

    const fileExtension = file.originalname?.split('.').pop() || 'pdf';
    const s3Key = `concerts/${concertId}/artist-assets/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;

    // Upload file to S3
    const fileUrl = await this.s3Service.uploadFile(
      s3Key,
      file.buffer,
      file.mimetype || 'application/pdf',
    );

    const asset = await this.prisma.artistAsset.create({
      data: {
        concertId,
        fileUrl,
        fileType: file.mimetype || 'application/pdf',
        originalFileName: file.originalname || 'unknown.pdf',
        status: 'PROCESSING',
      },
    });

    // Queue the job to process in the background via Outbox
    await this.outboxService.put('ai', 'generate-bio', {
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

