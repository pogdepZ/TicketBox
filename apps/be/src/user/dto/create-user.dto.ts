import type { UserStatus } from '../../generated/prisma';

export class CreateUserDto {
	email!: string;

	phone?: string;

	passwordHash?: string;

	fullName!: string;

	status?: UserStatus;
}
