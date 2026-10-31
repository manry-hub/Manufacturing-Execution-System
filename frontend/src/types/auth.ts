export type UserRole =
  | 'admin'
  | 'production_manager'
  | 'production_supervisor'
  | 'operator'
  | 'production_analyst';

export interface ScopedAssignment {
  role: string;
  scopeType: 'GLOBAL' | 'PLANT' | 'AREA' | 'MACHINE';
  scopeId: string;
}

export interface User {
  id: string;
  username: string;
  name?: string;
  email?: string;
  role: UserRole;
  roles?: string[];
  permissions?: string[];
  scopes?: ScopedAssignment[];
  token?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  user: {
    id: string;
    username: string;
    email?: string;
    role?: UserRole;
    roles: string[];
    permissions?: string[];
    scopes?: ScopedAssignment[];
  };
}
