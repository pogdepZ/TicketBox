import {
  Controller,
  Post,
  Param,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GuestListService } from './guest-list.service';

@Controller('admin/concerts')
export class GuestListController {
  constructor(private readonly guestListService: GuestListService) {}

  /**
   * POST /admin/concerts/:id/guest-list/import
   * Req: multipart/form-data (field: file)
   * Res: { success, data: { imported, duplicates, errors } }
   * Auth: Bearer JWT (Role: ORGANIZER, ADMIN)
   */
  @Post(':id/guest-list/import')
  @UseInterceptors(FileInterceptor('file'))
  async importGuestList(
    @Param('id') concertId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.guestListService.importFromCsv(concertId, file);
    return {
      success: true,
      data,
      message: `Imported ${data.imported} guests, ${data.duplicates} duplicates skipped`,
    };
  }
}
