import { createZodDto } from 'nestjs-zod';
import { UserStatus } from '../../../generated/prisma';
import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().email().max(255),
    phone: z.string().max(20).optional(),
    password: z.string().min(6).max(72),
    fullName: z.string().min(1).max(100),
    status: z.nativeEnum(UserStatus).optional(),
  })
  .strict();

export class RegisterDto extends createZodDto(registerSchema) {}
