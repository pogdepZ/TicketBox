import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const verifyTicketSchema = z
  .object({
    qrPayload: z.string().min(1),
  })
  .strict();

export class VerifyTicketDto extends createZodDto(verifyTicketSchema) {}
