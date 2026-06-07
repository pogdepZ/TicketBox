import { z } from 'zod';
import { ZodDtoOf } from '../../../common/pipes/zod-validation.pipe';

export const isoDateStringSchema = z.union([
  z.iso.datetime({ offset: true }),
  z.iso.date(),
]);

export const createConcertSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    artistName: z.string().max(200).optional(),
    venueName: z.string().min(1).max(200),
    venueAddress: z.string().min(1),
    eventDate: isoDateStringSchema,
    seatMapSvg: z.string().optional(),
    // Intentionally not using url validation so local/mock paths can be accepted during storage integration.
    posterUrl: z.string().max(500).optional(),
  })
  .strict();

export class CreateConcertDto implements ZodDtoOf<typeof createConcertSchema> {
  static schema = createConcertSchema;

  name!: string;
  description?: string;
  artistName?: string;
  venueName!: string;
  venueAddress!: string;
  eventDate!: string;
  seatMapSvg?: string;
  posterUrl?: string;
}
