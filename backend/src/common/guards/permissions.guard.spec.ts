import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard.js';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
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

  it('should allow access if no permissions are required on route', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockExecutionContext();
    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow System Administrator global override even without explicit permission array', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['production.run.start_stop']);

    const context = createMockExecutionContext({
      userId: 'admin-1',
      roles: ['System Administrator'],
      permissions: [],
    });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow user possessing all required permissions', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['production.run.start_stop']);

    const context = createMockExecutionContext({
      userId: 'op-1',
      roles: ['Machine Operator'],
      permissions: ['production.run.start_stop', 'production.scrap.record'],
    });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user lacks required permission', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['production.run.start_stop']);

    const context = createMockExecutionContext({
      userId: 'analyst-1',
      roles: ['Production Read-only Analyst'],
      permissions: ['production.order.read', 'oee.read'],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
