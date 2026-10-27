import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrdersService } from './orders.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      product: {
        findUnique: vi.fn(),
      },
      productionOrder: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new OrdersService(mockPrisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('should throw NotFoundException if product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          orderNumber: 'PO-001',
          productId: 'non-existent',
          targetQuantity: 100,
          plannedStartTime: new Date().toISOString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if orderNumber already exists', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p-1' });
      mockPrisma.productionOrder.findUnique.mockResolvedValue({ id: 'po-1', orderNumber: 'PO-001' });

      await expect(
        service.create({
          orderNumber: 'PO-001',
          productId: 'p-1',
          targetQuantity: 100,
          plannedStartTime: new Date().toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create order in DRAFT status', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p-1' });
      mockPrisma.productionOrder.findUnique.mockResolvedValue(null);
      mockPrisma.productionOrder.create.mockResolvedValue({
        id: 'po-1',
        orderNumber: 'PO-NEW',
        status: 'DRAFT',
      });

      const order = await service.create({
        orderNumber: 'PO-NEW',
        productId: 'p-1',
        targetQuantity: 250,
        plannedStartTime: new Date().toISOString(),
      });

      expect(order.status).toBe('DRAFT');
      expect(mockPrisma.productionOrder.create).toHaveBeenCalled();
    });
  });

  describe('release', () => {
    it('should transition DRAFT order to RELEASED', async () => {
      mockPrisma.productionOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: 'DRAFT',
      });
      mockPrisma.productionOrder.update.mockResolvedValue({
        id: 'po-1',
        status: 'RELEASED',
      });

      const updated = await service.release('po-1');
      expect(updated.status).toBe('RELEASED');
    });

    it('should throw BadRequestException if order is not in DRAFT status', async () => {
      mockPrisma.productionOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: 'IN_PROGRESS',
      });

      await expect(service.release('po-1')).rejects.toThrow(BadRequestException);
    });
  });
});
