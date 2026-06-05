import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthRole } from '../dto/user-response.dto';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [
        context.getHandler(),
        context.getClass(),
      ],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found in request');
    }

    const userRoles: AuthRole[] = Array.isArray(user.roles) ? user.roles : [];

    const isAllowed = userRoles.some((userRole) =>
      requiredRoles.includes(userRole.name),
    );

    if (!isAllowed) {
      throw new ForbiddenException('You do not have permission');
    }

    return true;
  }
}
