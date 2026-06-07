import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { createConcertSchema } from './create-concert.dto';

export const updateConcertSchema = createConcertSchema
  .partial()
  .extend({
    artistBio: z.string().optional(),
  })
  .strict();

export class UpdateConcertDto extends createZodDto(updateConcertSchema) {}
