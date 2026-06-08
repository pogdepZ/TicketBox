import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createPaymentSchema = z
  .object({
    orderId: z.string().uuid(),
    provider: z.enum(['VNPAY', 'MOMO']),
    returnUrl: z.string().url().optional(),
  })
  .strict();

export class CreatePaymentDto extends createZodDto(createPaymentSchema) {}
