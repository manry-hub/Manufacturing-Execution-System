import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SchedulingService } from './scheduling.service.js';
import type { PrismaService } from '../../database/prisma.service.js';

describe('SchedulingService', () => {
  let service: SchedulingService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      machine: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      productionOrder: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      mold: {
        findUnique: vi.fn(),
      },
      moldChangeover: {
        findMany: vi.fn(),
        upsert: vi.fn(),
      },
    };

    service = new SchedulingService(mockPrisma as PrismaService);
  });

  describe('getTimeline', () => {
    it('should calculate mold changeover blocks between adjacent orders with different molds', async () => {
      const now = new Date();
      const mockMachines = [
        { id: 'm-1', code: 'IMM-01', name: 'Battenfeld 150T', clampingTonnage: 150, currentState: { normalizedStatus: 'IDLE' } },
      ];

      const startOrder1 = new Date(now.getTime());
      const endOrder1 = new Date(now.getTime() + 4 * 3600 * 1000);
      const startOrder2 = new Date(now.getTime() + 5 * 3600 * 1000);
      const endOrder2 = new Date(now.getTime() + 9 * 3600 * 1000);

      const mockOrders = [
        {
          id: 'po-1',
          orderNumber: 'WO-001',
          assignedMachineId: 'm-1',
          assignedMoldId: 'mold-trim',
          assignedMold: { code: 'MOLD-TRIM-4C' },
          product: { name: 'Door Trim' },
          status: 'SCHEDULED',
          priority: 3,
          targetQuantity: 1000,
          plannedStartTime: startOrder1,
          plannedEndTime: endOrder1,
          runs: [],
        },
        {
          id: 'po-2',
          orderNumber: 'WO-002',
          assignedMachineId: 'm-1',
          assignedMoldId: 'mold-duct',
          assignedMold: { code: 'MOLD-DUCT-2C' },
          product: { name: 'Air Duct' },
          status: 'SCHEDULED',
          priority: 2,
          targetQuantity: 2000,
          plannedStartTime: startOrder2,
          plannedEndTime: endOrder2,
          runs: [],
        },
      ];

      const mockChangeovers = [
        { fromMoldId: 'mold-trim', toMoldId: 'mold-duct', setupMinutes: 30, purgeMinutes: 15 },
      ];

      mockPrisma.machine.findMany.mockResolvedValue(mockMachines);
      mockPrisma.productionOrder.findMany.mockResolvedValue(mockOrders);
      mockPrisma.moldChangeover.findMany.mockResolvedValue(mockChangeovers);

      const result = await service.getTimeline();

      expect(result.machines).toHaveLength(1);
      const machineBlocks = result.machines[0].blocks;
      // Should have: order 1, changeover block, order 2
      expect(machineBlocks).toHaveLength(3);
      expect(machineBlocks[0].blockType).toBe('PRODUCTION_ORDER');
      expect(machineBlocks[1].blockType).toBe('MOLD_CHANGEOVER');
      expect(machineBlocks[1].durationMinutes).toBe(45); // 30 + 15
      expect(machineBlocks[2].blockType).toBe('PRODUCTION_ORDER');
      expect(result.summary.totalChangeovers).toBe(1);
    });

    it('should detect TONNAGE_MISMATCH when mold required tonnage exceeds machine capability', async () => {
      const now = new Date();
      const mockMachines = [
        { id: 'm-1', code: 'IMM-01', name: 'Battenfeld 150T', clampingTonnage: 150, currentState: { normalizedStatus: 'IDLE' } },
      ];

      const mockOrders = [
        {
          id: 'po-bumper',
          orderNumber: 'WO-BUMP',
          assignedMachineId: 'm-1',
          assignedMoldId: 'mold-bump',
          assignedMold: { code: 'MOLD-BUMP-2C' }, // Requires 500T
          product: { name: 'Front Bumper' },
          status: 'SCHEDULED',
          priority: 1,
          targetQuantity: 500,
          plannedStartTime: now,
          plannedEndTime: new Date(now.getTime() + 6 * 3600 * 1000),
          runs: [],
        },
      ];

      mockPrisma.machine.findMany.mockResolvedValue(mockMachines);
      mockPrisma.productionOrder.findMany.mockResolvedValue(mockOrders);
      mockPrisma.moldChangeover.findMany.mockResolvedValue([]);

      const result = await service.getTimeline();
      const block = result.machines[0].blocks[0];

      expect(block.conflicts).toBeDefined();
      expect(block.conflicts![0].type).toBe('TONNAGE_MISMATCH');
      expect(block.conflicts![0].severity).toBe('CRITICAL');
      expect(result.summary.activeConflictsCount).toBe(1);
    });

    it('should detect TOOLING_COLLISION when same mold is scheduled concurrently on different machines', async () => {
      const now = new Date();
      const start = new Date(now.getTime());
      const end = new Date(now.getTime() + 5 * 3600 * 1000);

      const mockMachines = [
        { id: 'm-1', code: 'IMM-01', name: 'Battenfeld 150T', clampingTonnage: 200, currentState: { normalizedStatus: 'IDLE' } },
        { id: 'm-2', code: 'IMM-02', name: 'Battenfeld 150T', clampingTonnage: 200, currentState: { normalizedStatus: 'IDLE' } },
      ];

      const mockOrders = [
        {
          id: 'po-1',
          orderNumber: 'WO-COLLISION-1',
          assignedMachineId: 'm-1',
          assignedMoldId: 'mold-duct',
          assignedMold: { code: 'MOLD-DUCT-2C' },
          product: { name: 'Air Duct' },
          status: 'SCHEDULED',
          plannedStartTime: start,
          plannedEndTime: end,
          runs: [],
        },
        {
          id: 'po-2',
          orderNumber: 'WO-COLLISION-2',
          assignedMachineId: 'm-2',
          assignedMoldId: 'mold-duct', // Same mold concurrently on IMM-02!
          assignedMold: { code: 'MOLD-DUCT-2C' },
          product: { name: 'Air Duct' },
          status: 'SCHEDULED',
          plannedStartTime: new Date(start.getTime() + 1 * 3600 * 1000), // Overlaps
          plannedEndTime: new Date(end.getTime() + 2 * 3600 * 1000),
          runs: [],
        },
      ];

      mockPrisma.machine.findMany.mockResolvedValue(mockMachines);
      mockPrisma.productionOrder.findMany.mockResolvedValue(mockOrders);
      mockPrisma.moldChangeover.findMany.mockResolvedValue([]);

      const result = await service.getTimeline();

      const block1 = result.machines[0].blocks[0];
      const block2 = result.machines[1].blocks[0];

      expect(block1.conflicts?.some((c) => c.type === 'TOOLING_COLLISION')).toBe(true);
      expect(block2.conflicts?.some((c) => c.type === 'TOOLING_COLLISION')).toBe(true);
    });
  });

  describe('scheduleOrder', () => {
    it('should calculate planned runtime duration based on product cycle time and mold cavities', async () => {
      const orderId = 'po-test-1';
      const startTime = new Date('2026-10-28T08:00:00Z');

      const mockOrder = {
        id: orderId,
        orderNumber: 'WO-CALC-1',
        productId: 'prod-1',
        targetQuantity: 1000,
        product: { standardCycleTime: 20.0 },
      };

      const mockMachine = { id: 'm-1', code: 'IMM-01' };
      const mockMold = {
        id: 'mold-1',
        cavityCount: 2,
        compatibilities: [{ productId: 'prod-1', idealCycleTime: 18.0 }],
      };

      mockPrisma.productionOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.machine.findUnique.mockResolvedValue(mockMachine);
      mockPrisma.mold.findUnique.mockResolvedValue(mockMold);
      mockPrisma.productionOrder.update.mockResolvedValue({
        ...mockOrder,
        assignedMachineId: 'm-1',
        assignedMoldId: 'mold-1',
        status: 'SCHEDULED',
      });

      await service.scheduleOrder(orderId, {
        machineId: 'm-1',
        moldId: 'mold-1',
        plannedStartTime: startTime.toISOString(),
      });

      // Target = 1000, Cavities = 2 => Total shots = (1000 * 1.02) / 2 = 510 shots.
      // Duration = 510 * 18s = 9180s = 2.55 hours
      const updateCall = mockPrisma.productionOrder.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe('SCHEDULED');
      expect(updateCall.data.assignedMachineId).toBe('m-1');
      expect(updateCall.data.assignedMoldId).toBe('mold-1');
      expect(updateCall.data.plannedEndTime.getTime()).toBeGreaterThan(startTime.getTime());
    });
  });

  describe('getBacklog', () => {
    it('should query orders in DRAFT state or unassigned machine', async () => {
      const mockBacklog = [{ id: 'po-draft', orderNumber: 'WO-DRAFT-1', status: 'DRAFT' }];
      mockPrisma.productionOrder.findMany.mockResolvedValue(mockBacklog);

      const res = await service.getBacklog();
      expect(res).toEqual(mockBacklog);
      expect(mockPrisma.productionOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ status: 'DRAFT' }, { assignedMachineId: null }],
          },
        }),
      );
    });
  });

  describe('rescheduleOrder', () => {
    it('should shift planned start and end times preserving order duration', async () => {
      const orderId = 'po-resched-1';
      const origStart = new Date('2026-10-28T08:00:00Z');
      const origEnd = new Date('2026-10-28T12:00:00Z'); // 4 hours duration
      const newStart = new Date('2026-10-28T10:00:00Z');

      const mockOrder = {
        id: orderId,
        orderNumber: 'WO-RESCHED-1',
        status: 'SCHEDULED',
        assignedMachineId: 'm-1',
        assignedMoldId: 'mold-1',
        plannedStartTime: origStart,
        plannedEndTime: origEnd,
      };

      mockPrisma.productionOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.productionOrder.update.mockResolvedValue({
        ...mockOrder,
        plannedStartTime: newStart,
        plannedEndTime: new Date('2026-10-28T14:00:00Z'),
      });

      await service.rescheduleOrder(orderId, {
        plannedStartTime: newStart.toISOString(),
      });

      const updateCall = mockPrisma.productionOrder.update.mock.calls[0][0];
      expect(updateCall.data.plannedStartTime.toISOString()).toBe(newStart.toISOString());
      // Duration of 4 hours preserved: 10:00 + 4 hours = 14:00
      expect(updateCall.data.plannedEndTime.toISOString()).toBe(new Date('2026-10-28T14:00:00Z').toISOString());
    });

    it('should relocate order to a different machine', async () => {
      const orderId = 'po-resched-2';
      const origStart = new Date('2026-10-28T08:00:00Z');
      const origEnd = new Date('2026-10-28T10:00:00Z');

      const mockOrder = {
        id: orderId,
        orderNumber: 'WO-RESCHED-2',
        status: 'SCHEDULED',
        assignedMachineId: 'm-1',
        assignedMoldId: 'mold-1',
        plannedStartTime: origStart,
        plannedEndTime: origEnd,
      };

      mockPrisma.productionOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.productionOrder.update.mockResolvedValue({
        ...mockOrder,
        assignedMachineId: 'm-2',
      });

      await service.rescheduleOrder(orderId, {
        machineId: 'm-2',
        plannedStartTime: origStart.toISOString(),
      });

      const updateCall = mockPrisma.productionOrder.update.mock.calls[0][0];
      expect(updateCall.data.assignedMachineId).toBe('m-2');
    });

    it('should reject rescheduling for orders already IN_PROGRESS or COMPLETED', async () => {
      const mockOrder = {
        id: 'po-active',
        orderNumber: 'WO-ACTIVE',
        status: 'IN_PROGRESS',
        plannedStartTime: new Date(),
      };

      mockPrisma.productionOrder.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.rescheduleOrder('po-active', {
          plannedStartTime: new Date().toISOString(),
        }),
      ).rejects.toThrow(/Cannot reschedule order WO-ACTIVE because it is already IN_PROGRESS/);
    });
  });
});
