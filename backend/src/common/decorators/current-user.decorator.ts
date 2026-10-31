import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface ScopedAssignment {
  role: string;
  scopeType: 'GLOBAL' | 'PLANT' | 'AREA' | 'MACHINE';
  scopeId: string;
}

export interface CurrentUserPayload {
  userId: string;
  username: string;
  email?: string;
  roles: string[];
  permissions?: string[];
  scopes?: ScopedAssignment[];
  principalType?: 'HUMAN' | 'SERVICE';
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUserPayload | undefined;

    return data && user ? user[data] : user;
  },
);
