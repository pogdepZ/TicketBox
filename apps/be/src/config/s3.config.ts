import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => ({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'minioadmin',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'minioadmin',
  region: process.env.AWS_S3_REGION ?? 'us-east-1',
  bucket: process.env.AWS_S3_BUCKET ?? 'ticketbox-media',
  endpoint: process.env.AWS_S3_ENDPOINT ?? 'http://localhost:9000',
  publicUrl: process.env.AWS_S3_PUBLIC_URL?.replace(/\/$/, ''),
  forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
}));
