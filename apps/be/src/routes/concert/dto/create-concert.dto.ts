import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const isoDateStringSchema = z.union([
  z.string().datetime({ offset: true }),
  z.string().date(),
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

export class CreateConcertDto extends createZodDto(createConcertSchema) {}
