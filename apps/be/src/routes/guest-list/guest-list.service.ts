import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UploadedFileDto } from './dto/uploaded-file.dto';

@Injectable()
export class GuestListService {
  constructor(private prisma: PrismaService) {}

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
        status: 'PROCESSING',
      },
    });

    // Mock CSV parsing
    const mockRows = [
      { fullName: 'Nguyễn Văn A', email: 'a@example.com', guestCode: 'GUEST-001' },
      { fullName: 'Trần Thị B', email: 'b@example.com', guestCode: 'GUEST-002' },
    ];

    let imported = 0;
    let errors = 0;

    for (let i = 0; i < mockRows.length; i++) {
      const row = mockRows[i];
      try {
        await this.prisma.guestImportRow.create({
          data: {
            batchId: batch.id,
            rowNumber: i + 1,
            fullName: row.fullName,
            email: row.email,
            guestCode: row.guestCode,
            validationStatus: 'VALID',
          },
        });

        await this.prisma.guestList.create({
          data: {
            concertId,
            fullName: row.fullName,
            email: row.email,
            guestCode: row.guestCode,
            status: 'ACTIVE',
            csvBatchId: batch.id,
          },
        });
        imported++;
      } catch (e) {
        errors++;
      }
    }

    await this.prisma.guestImportBatch.update({
      where: { id: batch.id },
      data: {
        status: 'COMPLETED',
        totalRows: mockRows.length,
        validRows: imported,
        invalidRows: errors,
        completedAt: new Date(),
      },
    });

    return {
      imported,
      duplicates: 0,
      errors,
    };
  }
}
