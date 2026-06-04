import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @IsNumber()
  PORT!: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    {
      NODE_ENV: config.NODE_ENV ?? 'development',
      PORT: config.PORT ?? 3000,
      DATABASE_URL: config.DATABASE_URL,
      JWT_ACCESS_SECRET: config.JWT_ACCESS_SECRET ?? 'default_access_secret',
      JWT_REFRESH_SECRET: config.JWT_REFRESH_SECRET ?? 'default_refresh_secret',
    },
    {
      enableImplicitConversion: true,
    },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed: ${errors.toString()}`,
    );
  }

  return validatedConfig;
}