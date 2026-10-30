export interface ManagedUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SystemRole {
  id: string;
  name: string;
  description: string | null;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  roles: string[];
  isActive?: boolean;
}

export interface UpdateUserPayload {
  email?: string;
  roles?: string[];
  isActive?: boolean;
}

export interface AuditLogEntry {
  id: number;
  userId: string | null;
  username: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditPaginatedResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditStats {
  totalMutations: number;
  todayMutations: number;
  entityBreakdown: { entityType: string; count: number }[];
  actionBreakdown: { action: string; count: number }[];
  topActors: { userId: string; username: string; count: number }[];
}

export interface AuditFilterParams {
  entityType?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}
