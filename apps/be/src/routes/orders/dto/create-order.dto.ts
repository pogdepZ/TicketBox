import { z } from 'zod';
import { ZodDtoOf } from '../../../common/pipes/zod-validation.pipe';

export const createOrderItemSchema = z
  .object({
    ticketTypeId: z.string().uuid(),
    quantity: z.coerce.number().int().min(1).max(10),
  })
  .strict();

export const createOrderSchema = z
  .object({
    concertId: z.string().uuid(),
    items: z.array(createOrderItemSchema).min(1),
  })
  .strict();

export class CreateOrderItemDto
  implements ZodDtoOf<typeof createOrderItemSchema>
{
  static schema = createOrderItemSchema;

  ticketTypeId!: string;
  quantity!: number;
}

export class CreateOrderDto implements ZodDtoOf<typeof createOrderSchema> {
  static schema = createOrderSchema;

  concertId!: string;
  items!: CreateOrderItemDto[];
}
