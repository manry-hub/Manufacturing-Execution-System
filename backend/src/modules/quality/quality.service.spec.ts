import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QualityService } from './quality.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('QualityService', () => {
  let service: QualityService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      product: {
        findUnique: vi.fn(),
      },
      inspectionPlan: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      inspectionPlanItem: {
        findMany: vi.fn(),
      },
      productionRun: {
        findUnique: vi.fn(),
      },
      qualityCheck: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      qualityCheckSample: {
        findMany: vi.fn(),
      },
    };

    service = new QualityService(mockPrisma as unknown as PrismaService);
  });

  describe('recordQualityCheck', () => {
    it('should throw BadRequestException if plan item IDs are invalid', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue({ id: 'run-1' });
      mockPrisma.inspectionPlanItem.findMany.mockResolvedValue([]); // No items found

      await expect(
        service.recordQualityCheck(
          {
            runId: 'run-1',
            checkType: 'FIRST_PIECE',
            samples: [{ planItemId: 'invalid-item', measuredValue: 10 }],
          },
          'inspector-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should evaluate variable tolerance and set RELEASED if within bounds', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue({ id: 'run-1' });
      mockPrisma.inspectionPlanItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          parameterName: 'Length',
          measurementType: 'VARIABLE',
          lowerTolerance: new Prisma.Decimal(9.8),
          upperTolerance: new Prisma.Decimal(10.2),
        },
      ]);
      mockPrisma.qualityCheck.create.mockImplementation(({ data }: any) => {
        return {
          id: 'qc-1',
          ...data,
        };
      });

      const res = await service.recordQualityCheck(
        {
          runId: 'run-1',
          checkType: 'FIRST_PIECE',
          samples: [{ planItemId: 'item-1', measuredValue: 10.0 }],
        },
        'inspector-1',
      );

      expect(res.disposition).toBe('RELEASED');
      expect(mockPrisma.qualityCheck.create).toHaveBeenCalled();
    });

    it('should auto-disposition to QUARANTINE if variable measurement is out of tolerance', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue({ id: 'run-1' });
      mockPrisma.inspectionPlanItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          parameterName: 'Length',
          measurementType: 'VARIABLE',
          lowerTolerance: new Prisma.Decimal(9.8),
          upperTolerance: new Prisma.Decimal(10.2),
        },
      ]);
      mockPrisma.qualityCheck.create.mockImplementation(({ data }: any) => {
        return {
          id: 'qc-1',
          ...data,
        };
      });

      const res = await service.recordQualityCheck(
        {
          runId: 'run-1',
          checkType: 'FIRST_PIECE',
          samples: [{ planItemId: 'item-1', measuredValue: 10.5 }], // Out of bounds!
        },
        'inspector-1',
      );

      expect(res.disposition).toBe('QUARANTINE');
    });
  });

  describe('checkFirstPieceReleaseStatus', () => {
    it('should return isReleased false when no released first-piece check exists', async () => {
      mockPrisma.qualityCheck.findFirst.mockResolvedValue(null);

      const res = await service.checkFirstPieceReleaseStatus('run-1');
      expect(res.isReleased).toBe(false);
      expect(res.firstPieceCheck).toBeNull();
    });

    it('should return isReleased true when released first-piece check exists', async () => {
      mockPrisma.qualityCheck.findFirst.mockResolvedValue({
        id: 'qc-1',
        disposition: 'RELEASED',
        checkType: 'FIRST_PIECE',
      });

      const res = await service.checkFirstPieceReleaseStatus('run-1');
      expect(res.isReleased).toBe(true);
      expect(res.firstPieceCheck?.id).toBe('qc-1');
    });
  });

  describe('calculateCpk', () => {
    it('should return INSUFFICIENT_DATA if no variable plan items exist', async () => {
      mockPrisma.inspectionPlanItem.findMany.mockResolvedValue([]);

      const result = await service.calculateCpk({ productId: 'prod-1' });
      expect(result.metrics).toHaveLength(0);
      expect(result.overallStatus).toBe('INSUFFICIENT_DATA');
    });

    it('should return INSUFFICIENT_DATA if plan item has fewer than 2 samples', async () => {
      mockPrisma.inspectionPlanItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          parameterName: 'Wall Thickness',
          measurementType: 'VARIABLE',
          targetValue: new Prisma.Decimal(2.5),
          lowerTolerance: new Prisma.Decimal(2.3),
          upperTolerance: new Prisma.Decimal(2.7),
        },
      ]);
      mockPrisma.qualityCheckSample.findMany.mockResolvedValue([
        {
          planItemId: 'item-1',
          measuredValue: new Prisma.Decimal(2.51),
          qualityCheck: { checkedAt: new Date() },
        },
      ]);

      const result = await service.calculateCpk({ runId: 'run-1' });
      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0].status).toBe('INSUFFICIENT_DATA');
      expect(result.metrics[0].sampleCount).toBe(1);
      expect(result.metrics[0].mean).toBe(2.51);
      expect(result.overallStatus).toBe('INSUFFICIENT_DATA');
    });

    it('should calculate CAPABLE status when Cpk >= 1.33', async () => {
      mockPrisma.inspectionPlanItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          parameterName: 'Wall Thickness',
          measurementType: 'VARIABLE',
          targetValue: new Prisma.Decimal(2.5),
          lowerTolerance: new Prisma.Decimal(2.3),
          upperTolerance: new Prisma.Decimal(2.7),
        },
      ]);
      // Mean 2.50, highly stable values
      mockPrisma.qualityCheckSample.findMany.mockResolvedValue([
        { planItemId: 'item-1', measuredValue: new Prisma.Decimal(2.50), qualityCheck: { checkedAt: new Date() } },
        { planItemId: 'item-1', measuredValue: new Prisma.Decimal(2.51), qualityCheck: { checkedAt: new Date() } },
        { planItemId: 'item-1', measuredValue: new Prisma.Decimal(2.49), qualityCheck: { checkedAt: new Date() } },
        { planItemId: 'item-1', measuredValue: new Prisma.Decimal(2.50), qualityCheck: { checkedAt: new Date() } },
      ]);

      const result = await service.calculateCpk({ runId: 'run-1' });
      expect(result.metrics).toHaveLength(1);
      const metric = result.metrics[0];
      expect(metric.status).toBe('CAPABLE');
      expect(metric.cpk).toBeGreaterThanOrEqual(1.33);
      expect(result.overallStatus).toBe('CAPABLE');
    });

    it('should calculate INCAPABLE status when Cpk < 1.00', async () => {
      mockPrisma.inspectionPlanItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          parameterName: 'Wall Thickness',
          measurementType: 'VARIABLE',
          targetValue: new Prisma.Decimal(2.5),
          lowerTolerance: new Prisma.Decimal(2.4),
          upperTolerance: new Prisma.Decimal(2.6),
        },
      ]);
      // High variance shifting near upper limit
      mockPrisma.qualityCheckSample.findMany.mockResolvedValue([
        { planItemId: 'item-1', measuredValue: new Prisma.Decimal(2.42), qualityCheck: { checkedAt: new Date() } },
        { planItemId: 'item-1', measuredValue: new Prisma.Decimal(2.59), qualityCheck: { checkedAt: new Date() } },
        { planItemId: 'item-1', measuredValue: new Prisma.Decimal(2.39), qualityCheck: { checkedAt: new Date() } },
        { planItemId: 'item-1', measuredValue: new Prisma.Decimal(2.58), qualityCheck: { checkedAt: new Date() } },
      ]);

      const result = await service.calculateCpk({ runId: 'run-1' });
      expect(result.metrics).toHaveLength(1);
      const metric = result.metrics[0];
      expect(metric.status).toBe('INCAPABLE');
      expect(metric.cpk).toBeLessThan(1.0);
      expect(result.overallStatus).toBe('INCAPABLE');
    });

    it('should handle zero variance correctly when identical samples are in tolerance', async () => {
      mockPrisma.inspectionPlanItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          parameterName: 'Wall Thickness',
          measurementType: 'VARIABLE',
          targetValue: new Prisma.Decimal(2.5),
          lowerTolerance: new Prisma.Decimal(2.3),
          upperTolerance: new Prisma.Decimal(2.7),
        },
      ]);
      mockPrisma.qualityCheckSample.findMany.mockResolvedValue([
        { planItemId: 'item-1', measuredValue: new Prisma.Decimal(2.5), qualityCheck: { checkedAt: new Date() } },
        { planItemId: 'item-1', measuredValue: new Prisma.Decimal(2.5), qualityCheck: { checkedAt: new Date() } },
      ]);

      const result = await service.calculateCpk({ runId: 'run-1' });
      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0].status).toBe('CAPABLE');
      expect(result.metrics[0].cpk).toBe(99.99);
    });
  });
});
