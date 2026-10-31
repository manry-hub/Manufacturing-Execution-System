import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import { CurrentUserPayload } from '../decorators/current-user.decorator.js';
import { RoleEnum } from '../enums/role.enum.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: CurrentUserPayload }>();
    if (!user) {
      throw new ForbiddenException('Access denied: Unauthenticated principal');
    }

    // System Administrator has GLOBAL full-access bypass for permissions
    if (user.roles?.includes(RoleEnum.SYSTEM_ADMINISTRATOR) || user.roles?.includes('System Administrator')) {
      return true;
    }

    const userPermissions = user.permissions || [];
    const hasAllRequired = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasAllRequired) {
      const missing = requiredPermissions.filter((p) => !userPermissions.includes(p));
      throw new ForbiddenException(
        `Access denied: Missing required permissions [${missing.join(', ')}]`,
      );
    }

    return true;
  }
}
