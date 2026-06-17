import { Controller, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFileDto } from './dto/uploaded-file.dto';
import { GuestListService } from './guest-list.service';

@Controller('admin/concerts')
export class GuestListController {
  constructor(private readonly guestListService: GuestListService) {}

  @Post(':id/guest-list/import')
  @UseInterceptors(FileInterceptor('file'))
  async importGuestList(
    @Param('id') concertId: string,
    @UploadedFile() file: UploadedFileDto,
  ) {
    return this.guestListService.importFromCsv(concertId, file);
  }
}
