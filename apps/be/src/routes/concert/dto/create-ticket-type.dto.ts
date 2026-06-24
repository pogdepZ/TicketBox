import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createTicketTypeSchema = z.object({
  name: z.string().min(1).max(50),
  price: z.number().min(0),
  totalQuantity: z.number().int().min(1),
  maxPerUser: z.number().int().min(1).default(4),
  saleStartAt: z.string().datetime({ offset: true }).nullable().optional(),
  saleEndAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export class CreateTicketTypeDto extends createZodDto(createTicketTypeSchema) {}
