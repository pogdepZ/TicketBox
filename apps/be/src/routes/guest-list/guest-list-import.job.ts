import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GuestListService } from './guest-list.service';
import { UploadedFileDto } from './dto/uploaded-file.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GuestListImportJob {
  private readonly logger = new Logger(GuestListImportJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly guestListService: GuestListService,
  ) {}

  @Cron('*/30 * * * * *') // Runs every 30 seconds for testing/demo purposes
  async handleScheduledImport() {
    const dir = this.getGuestListsDir();
    
    // Ensure the directory exists
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`Created directory for scheduled guest lists at: ${dir}`);
      } catch (err) {
        this.logger.error(`Failed to create directory ${dir}:`, err);
        return;
      }
    }

    let files: string[];
    try {
      files = fs.readdirSync(dir);
    } catch (err) {
      this.logger.error(`Failed to read directory ${dir}:`, err);
      return;
    }

    // Filter for unprocessed .csv files
    const csvFiles = files.filter(file => file.endsWith('.csv'));
    if (csvFiles.length === 0) {
      return;
    }

    this.logger.log(`Found ${csvFiles.length} guest list files to process in ${dir}`);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    for (const file of csvFiles) {
      const concertId = path.basename(file, '.csv');
      const oldPath = path.join(dir, file);

      if (!uuidRegex.test(concertId)) {
        this.logger.warn(`Skipping file ${file}: Filename is not a valid concert UUID.`);
        try {
          fs.renameSync(oldPath, `${oldPath}.invalid_name`);
        } catch (renameErr) {
          this.logger.error(`Failed to rename invalid file ${file}:`, renameErr);
        }
        continue;
      }

      // Verify if the concert exists in the database
      try {
        const concert = await this.prisma.concert.findUnique({
          where: { id: concertId },
        });

        if (!concert) {
          this.logger.warn(`Skipping file ${file}: Concert ID ${concertId} not found in database.`);
          fs.renameSync(oldPath, `${oldPath}.not_found`);
          continue;
        }

        const buffer = fs.readFileSync(oldPath);
        const uploadedFile: UploadedFileDto = {
          fieldname: 'file',
          originalname: file,
          encoding: '7bit',
          mimetype: 'text/csv',
          size: buffer.length,
          buffer,
        };

        this.logger.log(`Processing scheduled guest list import for concert ${concertId} (file: ${file})`);
        const result = await this.guestListService.importFromCsv(concertId, uploadedFile);
        
        this.logger.log(`Successfully processed scheduled import for file ${file}: ${JSON.stringify(result)}`);
        fs.renameSync(oldPath, `${oldPath}.processed`);
      } catch (error) {
        if (error instanceof ConflictException) {
          this.logger.warn(`File ${file} has already been successfully imported (duplicate hash). Marking as processed.`);
          try {
            fs.renameSync(oldPath, `${oldPath}.duplicate`);
          } catch (renameErr) {
            this.logger.error(`Failed to rename duplicate file ${file}:`, renameErr);
          }
        } else {
          const errMsg = error instanceof Error ? error.message : String(error);
          const errStack = error instanceof Error ? error.stack : '';
          this.logger.error(`Error processing scheduled import for file ${file}: ${errMsg}`, errStack);
          try {
            fs.renameSync(oldPath, `${oldPath}.failed`);
          } catch (renameErr) {
            this.logger.error(`Failed to rename failed file ${file}:`, renameErr);
          }
        }
      }
    }
  }

  private getGuestListsDir(): string {
    const cwd = process.cwd();
    
    // Check Option 1: project root (cwd is project root)
    const path1 = path.join(cwd, 'data/guest-lists');
    if (fs.existsSync(path1)) return path1;

    // Check Option 2: apps/be (cwd is apps/be)
    const path2 = path.join(cwd, '../../data/guest-lists');
    if (fs.existsSync(path2)) return path2;

    // Check Option 3: relative to __dirname (dist or src folder)
    const path3 = path.resolve(__dirname, '../../../../data/guest-lists');
    if (fs.existsSync(path3)) return path3;

    // Default to resolving from project root
    const isBeFolder = cwd.endsWith('apps/be') || cwd.includes('apps/be/');
    return path.resolve(cwd, isBeFolder ? '../../data/guest-lists' : 'data/guest-lists');
  }
}
