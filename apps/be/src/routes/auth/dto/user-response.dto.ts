import { UserWithRoles } from '../types/auth-user.types';

export type AuthRole = {
  name: string;
  permissions: string[];
};

export type AuthUser = {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  status: string;
  roles: AuthRole[];
};

export class UserResponseDto implements AuthUser {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  status: string;
  roles: AuthRole[];

  constructor(user: UserWithRoles) {
    this.id = user.id;
    this.email = user.email;
    this.phone = user.phone;
    this.fullName = user.fullName;
    this.status = user.status;
    this.roles = user.roles.map((userRole) => ({
      name: userRole.role.name,
      permissions: userRole.role.permissions.map(
        (rolePermission) => rolePermission.permission.code,
      ),
    }));
  }
}
