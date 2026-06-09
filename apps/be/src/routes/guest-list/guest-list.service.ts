import { Injectable } from '@nestjs/common';
import { UploadedFileDto } from './dto/uploaded-file.dto';

@Injectable()
export class GuestListService {
  async importFromCsv(
    concertId: string,
    file: UploadedFileDto,
  ): Promise<{ imported: number; duplicates: number; errors: number }> {
    console.log(
      `[GuestListService] Importing CSV for concert ${concertId}, file: ${file?.originalname}`,
    );

    return {
      imported: 10,
      duplicates: 2,
      errors: 0,
    };
  }
}
