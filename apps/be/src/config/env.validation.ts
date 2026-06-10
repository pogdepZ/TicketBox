import { z } from 'zod';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

const environmentSchema = z.object({
  NODE_ENV: z.nativeEnum(Environment).default(Environment.Development),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1),
  JWT_TICKET_SECRET: z.string().min(1).default('ticket-secret-change-in-prod'),
  MOCK_VNPAY_SECRET: z.string().min(1).default('mock-vnpay-secret'),
  MOCK_MOMO_SECRET: z.string().min(1).default('mock-momo-secret'),
  MOCK_PAYMENT_BASE_URL: z.string().url().default('http://localhost:3000'),
});

export function validate(config: Record<string, unknown>) {
  const result = environmentSchema.safeParse(config);

  if (!result.success) {
    throw new Error(
      `Environment validation failed: ${result.error.message}`,
    );
  }

  return result.data;
}
