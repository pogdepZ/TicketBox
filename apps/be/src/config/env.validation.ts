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
  JWT_TICKET_SECRET: z.string().min(1),
  MOCK_VNPAY_SECRET: z.string().min(1),
  MOCK_MOMO_SECRET: z.string().min(1),
  MOCK_PAYMENT_BASE_URL: z.string().url(),
  VNP_URL: z.string().url(),
  VNP_TMN_CODE: z.string().optional(),
  VNP_HASH_SECRET: z.string().optional(),
  VNP_RETURN_URL: z.string().url(),
  MOMO_ENDPOINT: z.string().url(),
  MOMO_PARTNER_CODE: z.string().min(1),
  MOMO_ACCESS_KEY: z.string().min(1),
  MOMO_SECRET_KEY: z.string().min(1),
  MOMO_REDIRECT_URL: z.string().url(),
  MOMO_IPN_URL: z.string().url(),
  MOMO_REQUEST_TYPE: z.string(),
});

export function validate(config: Record<string, unknown>) {
  const result = environmentSchema.safeParse(config);

  if (!result.success) {
    console.error('❌ Environment validation failed:', result.error.format());
    throw new Error(
      `Environment validation failed: ${result.error.message}`,
    );
  }

  return result.data;
}
