import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

function mockContext(user?: { role: Role }): ExecutionContext {
  return {
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    guard = new RolesGuard(reflector);
  });

  it('allows when no roles metadata is set', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(mockContext({ role: Role.CUSTOMER }))).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
  });

  it('allows when user role is in required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.STORE_ADMIN]);
    expect(guard.canActivate(mockContext({ role: Role.STORE_ADMIN }))).toBe(true);
  });

  it('forbids when user role is not allowed (customer vs admin)', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.STORE_ADMIN]);
    expect(() => guard.canActivate(mockContext({ role: Role.CUSTOMER }))).toThrow(
      ForbiddenException,
    );
  });

  it('forbids when user is missing', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.STAFF]);
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(ForbiddenException);
  });
});
