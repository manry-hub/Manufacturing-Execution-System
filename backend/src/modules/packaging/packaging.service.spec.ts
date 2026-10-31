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
      expect(res.discrepancyStatus).toBe('BALANCED');
      expect(res.discrepancyAlert).toBe(false);
      expect(res.pallets).toHaveLength(1);
      expect(res.pallets[0].palletId).toBe('PAL-1');
      expect(res.pallets[0].totalParts).toBe(200);
      expect(res.pallets[0].cartonCount).toBe(2);
    });

    it('should flag DEFICIT and discrepancyAlert if unpacked variance exceeds 2% tolerance threshold', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue({
        id: 'run-deficit',
        goodQuantity: 1000,
        rejectQuantity: 20,
        totalShots: 510,
        productionOrder: {
          orderNumber: 'WO-DEFICIT',
          targetQuantity: 1000,
          product: { partNumber: 'P-1', name: 'Widget' },
        },
        machine: { code: 'IMM-01', name: 'Machine 1' },
        mold: { code: 'M-1', cavityCount: 2 },
        packagingUnits: [
          // 800 packed vs 1000 produced = 200 variance (20% deficit > 2% tolerance)
          { id: 'p1', barcode: 'B1', partCount: 800, palletId: 'PAL-1', packedAt: new Date() },
        ],
      });

      const res = await service.reconcileRun('run-deficit');

      expect(res.discrepancyStatus).toBe('DEFICIT');
      expect(res.discrepancyAlert).toBe(true);
      expect(res.varianceUnpacked).toBe(200);
      expect(res.variancePercentage).toBe(20);
    });
  });

  describe('dispatchWmsWebhook', () => {
    it('should dispatch signed HMAC SHA-256 payload to WMS webhook endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await service.dispatchWmsWebhook({
        cartonBarcode: 'PKG-2026-UNIT-01',
        orderNumber: 'WO-2026-001',
        partNumber: 'PRD-AUTO-BUMPER',
        quantityPacked: 50,
      });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe('http://localhost:8000/api/v1/webhooks/mes');
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers['X-MES-Signature']).toBeDefined();
      expect(callArgs[1].headers['X-MES-Event-Id']).toMatch(/^EVT-/);

      const sentBody = JSON.parse(callArgs[1].body);
      expect(sentBody.eventType).toBe('packaging.unit_created');
      expect(sentBody.data.cartonBarcode).toBe('PKG-2026-UNIT-01');
      expect(sentBody.data.partNumber).toBe('PRD-AUTO-BUMPER');
      expect(sentBody.data.quantityPacked).toBe(50);

      vi.unstubAllGlobals();
    });
  });
});
