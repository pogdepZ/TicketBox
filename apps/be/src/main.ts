import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create(AppModule, {
    logger: isProduction
    ? ['error', 'warn']
    : ['log', 'debug', 'error', 'warn', 'verbose'],
  });
  app.enableCors({
    origin: '*',
    credentials: true,
  });
  app.enableShutdownHooks();
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000, '0.0.0.0');
}

void bootstrap();
