import { Controller, Get, Logger, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFileDto } from './dto/uploaded-file.dto';
import { GuestListService } from './guest-list.service';

@Controller('admin/concerts')
export class GuestListController {
  constructor(private readonly guestListService: GuestListService) {}
  private readonly logger = new Logger(GuestListController.name);

  @Post(':id/guest-list/import')
  @UseInterceptors(FileInterceptor('file'))
  async importGuestList(
    @Param('id') concertId: string,
    @UploadedFile() file: UploadedFileDto,
  ) {
    return this.guestListService.importFromCsv(concertId, file);
  }

  @Get(':id/guest-list')
  async getGuestList(@Param('id') concertId: string) {
    return this.guestListService.findAllForConcert(concertId);
  }
}
