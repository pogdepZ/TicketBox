import { Inject, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Job } from "bullmq";
import { PDFParse } from "pdf-parse";
import geminiConfig from "../../config/gemini.config";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { S3Service } from "../../common/s3/s3.service";
import s3Config from "../../config/s3.config";

const MAX_PDF_PAGES = 20;
const MAX_INPUT_CHARS = 20000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const AI_QUEUE_CONCURRENCY = 5;
const AI_QUEUE_LOCK_DURATION_MS = 120000;
const CONCERT_LIST_CACHE_KEY = "cache:concert:list";
const CONCERT_DETAIL_CACHE_KEY_PREFIX = "cache:concert";

type GeneratedBioPayload = {
  shortBio: string;
  fullBio: string;
  tagline: string;
  genres: string[];
};

@Processor("ai", {
  concurrency: AI_QUEUE_CONCURRENCY,
  lockDuration: AI_QUEUE_LOCK_DURATION_MS,
})
export class AiBioProcessor extends WorkerHost {
  private readonly logger = new Logger(AiBioProcessor.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly s3Service: S3Service,
    @Inject(geminiConfig.KEY)
    private readonly config: ConfigType<typeof geminiConfig>,
    @Inject(s3Config.KEY)
    private readonly s3Configuration: ConfigType<typeof s3Config>,
  ) {
    super();
    this.genAI = new GoogleGenerativeAI(this.config.apiKey || "");
  }

  async process(
    job: Job<{ concertId: string; assetId: string }>,
  ): Promise<{ bio: string; structuredBio: GeneratedBioPayload }> {
    const { concertId, assetId } = job.data;
    this.logger.log(
      `Processing AI Bio job for concert ${concertId}, asset ${assetId}`,
    );

    try {
      const asset = await this.prisma.artistAsset.findUnique({
        where: { id: assetId },
        select: { fileUrl: true },
      });

      if (!asset) {
        throw new Error(`ArtistAsset ${assetId} not found`);
      }

      await this.prisma.artistAsset.update({
        where: { id: assetId },
        data: { status: "PROCESSING" },
      });
      await job.updateProgress(10);

      const s3Key = this.extractS3KeyFromUrl(asset.fileUrl);
      const pdfBuffer = await this.s3Service.downloadFile(s3Key);
      await job.updateProgress(20);

      const parser = new PDFParse({ data: pdfBuffer });
      const pdfData = await parser.getText({
        partial: Array.from({ length: MAX_PDF_PAGES }, (_, index) => index + 1),
      });
      const extractedText = await this.cleanText(pdfData.text);
      await parser.destroy();
      await job.updateProgress(40);

      await this.prisma.artistAsset.update({
        where: { id: assetId },
        data: { extractedText },
      });

      this.logger.log(
        `Extracted ${extractedText.length} chars from PDF (${pdfData.total} pages parsed)`,
      );

      await job.updateProgress(70);
      const structuredBio = await this.callGeminiWithRetry(extractedText);
      const generatedBio = structuredBio.fullBio;

      await this.prisma.artistAsset.update({
        where: { id: assetId },
        data: {
          status: "DONE",
          generatedBio,
        },
      });

      await this.prisma.concert.update({
        where: { id: concertId },
        data: {
          artistBio: generatedBio,
          artistBioStatus: "DONE",
        },
      });
      await this.invalidateConcertCache(concertId);
      await job.updateProgress(100);

      this.logger.log(
        `AI Bio generation completed for concert ${concertId}, asset ${assetId}`,
      );
      return { bio: generatedBio, structuredBio };
    } catch (error) {
      this.logger.error(`Failed to process AI Bio for asset ${assetId}`, error);

      try {
        await this.prisma.artistAsset.delete({
          where: { id: assetId },
        });

        await this.prisma.concert.update({
          where: { id: concertId },
          data: {
            artistBioStatus: "FAILED",
          },
        });
        await this.invalidateConcertCache(concertId);
      } catch (dbError) {
        this.logger.error(
          `Failed to update FAILED status for asset ${assetId}`,
          dbError,
        );
      }

      throw error;
    }
  }

  private extractS3KeyFromUrl(fileUrl: string): string {
    const url = new URL(fileUrl);
    const path = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    const bucketPrefix = `${this.s3Configuration.bucket}/`;

    return path.startsWith(bucketPrefix)
      ? path.slice(bucketPrefix.length)
      : path;
  }

  private async invalidateConcertCache(concertId: string): Promise<void> {
    try {
      await Promise.all([
        this.redisService.delPattern(`${CONCERT_LIST_CACHE_KEY}*`),
        this.redisService.del(
          `${CONCERT_DETAIL_CACHE_KEY_PREFIX}:${concertId}`,
        ),
      ]);
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate concert cache for ${concertId}`,
        error,
      );
    }
  }

  private async cleanText(text: string): Promise<string> {
    const normalizedText = text
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return normalizedText.slice(0, MAX_INPUT_CHARS);
  }

  private async callGeminiWithRetry(
    extractedText: string,
  ): Promise<GeneratedBioPayload> {
    for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: this.config.model,
        });
        const response = await this.withTimeout(
          model.generateContent({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text:
                      'Ban la music journalist. CHI tra ve JSON THUAN, khong markdown, khong giai thich, khong ```json. Schema: {"shortBio":"","fullBio":"","tagline":"","genres":[]}. Viet tieng Viet tu nhien. shortBio <= 80 tu, fullBio <= 220 tu, tagline <= 20 tu, genres la mang the loai nhac. Neu thieu du lieu thi dua tren thong tin co san, khong du doan vo can cu.\n\nThong tin press kit:\n' +
                      extractedText,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: this.config.maxTokens,
              responseMimeType: "application/json",
            },
          }),
          this.config.timeoutMs,
        );

        const rawText = response.response.text().trim();
        this.logger.log(`Gemini raw AI bio response: ${rawText}`);

        const cleanedText = this.cleanGeminiJsonResponse(rawText);
        const parsed = this.parseStructuredBio(cleanedText);
        this.logger.log(
          `Gemini parsed AI bio response: ${JSON.stringify(parsed)}`,
        );

        return parsed;
      } catch (error) {
        const isLastAttempt = attempt === RETRY_ATTEMPTS - 1;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        this.logger.warn(
          `Gemini call attempt ${attempt + 1} failed: ${errorMessage}`,
        );

        if (isLastAttempt) {
          throw new Error(
            `Gemini failed after ${RETRY_ATTEMPTS} attempts: ${errorMessage}`,
          );
        }

        if (!this.isRetryableError(error)) {
          throw error;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAYS_MS[attempt]),
        );
      }
    }

    throw new Error("Unexpected retry loop exit");
  }

  private parseStructuredBio(rawText: string): GeneratedBioPayload {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error("Gemini returned invalid JSON response");
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Gemini returned unexpected payload");
    }

    const bio = parsed as Partial<GeneratedBioPayload>;

    if (
      !bio.shortBio ||
      !bio.fullBio ||
      !bio.tagline ||
      !Array.isArray(bio.genres)
    ) {
      throw new Error("Gemini returned incomplete structured bio");
    }

    return {
      shortBio: bio.shortBio.trim(),
      fullBio: bio.fullBio.trim(),
      tagline: bio.tagline.trim(),
      genres: bio.genres.map((genre) => String(genre).trim()).filter(Boolean),
    };
  }

  private cleanGeminiJsonResponse(rawText: string): string {
    return rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
  }

  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    return (
      message.includes("429") ||
      message.includes("rate limit") ||
      message.includes("deadline") ||
      message.includes("timeout") ||
      message.includes("unavailable") ||
      message.includes("invalid json") ||
      message.includes("unexpected payload") ||
      message.includes("incomplete structured bio")
    );
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`Gemini request timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }
}
