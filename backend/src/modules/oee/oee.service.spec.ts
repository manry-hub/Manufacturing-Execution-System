import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OeeService } from './oee.service.js';
import { PrismaService } from '../../database/prisma.service.js';

describe('OeeService', () => {
  let oeeService: OeeService;
  let prismaService: any;

  beforeEach(() => {
    prismaService = {
      productionArea: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'area-1', code: 'PROD-LINE-01', name: 'Production Line 01' },
        ]),
      },
      machine: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'm-1', code: 'IMM-01', name: 'Injection Machine 01', areaId: 'area-1' },
          { id: 'm-2', code: 'IMM-02', name: 'Injection Machine 02', areaId: 'area-1' },
        ]),
        findFirst: vi.fn(),
      },
      machineTimeSegment: {
        findMany: vi.fn().mockResolvedValue([
          { category: 'OPERATING', durationSeconds: 20000 },
          { category: 'UNPLANNED_DOWNTIME', durationSeconds: 3000 },
          { category: 'CHANGEOVER', durationSeconds: 1500 },
          { category: 'PLANNED_DOWNTIME', durationSeconds: 2000 },
          { category: 'UNALLOCATED', durationSeconds: 1500 },
        ]),
      },
      machineCurrentState: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
      },
      productionRun: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'run-1',
            status: 'COMPLETED',
            totalShots: 1000,
            goodQuantity: 3800,
            rejectQuantity: 200,
            mold: { cavityCount: 4 },
            productionOrder: {
              product: { standardCycleTime: 18.0 },
            },
          },
        ]),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      machineEventLog: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
      productionOrder: {
        findMany: vi.fn().mockResolvedValue([
          { targetQuantity: 10000 },
        ]),
      },
      scrapLog: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      oeeResult: {
        findMany: vi.fn().mockResolvedValue([
          {
            availability: 0.88,
            performance: 0.82,
            quality: 0.95,
            timestamp: new Date(),
          },
        ]),
        create: vi.fn(),
      },
    };

    oeeService = new OeeService(prismaService as unknown as PrismaService);
  });

  describe('getExecutiveAnalytics', () => {
    it('should compute complete ISO 22400-2 Executive Analytics with KPIs, Quantities, Rates, and Accounts', async () => {
      const result = await oeeService.getExecutiveAnalytics({
        window: 'SHIFT',
      });

      expect(result).toBeDefined();
      expect(result.filter.window).toBe('SHIFT');
      expect(result.kpi).toHaveProperty('oee');
      expect(result.kpi).toHaveProperty('availability');
      expect(result.kpi).toHaveProperty('performance');
      expect(result.kpi).toHaveProperty('quality');
      expect(result.productQuantity).toHaveProperty('actualQuantity', 3800);
      expect(result.productQuantity).toHaveProperty('targetQuantity', 10000);
      expect(result.productionRate).toHaveProperty('currentRate');
      expect(result.productionRate).toHaveProperty('targetRate');
      expect(result.lossAccounts).toHaveProperty('availabilityLoss');
      expect(result.lossAccounts).toHaveProperty('productionLoss');
      expect(result.lossAccounts).toHaveProperty('qualityLoss');
      expect(result.timeAccounts).toHaveProperty('activeSeconds', 20000);
      expect(result.timeAccounts).toHaveProperty('downtimeSeconds', 3000);
      expect(result.trendOverTime).toHaveLength(7);
      expect(result.availableFilters.areas).toHaveLength(1);
      expect(result.availableFilters.machines).toHaveLength(2);
    });

    it('should filter targets when machineId is provided', async () => {
      const result = await oeeService.getExecutiveAnalytics({
        machineId: 'm-1',
      });

      expect(result).toBeDefined();
      expect(result.filter.machineId).toBe('m-1');
      expect(prismaService.machineTimeSegment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            machineId: { in: ['m-1'] },
          }),
        }),
      );
    });
  });
});
