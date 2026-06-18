import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UploadedFileDto } from './dto/uploaded-file.dto';

@Injectable()
export class AiBioService {
  constructor(private prisma: PrismaService) {}

  async generateBioFromPdf(
    concertId: string,
    file: UploadedFileDto,
  ): Promise<{ bio: string }> {
    console.log(
      `[AiBioService] Processing PDF for concert ${concertId}, file: ${file?.originalname}`,
    );

    const asset = await this.prisma.artistAsset.create({
      data: {
        concertId,
        fileUrl: file?.originalname || 'local_path',
        fileType: 'application/pdf',
        originalFileName: file?.originalname || 'unknown.pdf',
        status: 'PROCESSING',
      },
    });

    // Mock background worker updating status
    setTimeout(async () => {
      try {
        await this.prisma.artistAsset.update({
          where: { id: asset.id },
          data: {
            status: 'DONE',
            generatedBio: `[Mock AI Bio] Nghệ sĩ biểu diễn tại concert ${concertId}. ` +
            'Đây là tiểu sử được tạo tự động từ file PDF press kit. ' +
            'Nội dung sẽ được sinh bởi AI model trong các tuần tiếp theo.',
          },
        });
      } catch (e) {
        console.error('Failed to update asset bio', e);
      }
    }, 2000);

    return {
      bio:
        `[Mock AI Bio] Nghệ sĩ biểu diễn tại concert ${concertId}. ` +
        'Đây là tiểu sử được tạo tự động từ file PDF press kit. ' +
        'Nội dung sẽ được sinh bởi AI model trong các tuần tiếp theo.',
    };
  }
}
