import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthRole, AuthUser } from '../dto/user-response.dto';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  private readonly logger = new Logger(PermissionGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;

    if (!user) {
      throw new ForbiddenException('User not found in request');
    }

    const roles: AuthRole[] = Array.isArray(user.roles) ? user.roles : [];
    const userPermissions = new Set(
      roles.flatMap((role) =>
        Array.isArray(role.permissions) ? role.permissions : [],
      ),
    );

    const hasAllRequiredPermissions = requiredPermissions.every((permission) =>
      userPermissions.has(permission),
    );

    if (!hasAllRequiredPermissions) {
      throw new ForbiddenException('You do not have permission');
    }

    return true;
  }
}
