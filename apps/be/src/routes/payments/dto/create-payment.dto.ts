import { z } from 'zod';
import { ZodDtoOf } from '../../../common/pipes/zod-validation.pipe';

export const createPaymentSchema = z
  .object({
    orderId: z.string().uuid(),
    provider: z.enum(['VNPAY', 'MOMO']),
    returnUrl: z.string().url().optional(),
  })
  .strict();

export class CreatePaymentDto implements ZodDtoOf<typeof createPaymentSchema> {
  static schema = createPaymentSchema;

  orderId!: string;
  provider!: 'VNPAY' | 'MOMO';
  returnUrl?: string;
}
