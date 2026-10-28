import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MaterialsService } from './materials.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('MaterialsService', () => {
  let service: MaterialsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      material: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      materialLot: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      productionRun: {
        findUnique: vi.fn(),
      },
      runMaterialConsumption: {
        create: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    service = new MaterialsService(mockPrisma as unknown as PrismaService);
  });

  describe('createMaterial', () => {
    it('should throw BadRequestException if material code already exists', async () => {
      mockPrisma.material.findUnique.mockResolvedValue({ id: 'mat-1', code: 'RES-PP' });

      await expect(
        service.createMaterial({ code: 'RES-PP', name: 'Polypropylene', category: 'BASE_RESIN' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create material successfully', async () => {
      mockPrisma.material.findUnique.mockResolvedValue(null);
      mockPrisma.material.create.mockResolvedValue({
        id: 'mat-1',
        code: 'RES-PP',
        name: 'Polypropylene',
        category: 'BASE_RESIN',
        densityGcm3: new Prisma.Decimal(0.905),
      });

      const res = await service.createMaterial({
        code: 'RES-PP',
        name: 'Polypropylene',
        category: 'BASE_RESIN',
        densityGcm3: 0.905,
      });

      expect(res.code).toBe('RES-PP');
      expect(mockPrisma.material.create).toHaveBeenCalled();
    });
  });

  describe('loadHopper', () => {
    it('should throw NotFoundException if run does not exist', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue(null);

      await expect(
        service.loadHopper(
          { runId: 'run-999', materialLotId: 'lot-1', quantityKg: 50 },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if lot is not AVAILABLE', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue({ id: 'run-1' });
      mockPrisma.materialLot.findUnique.mockResolvedValue({
        id: 'lot-1',
        lotNumber: 'LOT-01',
        status: 'QUARANTINE',
        remainingQtyKg: new Prisma.Decimal(100),
      });

      await expect(
        service.loadHopper(
          { runId: 'run-1', materialLotId: 'lot-1', quantityKg: 50 },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if load quantity exceeds remaining', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue({ id: 'run-1' });
      mockPrisma.materialLot.findUnique.mockResolvedValue({
        id: 'lot-1',
        lotNumber: 'LOT-01',
        status: 'AVAILABLE',
        remainingQtyKg: new Prisma.Decimal(30),
      });

      await expect(
        service.loadHopper(
          { runId: 'run-1', materialLotId: 'lot-1', quantityKg: 50 },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully record consumption and decrement lot quantity', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue({ id: 'run-1' });
      mockPrisma.materialLot.findUnique.mockResolvedValue({
        id: 'lot-1',
        lotNumber: 'LOT-01',
        status: 'AVAILABLE',
        remainingQtyKg: new Prisma.Decimal(100),
      });
      mockPrisma.runMaterialConsumption.create.mockResolvedValue({
        id: 'rmc-1',
        runId: 'run-1',
        quantityKg: new Prisma.Decimal(50),
      });

      const res = await service.loadHopper(
        { runId: 'run-1', materialLotId: 'lot-1', quantityKg: 50 },
        'user-1',
      );

      expect(res.id).toBe('rmc-1');
      expect(mockPrisma.materialLot.update).toHaveBeenCalledWith({
        where: { id: 'lot-1' },
        data: {
          remainingQtyKg: new Prisma.Decimal(50),
          status: 'AVAILABLE',
        },
      });
    });
  });
});
