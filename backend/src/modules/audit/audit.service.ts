import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

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
      // We do not throw here to prevent auditing failures from rolling back critical business operations
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
}
