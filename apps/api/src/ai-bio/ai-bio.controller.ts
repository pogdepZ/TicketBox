import {
  Controller,
  Post,
  Param,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiBioService } from './ai-bio.service';

@Controller('admin/concerts')
export class AiBioController {
  constructor(private readonly aiBioService: AiBioService) {}

  /**
   * POST /admin/concerts/:id/artist-bio/upload
   * Req: multipart/form-data (field: file)
   * Res: { success, data: { bio: string } }
   * Auth: Bearer JWT (Role: ORGANIZER, ADMIN)
   */
  @Post(':id/artist-bio/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadArtistBio(
    @Param('id') concertId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.aiBioService.generateBioFromPdf(concertId, file);
    return {
      success: true,
      data,
      message: 'Artist bio generated successfully from PDF',
    };
  }
}
