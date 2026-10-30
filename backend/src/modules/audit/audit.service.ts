import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  AuditLogDto,
  AuditPaginatedResponseDto,
  AuditQueryDto,
  AuditStatsDto,
} from './dto/audit-query.dto.js';

export interface RecordAuditParams {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

export interface QueryAuditParams {
  entityType?: string;
  entityId?: string;
  userId?: string;
  limit?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(params: RecordAuditParams) {
    try {
      const oldValuesJson = params.oldValues ? JSON.stringify(params.oldValues) : null;
      const newValuesJson = params.newValues ? JSON.stringify(params.newValues) : null;

      const log = await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          oldValues: oldValuesJson,
          newValues: newValuesJson,
        },
      });

      return {
        ...log,
        id: Number(log.id),
      };
    } catch (error) {
      this.logger.error(`Failed to record audit log: ${(error as Error).message}`, (error as Error).stack);
      // Prevent auditing failures from rolling back critical business operations
      return null;
    }
  }

  async query(params: QueryAuditParams) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        entityType: params.entityType,
        entityId: params.entityId,
        userId: params.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
    });

    return logs.map((log) => ({
      ...log,
      id: Number(log.id),
      oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
      newValues: log.newValues ? JSON.parse(log.newValues) : null,
    }));
  }

  async getPaginatedLogs(query: AuditQueryDto): Promise<AuditPaginatedResponseDto> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 25));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.entityId) {
      where.entityId = query.entityId;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    if (query.search) {
      where.OR = [
        { action: { contains: query.search } },
        { entityType: { contains: query.search } },
        { entityId: { contains: query.search } },
        { user: { username: { contains: query.search } } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formatted: AuditLogDto[] = logs.map((log) => {
      let oldVals = null;
      let newVals = null;
      try {
        if (log.oldValues) oldVals = JSON.parse(log.oldValues);
      } catch {
        oldVals = { raw: log.oldValues };
      }
      try {
        if (log.newValues) newVals = JSON.parse(log.newValues);
      } catch {
        newVals = { raw: log.newValues };
      }

      return {
        id: Number(log.id),
        userId: log.userId,
        username: log.user?.username ?? 'System',
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValues: oldVals,
        newValues: newVals,
        createdAt: log.createdAt.toISOString(),
      };
    });

    return {
      logs: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getStats(): Promise<AuditStatsDto> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalMutations, todayMutations, allLogs] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      this.prisma.auditLog.findMany({
        select: {
          entityType: true,
          action: true,
          userId: true,
          user: { select: { username: true } },
        },
        take: 1000,
      }),
    ]);

    // Aggregate entity breakdown
    const entityCounts: Record<string, number> = {};
    const actionCounts: Record<string, number> = {};
    const actorCounts: Record<string, { username: string; count: number }> = {};

    for (const log of allLogs) {
      entityCounts[log.entityType] = (entityCounts[log.entityType] || 0) + 1;
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;

      const actorKey = log.userId || 'system';
      const actorName = log.user?.username || 'System';
      if (!actorCounts[actorKey]) {
        actorCounts[actorKey] = { username: actorName, count: 0 };
      }
      actorCounts[actorKey].count += 1;
    }

    const entityBreakdown = Object.entries(entityCounts)
      .map(([entityType, count]) => ({ entityType, count }))
      .sort((a, b) => b.count - a.count);

    const actionBreakdown = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);

    const topActors = Object.entries(actorCounts)
      .map(([userId, val]) => ({ userId, username: val.username, count: val.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalMutations,
      todayMutations,
      entityBreakdown,
      actionBreakdown,
      topActors,
    };
  }

  async getDistinctEntityTypes(): Promise<string[]> {
    const distinct = await this.prisma.auditLog.findMany({
      select: { entityType: true },
      distinct: ['entityType'],
      orderBy: { entityType: 'asc' },
    });
    return distinct.map((d) => d.entityType);
  }

  async getDistinctActions(): Promise<string[]> {
    const distinct = await this.prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });
    return distinct.map((d) => d.action);
  }
}
