import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PpssInboundService } from './ppss-inbound.service.js';
import type { PrismaService } from '../../../database/prisma.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PpssInboundService', () => {
  let service: PpssInboundService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      product: {
        findUnique: vi.fn(),
      },
      productionOrder: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      orderOperationStep: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      machine: {
        findMany: vi.fn(),
      },
      mold: {
        findMany: vi.fn(),
      },
      moldChangeover: {
        findMany: vi.fn(),
      },
    };

    service = new PpssInboundService(mockPrisma as PrismaService);
  });

  describe('ingestOrder', () => {
    it('should successfully ingest a new order from PPSS into MES Backlog', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        partNumber: 'PART-BUMP-001',
        name: 'Front Bumper Fascia',
      });
      mockPrisma.productionOrder.findUnique.mockResolvedValue(null);
      mockPrisma.productionOrder.create.mockImplementation((args: any) =>
        Promise.resolve({
          id: 'po-new',
          ...args.data,
          product: { partNumber: 'PART-BUMP-001', name: 'Front Bumper Fascia' },
        }),
      );

      const result = await service.ingestOrder({
        externalOrderRef: 'PPSS-PO-999',
        orderNumber: 'WO-2026-999',
        productPartNumber: 'PART-BUMP-001',
        targetQuantity: 3000,
        dueDate: '2026-11-10T12:00:00Z',
        priority: 2,
        suggestedMachineCode: 'IMM-07',
      });

      expect(result.externalOrderRef).toBe('PPSS-PO-999');
      expect(result.status).toBe('DRAFT');
      expect(result.externalSyncStatus).toBe('SYNCED_FROM_PPSS');
      expect(mockPrisma.productionOrder.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product part number is not recognized', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.ingestOrder({
          externalOrderRef: 'PPSS-PO-404',
          orderNumber: 'WO-2026-404',
          productPartNumber: 'NON-EXISTENT-PART',
          targetQuantity: 1000,
          dueDate: '2026-11-10T12:00:00Z',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if externalOrderRef already exists in MES', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1' });
      mockPrisma.productionOrder.findUnique.mockResolvedValue({
        id: 'po-dup',
        orderNumber: 'WO-EXISTING',
        externalOrderRef: 'PPSS-PO-DUPLICATE',
      });

      await expect(
        service.ingestOrder({
          externalOrderRef: 'PPSS-PO-DUPLICATE',
          orderNumber: 'WO-2026-NEW',
          productPartNumber: 'PART-BUMP-001',
          targetQuantity: 1000,
          dueDate: '2026-11-10T12:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateOrder - Immutability Guards', () => {
    it('should allow updating an order if status is still DRAFT or SCHEDULED', async () => {
      mockPrisma.productionOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        orderNumber: 'WO-001',
        externalOrderRef: 'PPSS-PO-1',
        status: 'DRAFT',
        targetQuantity: 1000,
      });
      mockPrisma.productionOrder.update.mockResolvedValue({
        id: 'po-1',
        targetQuantity: 1500,
        status: 'DRAFT',
      });
      mockPrisma.orderOperationStep.findFirst.mockResolvedValue({ id: 'step-1' });
      mockPrisma.orderOperationStep.update.mockResolvedValue({ id: 'step-1' });

      const updated = await service.updateOrder('PPSS-PO-1', { targetQuantity: 1500 });
      expect(updated.targetQuantity).toBe(1500);
      expect(mockPrisma.productionOrder.update).toHaveBeenCalled();
    });

    it('should reject update if order is already RELEASED or IN_PROGRESS on shop floor', async () => {
      mockPrisma.productionOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        orderNumber: 'WO-001',
        externalOrderRef: 'PPSS-PO-1',
        status: 'IN_PROGRESS',
      });

      await expect(
        service.updateOrder('PPSS-PO-1', { targetQuantity: 2000 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order in DRAFT status and set status to CANCELLED', async () => {
      mockPrisma.productionOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        orderNumber: 'WO-001',
        status: 'DRAFT',
      });
      mockPrisma.productionOrder.update.mockResolvedValue({
        id: 'po-1',
        status: 'CANCELLED',
      });

      const res = await service.cancelOrder('PPSS-PO-1');
      expect(res.status).toBe('CANCELLED');
    });

    it('should reject cancellation if order is already IN_PROGRESS', async () => {
      mockPrisma.productionOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        orderNumber: 'WO-001',
        status: 'IN_PROGRESS',
      });

      await expect(service.cancelOrder('PPSS-PO-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPlantCapabilities', () => {
    it('should return plant machines, molds, and changeover matrix for PPSS planning', async () => {
      mockPrisma.machine.findMany.mockResolvedValue([
        { id: 'm-1', code: 'IMM-01', clampingTonnage: 150 },
      ]);
      mockPrisma.mold.findMany.mockResolvedValue([
        { id: 'mold-1', code: 'MOLD-001', cavityCount: 4, compatibilities: [] },
      ]);
      mockPrisma.moldChangeover.findMany.mockResolvedValue([
        { fromMold: { code: 'M1' }, toMold: { code: 'M2' }, setupMinutes: 45, purgeMinutes: 15 },
      ]);

      const caps = await service.getPlantCapabilities();
      expect(caps.machineCount).toBe(1);
      expect(caps.moldCount).toBe(1);
      expect(caps.changeoverMatrix).toHaveLength(1);
    });
  });
});
