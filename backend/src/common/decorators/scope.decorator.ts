import { SetMetadata } from '@nestjs/common';
import { ScopeTypeEnum } from '../enums/scope-type.enum.js';

export const SCOPE_KEY = 'scope';

export interface ScopeOptions {
  level: ScopeTypeEnum;
  paramKey?: string; // name of param in request body/param/query e.g. 'machineId', 'plantId'
}

export const RequireScope = (level: ScopeTypeEnum, paramKey?: string) =>
  SetMetadata(SCOPE_KEY, { level, paramKey });
