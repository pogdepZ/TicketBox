import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import s3Config from '../../config/s3.config';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(
    @Inject(s3Config.KEY)
    private readonly config: ConfigType<typeof s3Config>,
  ) {
    const s3Options: any = {
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    };

    if (this.config.endpoint) {
      s3Options.endpoint = this.config.endpoint;
      s3Options.forcePathStyle = this.config.forcePathStyle;
    }

    this.s3Client = new S3Client(s3Options);
    this.bucket = this.config.bucket;
  }

  private buildPublicUrl(key: string): string {
    if (this.config.publicUrl) {
      return `${this.config.publicUrl}/${key}`;
    }

    if (this.config.endpoint) {
      const endpoint = this.config.endpoint.replace(/\/$/, '');
      return `${endpoint}/${this.bucket}/${key}`;
    }

    return `https://${this.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  /**
   * Uploads a file to S3 bucket.
   * Returns the file URL.
   */
  async uploadFile(
    key: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    this.logger.log(`Uploading file to S3: ${key} (${mimeType})`);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await this.s3Client.send(command);

    return this.buildPublicUrl(key);
  }

  /**
   * Downloads a file from S3 bucket.
   */
  async downloadFile(key: string): Promise<Buffer> {
    this.logger.log(`Downloading file from S3: ${key}`);

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    if (!response.Body) {
      return Buffer.alloc(0);
    }

    return this.bodyToBuffer(response.Body);
  }

  /**
   * Deletes a file from S3 bucket.
   */
  async deleteFile(key: string): Promise<void> {
    this.logger.log(`Deleting file from S3: ${key}`);

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  private async bodyToBuffer(body: unknown): Promise<Buffer> {
    if (body instanceof Readable) {
      const chunks: Buffer[] = [];

      for await (const chunk of body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    }

    if (body instanceof Uint8Array) {
      return Buffer.from(body);
    }

    const maybeWebBody = body as {
      transformToByteArray?: () => Promise<Uint8Array>;
      transformToString?: () => Promise<string>;
    };

    if (typeof maybeWebBody.transformToByteArray === 'function') {
      return Buffer.from(await maybeWebBody.transformToByteArray());
    }

    if (typeof maybeWebBody.transformToString === 'function') {
      return Buffer.from(await maybeWebBody.transformToString());
    }

    throw new Error('Unsupported S3 response body type');
  }
}
