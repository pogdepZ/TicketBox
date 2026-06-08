import { Injectable } from '@nestjs/common';

@Injectable()
export class AiBioService {
  /**
   * Process uploaded PDF and generate artist bio using AI
   * @param concertId Concert ID to associate the bio with
   * @param file Uploaded PDF file buffer
   * @returns Generated artist bio text
   */
  async generateBioFromPdf(
    concertId: string,
    file: Express.Multer.File,
  ): Promise<{ bio: string }> {
    // TODO: Week 2+ — Implement PDF text extraction + AI model call
    console.log(
      `[AiBioService] Processing PDF for concert ${concertId}, file: ${file?.originalname}`,
    );

    return {
      bio: `[Mock AI Bio] Nghệ sĩ biểu diễn tại concert ${concertId}. `
        + 'Đây là tiểu sử được tạo tự động từ file PDF press kit. '
        + 'Nội dung sẽ được sinh bởi AI model trong các tuần tiếp theo.',
    };
  }
}
