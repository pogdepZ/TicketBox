import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { S3Service } from '../../common/s3/s3.service';
import { PrismaService } from '../../common/prisma/prisma.service';

type CsvImportJobData = {
  concertId: string;
  batchId: string;
  s3Key?: string;
};

type CsvImportResult = {
  imported: number;
  duplicates: number;
  errors: number;
};

type ParsedGuestRow = {
  rowNumber: number;
  columns: Record<string, string>;
};

type StagedGuestRow = {
  id: string;
  batchId: string;
  rowNumber: number;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  guestType: string | null;
  guestCode: string | null;
  validationStatus: string;
};

type ValidGuestRow = {
  id: string;
  batchId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  guestType: string | null;
  guestCode: string;
};

type ValidationResult =
  | { valid: true; row: ValidGuestRow }
  | { valid: false; errorMessage: string };

type BatchStats = CsvImportResult & {
  totalRows: number;
};

const REQUIRED_HEADERS = ['full_name', 'guest_code'];
const HEADER_ALIASES = {
  fullName: ['full_name', 'fullname', 'full name'],
  email: ['email'],
  phone: ['phone'],
  guestType: ['guest_type', 'guesttype', 'guest type'],
  guestCode: ['guest_code', 'guestcode', 'guest code'],
};

@Processor('csv')
export class GuestListProcessor extends WorkerHost {
  private readonly logger = new Logger(GuestListProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {
    super();
  }

  async process(job: Job<CsvImportJobData>): Promise<CsvImportResult> {
    const { concertId, batchId, s3Key } = job.data;
    this.logger.log(`Processing CSV import for batch ${batchId}, concert ${concertId}`);

    await this.prisma.guestImportBatch.update({
      where: { id: batchId },
      data: { status: 'PROCESSING' },
    });

    if (!s3Key) {
      return this.failBatch(batchId, 'CSV import job is missing s3Key');
    }

    let parsedRows: ParsedGuestRow[];
    try {
      parsedRows = await this.downloadAndParseCsv(s3Key);
    } catch (error) {
      return this.failBatch(batchId, this.getErrorMessage(error));
    }

    const stagedRows = await this.stageCsvRows(batchId, parsedRows);

    await this.processStagedRows(concertId, stagedRows);

    const stats = await this.summarizeBatch(batchId);
    await this.updateBatchStats(batchId, stats);

    this.logger.log(
      `CSV import completed for batch ${batchId}. Imported: ${stats.imported}, Duplicates: ${stats.duplicates}, Errors: ${stats.errors}`,
    );

    return {
      imported: stats.imported,
      duplicates: stats.duplicates,
      errors: stats.errors,
    };
  }

  private async downloadAndParseCsv(s3Key: string): Promise<ParsedGuestRow[]> {
    const fileBuffer = await this.s3Service.downloadFile(s3Key);
    const csvContent = fileBuffer.toString('utf8');

    return this.parseCsvContent(csvContent);
  }

  private async stageCsvRows(
    batchId: string,
    rows: ParsedGuestRow[],
  ): Promise<StagedGuestRow[]> {
    const existingRows = await this.findStagedRows(batchId);
    if (existingRows.length > 0) {
      return existingRows;
    }

    await this.prisma.guestImportRow.createMany({
      data: rows.map((row) => ({
        batchId,
        rowNumber: row.rowNumber,
        fullName: this.optionalColumn(row, HEADER_ALIASES.fullName),
        email: this.normalizeEmail(this.optionalColumn(row, HEADER_ALIASES.email)),
        phone: this.optionalColumn(row, HEADER_ALIASES.phone),
        guestType: this.optionalColumn(row, HEADER_ALIASES.guestType),
        guestCode: this.optionalColumn(row, HEADER_ALIASES.guestCode),
        validationStatus: 'PENDING',
      })),
    });

    return this.findStagedRows(batchId);
  }

  private findStagedRows(batchId: string): Promise<StagedGuestRow[]> {
    return this.prisma.guestImportRow.findMany({
      where: { batchId },
      select: {
        id: true,
        batchId: true,
        rowNumber: true,
        fullName: true,
        email: true,
        phone: true,
        guestType: true,
        guestCode: true,
        validationStatus: true,
      },
      orderBy: { rowNumber: 'asc' },
    });
  }

  private async processStagedRows(
    concertId: string,
    stagedRows: StagedGuestRow[],
  ): Promise<void> {
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    const seenGuestCodes = new Set<string>();

    for (const row of stagedRows) {
      if (row.validationStatus === 'VALID') {
        this.addSeenGuestIdentity(row, seenEmails, seenPhones);
        if (row.guestCode) {
          seenGuestCodes.add(row.guestCode.trim().toUpperCase());
        }
      }
    }

    const chunkSize = 200;
    for (let i = 0; i < stagedRows.length; i += chunkSize) {
      const chunk = stagedRows.slice(i, i + chunkSize);

      const pendingRows = chunk.filter((r) => r.validationStatus === 'PENDING');
      if (pendingRows.length === 0) {
        continue;
      }

      const validRowsToProcess: { stagedRow: StagedGuestRow; validatedRow: ValidGuestRow }[] = [];
      const invalidRowUpdates: { id: string; errorMessage: string }[] = [];

      for (const row of pendingRows) {
        const validation = this.validateStagedRow(row);
        if (!validation.valid) {
          invalidRowUpdates.push({ id: row.id, errorMessage: validation.errorMessage });
        } else {
          validRowsToProcess.push({ stagedRow: row, validatedRow: validation.row });
        }
      }

      if (validRowsToProcess.length === 0 && invalidRowUpdates.length === 0) {
        continue;
      }

      const emailsToCheck = validRowsToProcess
        .map((r) => r.validatedRow.email)
        .filter(Boolean) as string[];
      const phonesToCheck = validRowsToProcess
        .map((r) => r.validatedRow.phone)
        .filter(Boolean) as string[];
      const guestCodesToCheck = validRowsToProcess
        .map((r) => r.validatedRow.guestCode)
        .filter(Boolean) as string[];

      const existingGuests = await this.prisma.guestList.findMany({
        where: {
          concertId,
          OR: [
            ...(guestCodesToCheck.length > 0 ? [{ guestCode: { in: guestCodesToCheck } }] : []),
            ...(emailsToCheck.length > 0 ? [{ email: { in: emailsToCheck } }] : []),
            ...(phonesToCheck.length > 0 ? [{ phone: { in: phonesToCheck } }] : []),
          ],
        },
        select: {
          guestCode: true,
          email: true,
          phone: true,
        },
      });

      const dbGuestCodes = new Set(
        existingGuests.map((g) => g.guestCode.trim().toUpperCase()),
      );
      const dbEmails = new Set(
        existingGuests
          .map((g) => g.email?.trim().toLowerCase())
          .filter(Boolean) as string[],
      );
      const dbPhones = new Set(
        existingGuests.map((g) => g.phone?.trim()).filter(Boolean) as string[],
      );

      const validGuestsToUpsert: ValidGuestRow[] = [];
      const duplicateRowUpdates: { id: string; reason: string }[] = [];

      for (const { stagedRow, validatedRow } of validRowsToProcess) {
        const reasons: string[] = [];

        if (validatedRow.email && seenEmails.has(validatedRow.email)) {
          reasons.push('email is duplicated in CSV file');
        }
        if (validatedRow.phone && seenPhones.has(validatedRow.phone)) {
          reasons.push('phone is duplicated in CSV file');
        }
        if (seenGuestCodes.has(validatedRow.guestCode.toUpperCase())) {
          reasons.push('guest_code is duplicated in CSV file');
        }

        if (reasons.length === 0) {
          if (dbGuestCodes.has(validatedRow.guestCode.toUpperCase())) {
            reasons.push('guest_code already exists for this concert');
          }
          if (validatedRow.email && dbEmails.has(validatedRow.email)) {
            reasons.push('email already exists for this concert');
          }
          if (validatedRow.phone && dbPhones.has(validatedRow.phone)) {
            reasons.push('phone already exists for this concert');
          }
        }

        if (reasons.length > 0) {
          duplicateRowUpdates.push({ id: stagedRow.id, reason: reasons.join('; ') });
        } else {
          validGuestsToUpsert.push(validatedRow);
          this.addSeenGuestIdentity(validatedRow, seenEmails, seenPhones);
          seenGuestCodes.add(validatedRow.guestCode.toUpperCase());
        }
      }

      await this.prisma.$transaction(async (tx) => {
        const upserts = validGuestsToUpsert.map((row) =>
          tx.guestList.upsert({
            where: {
              concertId_guestCode: {
                concertId,
                guestCode: row.guestCode,
              },
            },
            update: {
              fullName: row.fullName,
              email: row.email,
              phone: row.phone,
              guestType: row.guestType,
              status: 'ACTIVE',
              csvBatchId: row.batchId,
            },
            create: {
              concertId,
              fullName: row.fullName,
              email: row.email,
              phone: row.phone,
              guestType: row.guestType,
              guestCode: row.guestCode,
              status: 'ACTIVE',
              csvBatchId: row.batchId,
            },
          }),
        );

        const validUpdates = validGuestsToUpsert.map((row) =>
          tx.guestImportRow.update({
            where: { id: row.id },
            data: {
              validationStatus: 'VALID',
              errorMessage: null,
            },
          }),
        );

        const invalidUpdates = invalidRowUpdates.map((item) =>
          tx.guestImportRow.update({
            where: { id: item.id },
            data: {
              validationStatus: 'INVALID',
              errorMessage: item.errorMessage,
            },
          }),
        );

        const duplicateUpdates = duplicateRowUpdates.map((item) =>
          tx.guestImportRow.update({
            where: { id: item.id },
            data: {
              validationStatus: 'DUPLICATE',
              errorMessage: item.reason,
            },
          }),
        );

        await Promise.all([
          ...upserts,
          ...validUpdates,
          ...invalidUpdates,
          ...duplicateUpdates,
        ]);
      });
    }
  }

  private parseCsvContent(content: string): ParsedGuestRow[] {
    const records = this.parseCsvRecords(content).filter((record) =>
      record.some((field) => field.trim().length > 0),
    );

    if (records.length === 0) {
      throw new Error('CSV file is empty');
    }

    const headers = records[0].map((header) => this.normalizeHeader(header));
    const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));

    if (missingHeaders.length > 0) {
      throw new Error(`CSV file is missing required header(s): ${missingHeaders.join(', ')}`);
    }

    if (records.length === 1) {
      throw new Error('CSV file has no data rows');
    }

    return records.slice(1).map((record, index) => {
      const columns: Record<string, string> = {};

      headers.forEach((header, columnIndex) => {
        if (header) {
          columns[header] = (record[columnIndex] ?? '').trim();
        }
      });

      return {
        rowNumber: index + 2,
        columns,
      };
    });
  }

  private parseCsvRecords(content: string): string[][] {
    const records: string[][] = [];
    let record: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          field += '"';
          i++;
          continue;
        }

        if (char === '"') {
          inQuotes = false;
          continue;
        }

        field += char;
        continue;
      }

      if (char === '"' && field.trim().length === 0) {
        inQuotes = true;
        continue;
      }

      if (char === ',') {
        record.push(field);
        field = '';
        continue;
      }

      if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }

        record.push(field);
        records.push(record);
        record = [];
        field = '';
        continue;
      }

      field += char;
    }

    if (inQuotes) {
      throw new Error('CSV file has an unterminated quoted field');
    }

    record.push(field);
    records.push(record);

    return records;
  }

  private validateStagedRow(row: StagedGuestRow): ValidationResult {
    const fullName = row.fullName?.trim() ?? '';
    const email = this.normalizeEmail(row.email);
    const phone = row.phone?.trim() || null;
    const guestType = row.guestType?.trim() || null;
    const guestCode = row.guestCode?.trim() ?? '';
    const errors: string[] = [];

    if (!fullName) {
      errors.push('full_name is required');
    }

    if (!email && !phone) {
      errors.push('email or phone is required');
    }

    if (!guestCode) {
      errors.push('guest_code is required');
    }

    if (email && !this.isEmail(email)) {
      errors.push('email is invalid');
    }

    this.validateMaxLength(errors, 'full_name', fullName, 100);
    this.validateMaxLength(errors, 'email', email, 255);
    this.validateMaxLength(errors, 'phone', phone, 20);
    this.validateMaxLength(errors, 'guest_type', guestType, 50);
    this.validateMaxLength(errors, 'guest_code', guestCode, 50);

    if (errors.length > 0) {
      return { valid: false, errorMessage: errors.join('; ') };
    }

    return {
      valid: true,
      row: {
        id: row.id,
        batchId: row.batchId,
        fullName,
        email,
        phone,
        guestType,
        guestCode,
      },
    };
  }

  private async markRowInvalid(rowId: string, errorMessage: string): Promise<void> {
    await this.prisma.guestImportRow.update({
      where: { id: rowId },
      data: {
        validationStatus: 'INVALID',
        errorMessage,
      },
    });
  }

  private async markRowDuplicate(rowId: string, errorMessage: string): Promise<void> {
    await this.prisma.guestImportRow.update({
      where: { id: rowId },
      data: {
        validationStatus: 'DUPLICATE',
        errorMessage,
      },
    });
  }

  private async summarizeBatch(batchId: string): Promise<BatchStats> {
    const [totalRows, validRows, invalidRows, duplicateRows] =
      await this.prisma.$transaction([
        this.prisma.guestImportRow.count({ where: { batchId } }),
        this.prisma.guestImportRow.count({
          where: { batchId, validationStatus: 'VALID' },
        }),
        this.prisma.guestImportRow.count({
          where: { batchId, validationStatus: 'INVALID' },
        }),
        this.prisma.guestImportRow.count({
          where: { batchId, validationStatus: 'DUPLICATE' },
        }),
      ]);

    return {
      totalRows,
      imported: validRows,
      duplicates: duplicateRows,
      errors: invalidRows,
    };
  }

  private async updateBatchStats(batchId: string, stats: BatchStats): Promise<void> {
    await this.prisma.guestImportBatch.update({
      where: { id: batchId },
      data: {
        status: this.resolveBatchStatus(stats),
        totalRows: stats.totalRows,
        validRows: stats.imported,
        invalidRows: stats.errors,
        duplicateRows: stats.duplicates,
        completedAt: new Date(),
      },
    });
  }

  private async failBatch(batchId: string, errorMessage: string): Promise<CsvImportResult> {
    this.logger.warn(`CSV import failed for batch ${batchId}: ${errorMessage}`);

    await this.prisma.guestImportBatch.update({
      where: { id: batchId },
      data: {
        status: 'FAILED',
        totalRows: 0,
        validRows: 0,
        invalidRows: 1,
        duplicateRows: 0,
        completedAt: new Date(),
      },
    });

    return {
      imported: 0,
      duplicates: 0,
      errors: 1,
    };
  }

  private resolveBatchStatus(stats: BatchStats): 'COMPLETED' | 'PARTIAL' | 'FAILED' {
    if (stats.totalRows === 0 || (stats.imported === 0 && stats.duplicates === 0)) {
      return 'FAILED';
    }

    if (stats.errors > 0 || stats.duplicates > 0) {
      return 'PARTIAL';
    }

    return 'COMPLETED';
  }

  private addSeenGuestIdentity(
    row: Pick<StagedGuestRow, 'email' | 'phone'>,
    seenEmails: Set<string>,
    seenPhones: Set<string>,
  ): void {
    const email = this.normalizeEmail(row.email);
    if (email) {
      seenEmails.add(email);
    }

    const phone = row.phone?.trim();
    if (phone) {
      seenPhones.add(phone);
    }
  }

  private getColumn(row: ParsedGuestRow, aliases: string[]): string {
    return this.optionalColumn(row, aliases) ?? '';
  }

  private optionalColumn(row: ParsedGuestRow, aliases: string[]): string | null {
    for (const alias of aliases) {
      const value = row.columns[this.normalizeHeader(alias)]?.trim();
      if (value) {
        return value;
      }
    }

    return null;
  }

  private normalizeHeader(header: string): string {
    return header.replace(/^\uFEFF/, '').trim().toLowerCase();
  }

  private normalizeEmail(email: string | null): string | null {
    return email?.trim().toLowerCase() || null;
  }

  private validateMaxLength(
    errors: string[],
    field: string,
    value: string | null,
    maxLength: number,
  ): void {
    if (value && value.length > maxLength) {
      errors.push(`${field} must be at most ${maxLength} characters`);
    }
  }

  private isEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2002'
    );
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
