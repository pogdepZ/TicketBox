import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/response.interceptor';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const mode = process.env.APP_MODE ?? 'all'; // api | worker | all
  const isProduction = process.env.NODE_ENV === 'production';

  logger.log(`Starting application in [${mode.toUpperCase()}] mode`);

  if (mode === 'worker') {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: isProduction
        ? ['error', 'warn']
        : ['log', 'debug', 'error', 'warn', 'verbose'],
    });
    app.enableShutdownHooks();
    logger.log('Worker context initialized. Listening to Redis queues...');
  } else {
    const app = await NestFactory.create(AppModule, {
      logger: isProduction
        ? ['error', 'warn']
        : ['log', 'debug', 'error', 'warn', 'verbose'],
    });
    app.enableCors({
      origin: true,
      credentials: true,
    });
    app.enableShutdownHooks();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    const port = process.env.PORT ? Number(process.env.PORT) : 3001;
    await app.listen(port, '0.0.0.0');
    logger.log(`API Server is running on port ${port}`);
  }
}

void bootstrap();
