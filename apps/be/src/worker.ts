import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');
  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: isProduction
      ? ['error', 'warn']
      : ['log', 'debug', 'error', 'warn', 'verbose'],
  });

  app.enableShutdownHooks();
  logger.log('Worker context initialized. Cron jobs and BullMQ processors are running.');
}

void bootstrap();
