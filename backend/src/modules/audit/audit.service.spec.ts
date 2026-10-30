import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService } from './audit.service.js';
import { PrismaService } from '../../database/prisma.service.js';

describe('AuditService', () => {
  let service: AuditService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      auditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    service = new AuditService(mockPrisma as unknown as PrismaService);
  });

  describe('record', () => {
    it('should create audit log with serialized JSON old/new values', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({
        id: BigInt(10),
        action: 'UPDATE_ORDER',
        entityType: 'ProductionOrder',
        entityId: 'ord-1',
        createdAt: new Date(),
      });

      const result = await service.record({
        userId: 'u-1',
        action: 'UPDATE_ORDER',
        entityType: 'ProductionOrder',
        entityId: 'ord-1',
        oldValues: { status: 'DRAFT' },
        newValues: { status: 'RELEASED' },
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(10);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u-1',
          action: 'UPDATE_ORDER',
          entityType: 'ProductionOrder',
          entityId: 'ord-1',
          oldValues: JSON.stringify({ status: 'DRAFT' }),
          newValues: JSON.stringify({ status: 'RELEASED' }),
        }),
      });
    });

    it('should catch error and return null to prevent transaction failure', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('DB failure'));

      const result = await service.record({
        action: 'TEST',
        entityType: 'Test',
        entityId: '1',
      });

      expect(result).toBeNull();
    });
  });

  describe('getPaginatedLogs', () => {
    it('should query logs and parse JSON strings with pagination metadata', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(1);
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: BigInt(1),
          userId: 'u-1',
          action: 'STATUS_CHANGE',
          entityType: 'Machine',
          entityId: 'm-1',
          oldValues: '{"status":"STOPPED"}',
          newValues: '{"status":"RUNNING"}',
          createdAt: new Date('2026-10-29T10:00:00Z'),
          user: { id: 'u-1', username: 'supervisor' },
        },
      ]);

      const res = await service.getPaginatedLogs({
        page: 1,
        limit: 10,
        entityType: 'Machine',
      });

      expect(res.total).toBe(1);
      expect(res.totalPages).toBe(1);
      expect(res.logs.length).toBe(1);
      expect(res.logs[0].oldValues).toEqual({ status: 'STOPPED' });
      expect(res.logs[0].newValues).toEqual({ status: 'RUNNING' });
      expect(res.logs[0].username).toBe('supervisor');
    });
  });

  describe('getStats', () => {
    it('should aggregate mutations breakdown by entity and action', async () => {
      mockPrisma.auditLog.count.mockResolvedValueOnce(50).mockResolvedValueOnce(12);
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { entityType: 'ProductionOrder', action: 'CREATE', userId: 'u-1', user: { username: 'planner' } },
        { entityType: 'ProductionOrder', action: 'RELEASE', userId: 'u-1', user: { username: 'planner' } },
        { entityType: 'QualityCheck', action: 'DISPOSITION', userId: 'u-2', user: { username: 'inspector' } },
      ]);

      const stats = await service.getStats();

      expect(stats.totalMutations).toBe(50);
      expect(stats.todayMutations).toBe(12);
      expect(stats.entityBreakdown.length).toBeGreaterThan(0);
      expect(stats.actionBreakdown.length).toBeGreaterThan(0);
      expect(stats.topActors.length).toBeGreaterThan(0);
    });
  });

  describe('getDistinctEntityTypes & getDistinctActions', () => {
    it('should return distinct lists', async () => {
      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce([{ entityType: 'Machine' }, { entityType: 'User' }])
        .mockResolvedValueOnce([{ action: 'CREATE' }, { action: 'UPDATE' }]);

      const entities = await service.getDistinctEntityTypes();
      const actions = await service.getDistinctActions();

      expect(entities).toEqual(['Machine', 'User']);
      expect(actions).toEqual(['CREATE', 'UPDATE']);
    });
  });
});
