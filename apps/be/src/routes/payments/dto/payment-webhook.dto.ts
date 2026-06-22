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
    gatewayPaidAt: z.union([z.string().min(1), z.number()]).optional(),
    paidAt: z.union([z.string().min(1), z.number()]).optional(),
    responseTime: z.union([z.string().min(1), z.number()]).optional(),
    transTime: z.union([z.string().min(1), z.number()]).optional(),
    transactionTime: z.union([z.string().min(1), z.number()]).optional(),
  })
  .strict();

export class PaymentWebhookDto extends createZodDto(paymentWebhookSchema) {}
