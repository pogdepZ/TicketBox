import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Automatically remove properties that do not have any decorators
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to be objects typed according to their DTO classes,
      transformOptions: {
        enableImplicitConversion: true, // Allow primitive types to be automatically converted based on the DTO type definitions
      },
      exceptionFactory: (errors: any[]) => {
        const messages = errors.map(
          (error) =>
            `${error.property} has wrong value ${error.value}, ${Object.values(
              error.constraints,
            ).join(', ')}`,
        );
        return new Error(messages.join('; '));
      },
    }),
  );
  app.enableCors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  });
  app.enableShutdownHooks();
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
}

void bootstrap();
