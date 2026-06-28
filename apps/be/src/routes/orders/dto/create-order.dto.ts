import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createOrderSchema = z
  .object({
    concertId: z.string().uuid(),
    ticketTypeId: z.string().uuid().optional(),
    seatNumbers: z
      .array(z.string().min(1, 'Seat number must not be empty'))
      .optional()
      .transform((val) => {
        return val ? val.map((s) => s.trim().toUpperCase()) : undefined;
      }),
    items: z
      .array(
        z.object({
          ticketTypeId: z.string().uuid(),
          seatNumbers: z
            .array(z.string().min(1, 'Seat number must not be empty'))
            .min(1, 'seatNumbers must not be empty')
            .transform((val) => val.map((s) => s.trim().toUpperCase())),
        })
      )
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.items && data.items.length > 0) return true;
      if (data.ticketTypeId && data.seatNumbers && data.seatNumbers.length > 0) return true;
      return false;
    },
    {
      message: 'Either items array or both ticketTypeId and seatNumbers must be provided',
    }
  );

export class CreateOrderDto extends createZodDto(createOrderSchema) {}
