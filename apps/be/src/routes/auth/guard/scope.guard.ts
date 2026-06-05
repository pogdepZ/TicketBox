import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthRole, AuthUser } from '../dto/user-response.dto';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import {
  RESOURCE_SCOPE_KEY,
  ResourceScopeOptions,
} from '../decorators/resource-scope.decorator';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const resourceScope = this.reflector.getAllAndOverride<ResourceScopeOptions>(
      RESOURCE_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!resourceScope) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;

    if (!user) {
      throw new ForbiddenException('User not found in request');
    }

    const resourceId = this.getResourceId(request, resourceScope);

    if (!resourceId) {
      throw new ForbiddenException('Resource scope id not found in request');
    }

    const roles: AuthRole[] = Array.isArray(user.roles) ? user.roles : [];
    const permissions = requiredPermissions ?? [];

    const hasGlobalScope = roles.some(
      (role) =>
        this.normalizeScopeType(role.scopeType) === 'global' &&
        this.roleHasPermissions(role, permissions),
    );

    if (hasGlobalScope) {
      return true;
    }

    const requiredScopeType = this.normalizeScopeType(resourceScope.type);
    const hasResourceScope = roles.some(
      (role) =>
        this.normalizeScopeType(role.scopeType) === requiredScopeType &&
        role.scopeId === resourceId &&
        this.roleHasPermissions(role, permissions),
    );

    if (!hasResourceScope) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    return true;
  }

  private getResourceId(
    request: { params?: Record<string, unknown>; body?: Record<string, unknown> },
    resourceScope: ResourceScopeOptions,
  ): string | undefined {
    const value =
      (resourceScope.param ? request.params?.[resourceScope.param] : undefined) ??
      (resourceScope.bodyField
        ? request.body?.[resourceScope.bodyField]
        : undefined);

    return typeof value === 'string' ? value : undefined;
  }

  private roleHasPermissions(
    role: AuthRole,
    requiredPermissions: string[],
  ): boolean {
    if (requiredPermissions.length === 0) {
      return true;
    }

    const rolePermissions = new Set(
      Array.isArray(role.permissions) ? role.permissions : [],
    );

    return requiredPermissions.every((permission) =>
      rolePermissions.has(permission),
    );
  }

  private normalizeScopeType(scopeType: string): string {
    return scopeType.toLowerCase();
  }
}
