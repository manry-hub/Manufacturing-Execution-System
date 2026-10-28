import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PackagingService } from './packaging.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { NotFoundException } from '@nestjs/common';

describe('PackagingService', () => {
  let service: PackagingService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      productionRun: {
        findUnique: vi.fn(),
      },
      productionOrder: {
        update: vi.fn(),
      },
      packagingUnit: {
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      orderOperationStep: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    service = new PackagingService(mockPrisma as unknown as PrismaService);
  });

  describe('createPackagingUnit', () => {
    it('should throw NotFoundException if run does not exist', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue(null);

      await expect(
        service.createPackagingUnit(
          { runId: 'run-999', partCount: 50 },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create packaging unit and increment packed quantity on order', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue({
        id: 'run-1',
        productionOrderId: 'po-1',
        productionOrder: { id: 'po-1', orderNumber: 'WO-2026-001' },
      });
      mockPrisma.packagingUnit.findUnique.mockResolvedValue(null);
      mockPrisma.packagingUnit.create.mockResolvedValue({
        id: 'pkg-1',
        barcode: 'PKG-2026-001-A',
        partCount: 50,
      });
      mockPrisma.orderOperationStep.findFirst.mockResolvedValue({
        id: 'step-3',
        operationName: 'PACKAGING',
      });

      const res = await service.createPackagingUnit(
        { runId: 'run-1', partCount: 50, barcode: 'PKG-2026-001-A' },
        'user-1',
      );

      expect(res.id).toBe('pkg-1');
      expect(mockPrisma.productionOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: { packedQuantity: { increment: 50 } },
      });
      expect(mockPrisma.orderOperationStep.update).toHaveBeenCalled();
    });
  });

  describe('reconcileRun', () => {
    it('should reconcile produced vs packed quantities correctly', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue({
        id: 'run-1',
        goodQuantity: 200,
        rejectQuantity: 5,
        productionOrder: {
          orderNumber: 'WO-100',
          targetQuantity: 250,
          product: { partNumber: 'P-1', name: 'Widget' },
        },
        machine: { code: 'IMM-01', name: 'Machine 1' },
        mold: { code: 'M-1', cavityCount: 2 },
        packagingUnits: [
          { id: 'p1', barcode: 'B1', partCount: 100, palletId: 'PAL-1', packedAt: new Date() },
          { id: 'p2', barcode: 'B2', partCount: 100, palletId: 'PAL-1', packedAt: new Date() },
        ],
      });

      const res = await service.reconcileRun('run-1');

      expect(res.producedGoodQuantity).toBe(200);
      expect(res.packedQuantity).toBe(200);
      expect(res.varianceUnpacked).toBe(0);
      expect(res.isFullyPacked).toBe(true);
      expect(res.completionPercentage).toBe(80); // 200/250 = 80%
    });
  });
});
