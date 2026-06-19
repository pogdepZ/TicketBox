import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
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

    // If using custom endpoint (like local MinIO), return URL pointing to that endpoint.
    // Otherwise construct standard S3 URL.
    if (this.config.endpoint) {
      // Local or custom endpoint. Minio URL structure: endpoint/bucket/key
      const endpoint = this.config.endpoint.replace(/\/$/, '');
      return `${endpoint}/${this.bucket}/${key}`;
    }

    return `https://${this.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
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
}
