import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((data) => ({
        statusCode: context.switchToHttp().getResponse().statusCode,
        message: 'Request successful',
        data: data, // Mọi thứ Controller trả về sẽ nằm ở đây,
        metadata: {
          "statusCode": context.switchToHttp().getResponse().statusCode,
          "method": context.switchToHttp().getRequest().method,
          "path": context.switchToHttp().getRequest().url,
          "timestamp": new Date().toISOString(),
        },
      })),
    );
  }
}