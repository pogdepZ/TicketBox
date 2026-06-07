import { z } from 'zod';
import { ZodDtoOf } from '../../../common/pipes/zod-validation.pipe';

export const cancelConcertSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .strict()
  .default({});

export class CancelConcertDto implements ZodDtoOf<typeof cancelConcertSchema> {
  static schema = cancelConcertSchema;

  reason?: string;
}
