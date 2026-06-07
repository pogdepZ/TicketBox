import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { z, ZodError, ZodTypeAny } from 'zod';

type ZodDto = {
  schema?: ZodTypeAny;
};

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    const schema = this.getSchema(metadata.metatype);

    if (!schema) {
      return value;
    }

    try {
      return schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
          error: 'Validation failed',
        });
      }

      throw error;
    }
  }

  private getSchema(metatype?: Function): ZodTypeAny | undefined {
    if (!metatype || this.isNativeType(metatype)) {
      return undefined;
    }

    return (metatype as ZodDto).schema;
  }

  private isNativeType(metatype: Function) {
    return [String, Boolean, Number, Array, Object].includes(
      metatype as typeof String,
    );
  }
}

export type ZodDtoOf<T extends ZodTypeAny> = z.infer<T>;
