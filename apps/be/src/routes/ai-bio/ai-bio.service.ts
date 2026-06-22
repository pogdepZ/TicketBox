import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { UploadedFileDto } from "./dto/uploaded-file.dto";
import { S3Service } from "../../common/s3/s3.service";
import { OutboxService } from "../../common/outbox/outbox.service";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class AiBioService {
  constructor(
    private prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly s3Service: S3Service,
  ) {}

  async generateBioFromPdf(
    concertId: string,
    file: UploadedFileDto,
  ): Promise<{ bio: string }> {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { id: true },
    });

    if (!concert) {
      throw new NotFoundException("Concert not found");
    }

    if (!file) {
      throw new BadRequestException("PDF file is required");
    }

    if (file.mimetype !== "application/pdf") {
      throw new BadRequestException("Only PDF files are supported");
    }

    if (!file.buffer?.length) {
      throw new BadRequestException("Uploaded PDF is empty");
    }

    if (file.buffer.length > MAX_PDF_SIZE_BYTES) {
      throw new BadRequestException("PDF file size must not exceed 10 MB");
    }

    const fileExtension = file.originalname?.split(".").pop() || "pdf";
    const s3Key = `concerts/${concertId}/artist-assets/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;

    // Upload file to S3
    const fileUrl = await this.s3Service.uploadFile(
      s3Key,
      file.buffer,
      file.mimetype || "application/pdf",
    );

    const asset = await this.prisma.artistAsset.create({
      data: {
        concertId,
        fileUrl,
        fileType: file.mimetype || "application/pdf",
        originalFileName: file.originalname || "unknown.pdf",
        status: "UPLOADED",
      },
    });

    await this.prisma.concert.update({
      where: { id: concertId },
      data: {
        artistBioStatus: "PROCESSING",
      },
    });

    // Queue the job to process in the background via Outbox
    await this.outboxService.put("ai", "generate-bio", {
      concertId,
      assetId: asset.id,
    });

    return {
      bio: "Artist bio request accepted. The background worker is generating the bio.",
    };
  }
}
