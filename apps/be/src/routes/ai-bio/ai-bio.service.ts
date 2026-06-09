import { Injectable } from '@nestjs/common';
import { UploadedFileDto } from './dto/uploaded-file.dto';

@Injectable()
export class AiBioService {
  async generateBioFromPdf(
    concertId: string,
    file: UploadedFileDto,
  ): Promise<{ bio: string }> {
    console.log(
      `[AiBioService] Processing PDF for concert ${concertId}, file: ${file?.originalname}`,
    );

    return {
      bio:
        `[Mock AI Bio] Nghệ sĩ biểu diễn tại concert ${concertId}. ` +
        'Đây là tiểu sử được tạo tự động từ file PDF press kit. ' +
        'Nội dung sẽ được sinh bởi AI model trong các tuần tiếp theo.',
    };
  }
}
