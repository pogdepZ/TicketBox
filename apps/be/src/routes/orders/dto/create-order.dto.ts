import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createOrderSchema = z
  .object({
    concertId: z.string().uuid(),
    ticketTypeId: z.string().uuid(),
    seatNumbers: z
      .array(
        z.string().min(1, 'Seat number must not be empty')
      )
      .min(1, 'seatNumbers must not be empty')
      .transform((val) => {
        // Trim and uppercase each seat number
        return val.map((s) => s.trim().toUpperCase());
      })
      .refine((val) => {
        // No duplicate seats allowed in the same request
        const unique = new Set(val);
        return unique.size === val.length;
      }, {
        message: 'Duplicate seat numbers are not allowed in the same request',
      }),
  })
  .strict();

export class CreateOrderDto extends createZodDto(createOrderSchema) {}
