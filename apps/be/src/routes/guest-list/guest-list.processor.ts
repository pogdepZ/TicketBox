import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Logger } from '@nestjs/common';

@Processor('csv')
export class GuestListProcessor extends WorkerHost {
  private readonly logger = new Logger(GuestListProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(
    job: Job<{ concertId: string; batchId: string }>,
  ): Promise<{ imported: number; duplicates: number; errors: number }> {
    const { concertId, batchId } = job.data;
    this.logger.log(`Processing CSV import for batch ${batchId}, concert ${concertId}`);

    // Update batch to PROCESSING status
    await this.prisma.guestImportBatch.update({
      where: { id: batchId },
      data: { status: 'PROCESSING' },
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
            batchId,
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
            csvBatchId: batchId,
          },
        });
        imported++;
      } catch (e) {
        errors++;
      }
    }

    await this.prisma.guestImportBatch.update({
      where: { id: batchId },
      data: {
        status: 'COMPLETED',
        totalRows: mockRows.length,
        validRows: imported,
        invalidRows: errors,
        completedAt: new Date(),
      },
    });

    this.logger.log(`CSV import completed for batch ${batchId}. Imported: ${imported}, Errors: ${errors}`);

    return {
      imported,
      duplicates: 0,
      errors,
    };
  }
}
