import { z } from 'zod';
import { ZodDtoOf } from '../../../common/pipes/zod-validation.pipe';

export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6),
  })
  .strict();

export class LoginDto implements ZodDtoOf<typeof loginSchema> {
  static schema = loginSchema;

  email!: string;
  password!: string;
}
