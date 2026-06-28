import {
  BadRequestException,
  Controller,
  Delete,
  Headers,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AiBioService } from "./ai-bio.service";
import { UploadedFileDto } from "./dto/uploaded-file.dto";

@Controller("admin/concerts")
export class AiBioController {
  constructor(private readonly aiBioService: AiBioService) {}

  @Post(":id/artist-bio/upload")
  @UseInterceptors(FileInterceptor("file"))
  async uploadArtistBio(
    @Param("id") concertId: string,
    @UploadedFile() file: UploadedFileDto,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException("Idempotency-Key is required");
    }

    return this.aiBioService.generateBioFromPdf(
      concertId,
      file,
      idempotencyKey,
    );
  }

  @Delete(":id/artist-bio")
  async deleteArtistBio(@Param("id") concertId: string) {
    return this.aiBioService.deleteArtistBio(concertId);
  }
}
