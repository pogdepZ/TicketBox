import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const paymentWebhookSchema = z
  .object({
    paymentRef: z.string().min(1),
    gatewayTransactionId: z.string().min(1),
    eventType: z.enum(['SUCCESS', 'FAILED', 'TIMEOUT']),
    amount: z.union([z.string().min(1), z.number().positive()]),
    currency: z.literal('VND').default('VND'),
    signature: z.string().min(1),
  })
  .strict();

export class PaymentWebhookDto extends createZodDto(paymentWebhookSchema) {}
