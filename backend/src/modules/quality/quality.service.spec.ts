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
});
