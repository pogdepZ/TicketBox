import { z } from 'zod';
import { ZodDtoOf } from '../../../common/pipes/zod-validation.pipe';
import { createConcertSchema } from './create-concert.dto';

export const updateConcertSchema = createConcertSchema
  .partial()
  .extend({
    artistBio: z.string().optional(),
  })
  .strict();

export class UpdateConcertDto implements ZodDtoOf<typeof updateConcertSchema> {
  static schema = updateConcertSchema;

  name?: string;
  description?: string;
  artistName?: string;
  venueName?: string;
  venueAddress?: string;
  eventDate?: string;
  seatMapSvg?: string;
  posterUrl?: string;
  artistBio?: string;
}
