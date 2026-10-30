import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AuditQueryDto {
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}

export interface AuditLogDto {
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

export interface AuditPaginatedResponseDto {
  logs: AuditLogDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditStatsDto {
  totalMutations: number;
  todayMutations: number;
  entityBreakdown: { entityType: string; count: number }[];
  actionBreakdown: { action: string; count: number }[];
  topActors: { userId: string; username: string; count: number }[];
}
