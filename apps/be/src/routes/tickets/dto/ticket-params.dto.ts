import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const ticketIdParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const orderIdParamSchema = z
  .object({
    orderId: z.string().uuid(),
  })
  .strict();

export class TicketIdParamDto extends createZodDto(ticketIdParamSchema) {}

export class OrderIdParamDto extends createZodDto(orderIdParamSchema) {}
