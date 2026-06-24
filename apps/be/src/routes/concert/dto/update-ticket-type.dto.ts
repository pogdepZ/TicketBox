import { createZodDto } from 'nestjs-zod';
import { createTicketTypeSchema } from './create-ticket-type.dto';

export const updateTicketTypeSchema = createTicketTypeSchema.partial();

export class UpdateTicketTypeDto extends createZodDto(updateTicketTypeSchema) {}
