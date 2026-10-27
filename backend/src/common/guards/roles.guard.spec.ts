import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { RoleEnum } from '../enums/role.enum.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockExecutionContext(user?: any): ExecutionContext {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access if no roles are required on route', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockExecutionContext();
    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user has no roles and route requires roles', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      RoleEnum.SYSTEM_ADMINISTRATOR,
    ]);

    const context = createMockExecutionContext({ username: 'user1' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user does not possess required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      RoleEnum.SYSTEM_ADMINISTRATOR,
    ]);

    const context = createMockExecutionContext({
      username: 'op1',
      roles: [RoleEnum.MACHINE_OPERATOR],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow access if user has one of the required roles', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      RoleEnum.SYSTEM_ADMINISTRATOR,
      RoleEnum.PRODUCTION_SUPERVISOR,
    ]);

    const context = createMockExecutionContext({
      username: 'sup1',
      roles: [RoleEnum.PRODUCTION_SUPERVISOR],
    });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });
});
