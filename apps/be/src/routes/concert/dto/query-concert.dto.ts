import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ConcertStatus } from '../types/concert-status.type';
import { isoDateStringSchema } from './create-concert.dto';

export const queryConcertSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.nativeEnum(ConcertStatus).optional(),
    keyword: z.string().optional(),
    fromDate: isoDateStringSchema.optional(),
    toDate: isoDateStringSchema.optional(),
  })
  .strict();

export class QueryConcertDto extends createZodDto(queryConcertSchema) {}
