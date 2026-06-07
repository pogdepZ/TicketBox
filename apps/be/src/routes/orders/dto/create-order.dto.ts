import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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

export class CreateOrderItemDto extends createZodDto(createOrderItemSchema) {}

export class CreateOrderDto extends createZodDto(createOrderSchema) {}
