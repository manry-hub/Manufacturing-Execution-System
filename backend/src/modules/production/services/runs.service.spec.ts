import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RunsService } from './runs.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { TelemetryIngestionService } from '../../telemetry/telemetry.service.js';
import { BadRequestException } from '@nestjs/common';
import { Subject } from 'rxjs';

describe('RunsService', () => {
  let service: RunsService;
  let mockPrisma: any;
  let mockTelemetryService: any;
  let mockMaintenanceService: any;
  let telemetryStream$: Subject<any>;

  beforeEach(() => {
    telemetryStream$ = new Subject();
    mockTelemetryService = {
      telemetryStream$,
    };
    mockMaintenanceService = {
      checkMoldPmThreshold: vi.fn().mockResolvedValue(undefined),
    };

    mockPrisma = {
      productionOrder: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      machine: {
        findFirst: vi.fn(),
      },
      mold: {
        findFirst: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'mold-1', code: 'MOLD-1', totalShots: BigInt(100) }),
      },
      moldProductCompatibility: {
        findFirst: vi.fn(),
      },
      productionRun: {
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      machineCurrentState: {
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    service = new RunsService(
      mockPrisma as unknown as PrismaService,
      mockTelemetryService as unknown as TelemetryIngestionService,
      mockMaintenanceService as any,
    );
  });

  describe('startRun', () => {
    it('should throw BadRequestException if order is still in DRAFT status', async () => {
      mockPrisma.productionOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: 'DRAFT',
      });

      await expect(
        service.startRun({
          productionOrderId: 'po-1',
          machineId: 'IMM-01',
          moldId: 'MOLD-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if machine already has an active run', async () => {
      mockPrisma.productionOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: 'RELEASED',
        product: { partNumber: 'PRD-01' },
      });
      mockPrisma.machine.findFirst.mockResolvedValue({
        id: 'm-1',
        code: 'IMM-01',
        currentState: { activeRunId: 'existing-run-id' },
      });

      await expect(
        service.startRun({
          productionOrderId: 'po-1',
          machineId: 'IMM-01',
          moldId: 'MOLD-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if mold is not compatible with order product', async () => {
      mockPrisma.productionOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: 'RELEASED',
        productId: 'prod-1',
        product: { partNumber: 'PRD-01' },
      });
      mockPrisma.machine.findFirst.mockResolvedValue({
        id: 'm-1',
        code: 'IMM-01',
        currentState: { activeRunId: null },
      });
      mockPrisma.mold.findFirst.mockResolvedValue({
        id: 'mold-1',
        code: 'MOLD-INCOMPATIBLE',
      });
      mockPrisma.moldProductCompatibility.findFirst.mockResolvedValue(null);

      await expect(
        service.startRun({
          productionOrderId: 'po-1',
          machineId: 'IMM-01',
          moldId: 'MOLD-INCOMPATIBLE',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully start run, bind to machine, and update order to IN_PROGRESS', async () => {
      mockPrisma.productionOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: 'RELEASED',
        productId: 'prod-1',
        product: { partNumber: 'PRD-01' },
      });
      mockPrisma.machine.findFirst.mockResolvedValue({
        id: 'm-1',
        code: 'IMM-01',
        currentState: { activeRunId: null },
      });
      mockPrisma.mold.findFirst.mockResolvedValue({
        id: 'mold-1',
        code: 'MOLD-01',
      });
      mockPrisma.moldProductCompatibility.findFirst.mockResolvedValue({
        id: 'comp-1',
        idealCycleTime: 20.0,
      });

      mockPrisma.productionRun.create.mockResolvedValue({
        id: 'run-new',
        status: 'ACTIVE',
      });

      const result = await service.startRun({
        productionOrderId: 'po-1',
        machineId: 'IMM-01',
        moldId: 'MOLD-01',
      });

      expect(result.id).toBe('run-new');
      expect(mockPrisma.productionRun.create).toHaveBeenCalled();
      expect(mockPrisma.machineCurrentState.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { machineId: 'm-1' },
          data: { activeRunId: 'run-new' },
        }),
      );
      expect(mockPrisma.productionOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-1' },
          data: expect.objectContaining({ status: 'IN_PROGRESS' }),
        }),
      );
    });
  });

  describe('recordScrap', () => {
    it('should increment reject quantity and recompute good quantity', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue({
        id: 'run-1',
        totalShots: 100,
        rejectQuantity: 5,
        mold: { cavityCount: 2 }, // 100 * 2 = 200 total parts produced
        productionOrder: { id: 'po-1' },
      });

      mockPrisma.productionRun.update.mockResolvedValue({
        id: 'run-1',
        rejectQuantity: 15,
        goodQuantity: 185, // 200 - 15 = 185
      });

      const updated = await service.recordScrap('run-1', {
        rejectQuantity: 10,
        defectCode: 'DEF-FLASH',
      });

      expect(mockPrisma.productionRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            rejectQuantity: 15,
            goodQuantity: 185,
          },
        }),
      );
      expect(updated.rejectQuantity).toBe(15);
      expect(updated.goodQuantity).toBe(185);
    });
  });

  describe('handleCycleCompleted', () => {
    it('should increment totalShots and goodQuantity on active run', async () => {
      mockPrisma.productionRun.findFirst.mockResolvedValue({
        id: 'run-1',
        moldId: 'mold-1',
        totalShots: 10,
        rejectQuantity: 2,
        mold: { cavityCount: 2 },
      });

      await service.handleCycleCompleted('m-1');

      expect(mockPrisma.productionRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run-1' },
          data: {
            totalShots: { increment: 1 },
            goodQuantity: { increment: 2 },
          },
        }),
      );
      expect(mockPrisma.mold.update).toHaveBeenCalled();
    });
  });
});
