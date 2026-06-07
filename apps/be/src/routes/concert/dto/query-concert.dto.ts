import { z } from 'zod';
import { ZodDtoOf } from '../../../common/pipes/zod-validation.pipe';
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

export class QueryConcertDto implements ZodDtoOf<typeof queryConcertSchema> {
  static schema = queryConcertSchema;

  page!: number;
  limit!: number;
  status?: ConcertStatus;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
}
