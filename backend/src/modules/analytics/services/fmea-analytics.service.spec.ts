import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FmeaAnalyticsService } from './fmea-analytics.service.js';
import { PrismaService } from '../../../database/prisma.service.js';

describe('FmeaAnalyticsService', () => {
  let service: FmeaAnalyticsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      andonTicket: {
        findMany: vi.fn(),
      },
      productionRun: {
        findMany: vi.fn(),
      },
      machine: {
        findUnique: vi.fn(),
      },
      machineEventLog: {
        findMany: vi.fn(),
      },
    };

    service = new FmeaAnalyticsService(mockPrisma as unknown as PrismaService);
  });

  describe('getFmeaAnalysis', () => {
    it('should calculate FMEA RPN and return summary with risk matrix', async () => {
      mockPrisma.andonTicket.findMany.mockResolvedValue([]);
      mockPrisma.productionRun.findMany.mockResolvedValue([{ rejectQuantity: 10 }]);

      const result = await service.getFmeaAnalysis({ riskFilter: 'ALL' });

      expect(result).toBeDefined();
      expect(result.summary.totalAssessed).toBeGreaterThan(0);
      expect(result.items.length).toBe(result.summary.totalAssessed);
      expect(result.summary.highestRpn).toBeGreaterThanOrEqual(result.summary.averageRpn);

      // Verify Pareto ordering (RPN descending)
      for (let i = 0; i < result.items.length - 1; i++) {
        expect(result.items[i].rpn).toBeGreaterThanOrEqual(result.items[i + 1].rpn);
      }

      // Matrix has cells
      expect(result.matrix.length).toBeGreaterThan(0);
    });

    it('should dynamically elevate occurrence when matching Andon incidents occur', async () => {
      // Mock 5 ELECTRICAL tickets and 4 QUALITY tickets
      mockPrisma.andonTicket.findMany.mockResolvedValue([
        { category: 'ELECTRICAL', reportTime: new Date(), status: 'RESOLVED' },
        { category: 'ELECTRICAL', reportTime: new Date(), status: 'RESOLVED' },
        { category: 'ELECTRICAL', reportTime: new Date(), status: 'RESOLVED' },
        { category: 'ELECTRICAL', reportTime: new Date(), status: 'RESOLVED' },
        { category: 'ELECTRICAL', reportTime: new Date(), status: 'RESOLVED' },
        { category: 'QUALITY', reportTime: new Date(), status: 'RESOLVED' },
        { category: 'QUALITY', reportTime: new Date(), status: 'RESOLVED' },
        { category: 'QUALITY', reportTime: new Date(), status: 'RESOLVED' },
        { category: 'QUALITY', reportTime: new Date(), status: 'RESOLVED' },
      ]);
      mockPrisma.productionRun.findMany.mockResolvedValue([{ rejectQuantity: 100 }]);

      const result = await service.getFmeaAnalysis({ riskFilter: 'ALL' });

      const electricalItem = result.items.find((i) => i.id === 'FMEA-IMM-002');
      expect(electricalItem).toBeDefined();
      // Base occurrence was 3, elevated by +2 due to >=3 matching tickets
      expect(electricalItem!.occurrence).toBe(5);
      expect(electricalItem!.linkedIncidentCount).toBe(5);
      expect(electricalItem!.rpn).toBe(9 * 5 * 2); // 90
    });

    it('should filter items by risk level', async () => {
      mockPrisma.andonTicket.findMany.mockResolvedValue([]);
      mockPrisma.productionRun.findMany.mockResolvedValue([]);

      const result = await service.getFmeaAnalysis({ riskFilter: 'HIGH' });

      for (const item of result.items) {
        expect(item.riskLevel).toBe('HIGH');
      }
    });
  });

  describe('getCycleTimeDistribution', () => {
    it('should construct histogram bins, standard deviation, and tolerance metrics', async () => {
      mockPrisma.machine.findUnique.mockResolvedValue({ id: 'm-1', code: 'IMM-01' });

      const mockLogs = Array.from({ length: 40 }, (_, i) => ({
        id: BigInt(i + 1),
        rawPayload: JSON.stringify({
          metrics: { cycleTimeSeconds: 21.5 + (i % 5) * 0.2 },
        }),
      }));
      mockPrisma.machineEventLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getCycleTimeDistribution({
        machineCode: 'IMM-01',
        sampleCount: 40,
      });

      expect(result).toBeDefined();
      expect(result.machineCode).toBe('IMM-01');
      expect(result.nominalCycleTime).toBe(22.0);
      expect(result.meanCycleTime).toBeCloseTo(21.9, 1);
      expect(result.bins.length).toBe(10);
      expect(result.withinTolerancePercent).toBeGreaterThan(0);
    });
  });
});
