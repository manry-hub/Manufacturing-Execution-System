import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MaintenanceService } from './maintenance.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { BadRequestException } from '@nestjs/common';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      mold: {
        findUnique: vi.fn(),
      },
      moldPmSchedule: {
        create: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
      maintenanceWorkOrder: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
      },
    };

    service = new MaintenanceService(mockPrisma as unknown as PrismaService);
  });

  describe('createWorkOrder', () => {
    it('should throw BadRequestException if order number already exists', async () => {
      mockPrisma.maintenanceWorkOrder.findUnique.mockResolvedValue({ id: 'wo-1', orderNumber: 'WO-100' });

      await expect(
        service.createWorkOrder({
          orderNumber: 'WO-100',
          workType: 'PREVENTIVE_SHOT',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create work order successfully', async () => {
      mockPrisma.maintenanceWorkOrder.findUnique.mockResolvedValue(null);
      mockPrisma.maintenanceWorkOrder.create.mockResolvedValue({
        id: 'wo-1',
        orderNumber: 'WO-100',
        workType: 'PREVENTIVE_SHOT',
        status: 'OPEN',
        triggerShots: BigInt(50000),
      });

      const res = await service.createWorkOrder({
        orderNumber: 'WO-100',
        workType: 'PREVENTIVE_SHOT',
        triggerShots: 50000,
      });

      expect(res.orderNumber).toBe('WO-100');
      expect(res.triggerShots).toBe('50000');
    });
  });

  describe('checkMoldPmThreshold', () => {
    it('should auto-create maintenance work order when interval shots threshold is reached', async () => {
      mockPrisma.moldPmSchedule.findMany.mockResolvedValue([
        {
          id: 'sched-1',
          moldId: 'mold-1',
          pmLevel: 'LEVEL_1_CLEAN',
          intervalShots: BigInt(25000),
          lastServicedShot: BigInt(0),
        },
      ]);
      mockPrisma.maintenanceWorkOrder.findFirst.mockResolvedValue(null); // No existing open work order
      mockPrisma.maintenanceWorkOrder.create.mockResolvedValue({
        id: 'wo-auto-1',
      });

      await service.checkMoldPmThreshold('mold-1', BigInt(25001));

      expect(mockPrisma.maintenanceWorkOrder.create).toHaveBeenCalled();
    });

    it('should not create duplicate work order if an open work order already exists', async () => {
      mockPrisma.moldPmSchedule.findMany.mockResolvedValue([
        {
          id: 'sched-1',
          moldId: 'mold-1',
          pmLevel: 'LEVEL_1_CLEAN',
          intervalShots: BigInt(25000),
          lastServicedShot: BigInt(0),
        },
      ]);
      mockPrisma.maintenanceWorkOrder.findFirst.mockResolvedValue({
        id: 'wo-existing',
        status: 'OPEN',
      });

      await service.checkMoldPmThreshold('mold-1', BigInt(25001));

      expect(mockPrisma.maintenanceWorkOrder.create).not.toHaveBeenCalled();
    });
  });
});
