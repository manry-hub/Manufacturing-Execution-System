import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScopeGuard } from './scope.guard.js';
import { ScopeTypeEnum } from '../enums/scope-type.enum.js';

describe('ScopeGuard', () => {
  let guard: ScopeGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new ScopeGuard(reflector);
  });

  function createMockExecutionContext(user?: any, params: any = {}, body: any = {}): ExecutionContext {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({ user, params, query: {}, body }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access if no scope requirement is specified', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockExecutionContext();
    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow System Administrator full-access bypass', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      level: ScopeTypeEnum.MACHINE,
      paramKey: 'machineId',
    });

    const context = createMockExecutionContext(
      { roles: ['System Administrator'], scopes: [] },
      { machineId: 'IMM-09' },
    );

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow user if their machine scope matches target machine', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      level: ScopeTypeEnum.MACHINE,
      paramKey: 'machineId',
    });

    const context = createMockExecutionContext(
      {
        roles: ['Machine Operator'],
        scopes: [{ role: 'Machine Operator', scopeType: 'MACHINE', scopeId: 'IMM-01' }],
      },
      { machineId: 'IMM-01' },
    );

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should reject user if their scope does not cover target machine', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      level: ScopeTypeEnum.MACHINE,
      paramKey: 'machineId',
    });

    const context = createMockExecutionContext(
      {
        roles: ['Machine Operator'],
        scopes: [{ role: 'Machine Operator', scopeType: 'MACHINE', scopeId: 'IMM-01' }],
      },
      { machineId: 'IMM-02' },
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
