import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPE_KEY, ScopeOptions } from '../decorators/scope.decorator.js';
import { CurrentUserPayload } from '../decorators/current-user.decorator.js';
import { RoleEnum } from '../enums/role.enum.js';
import { ScopeTypeEnum } from '../enums/scope-type.enum.js';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const scopeOptions = this.reflector.getAllAndOverride<ScopeOptions>(SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!scopeOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: CurrentUserPayload;
      params: Record<string, string>;
      query: Record<string, string>;
      body: Record<string, any>;
    }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Access denied: Unauthenticated principal');
    }

    // System Administrator has GLOBAL full-access override
    if (user.roles?.includes(RoleEnum.SYSTEM_ADMINISTRATOR) || user.roles?.includes('System Administrator')) {
      return true;
    }

    const userScopes = user.scopes || [];
    // If user has any GLOBAL scope assignment, they have full scope access
    if (userScopes.some((s) => s.scopeType === ScopeTypeEnum.GLOBAL || s.scopeId === 'GLOBAL')) {
      return true;
    }

    // Extract target ID from params, query, or body
    const paramKey = scopeOptions.paramKey || (scopeOptions.level === ScopeTypeEnum.MACHINE ? 'machineId' : 'plantId');
    const targetId = request.params?.[paramKey] || request.query?.[paramKey] || request.body?.[paramKey];

    if (!targetId) {
      // If target ID isn't directly present, allow if user has at least one valid scope at or above required level
      return userScopes.length > 0;
    }

    const hasMatchingScope = userScopes.some((s) => {
      if (s.scopeType === ScopeTypeEnum.GLOBAL || s.scopeId === 'GLOBAL') return true;
      if (s.scopeId === targetId) return true;
      // Plant scope matches prefix or descendants if formatted with hierarchy
      if (s.scopeType === ScopeTypeEnum.PLANT && targetId.startsWith(s.scopeId)) return true;
      return false;
    });

    if (!hasMatchingScope) {
      throw new ForbiddenException(
        `Access denied: Principal scope does not cover resource target "${targetId}"`,
      );
    }

    return true;
  }
}
