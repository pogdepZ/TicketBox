import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const cancelConcertSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .strict()
  .default({});

export class CancelConcertDto extends createZodDto(cancelConcertSchema) {}
