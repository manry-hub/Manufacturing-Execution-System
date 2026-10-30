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
        findMany: vi.fn(),
      },
      packagingUnit: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
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

  describe('getCartonGenealogy', () => {
    it('should throw NotFoundException if carton barcode does not exist', async () => {
      mockPrisma.packagingUnit.findUnique.mockResolvedValue(null);

      await expect(service.getCartonGenealogy('PKG-NONEXISTENT')).rejects.toThrow(NotFoundException);
    });

    it('should trace backward from carton barcode to run and raw materials', async () => {
      mockPrisma.packagingUnit.findUnique.mockResolvedValue({
        id: 'u-1',
        barcode: 'PKG-CARTON-101',
        partCount: 50,
        palletId: 'PAL-01',
        packedAt: new Date(),
        packager: { id: 'usr-1', username: 'Operator-A' },
        run: {
          id: 'run-10',
          status: 'RUNNING',
          totalShots: 200,
          goodQuantity: 390,
          rejectQuantity: 10,
          productionOrder: {
            orderNumber: 'WO-10',
            product: { partNumber: 'P-100', name: 'Door Trim' },
          },
          machine: { code: 'IMM-02', name: 'Machine 2' },
          mold: { code: 'M-2', cavityCount: 2 },
          consumptions: [
            {
              id: 'c-1',
              materialLot: {
                id: 'lot-99',
                lotNumber: 'LOT-PP-99',
                supplierLot: 'SUP-HEAT-44',
                status: 'AVAILABLE',
                material: { code: 'PP-01', name: 'Polypro', category: 'BASE_RESIN' },
              },
              loadedBy: { username: 'Handler-1' },
              quantityKg: new Prisma.Decimal(25),
              loadedAt: new Date(),
            },
          ],
        },
      });

      const res = await service.getCartonGenealogy('PKG-CARTON-101');

      expect(res.carton.barcode).toBe('PKG-CARTON-101');
      expect(res.run.orderNumber).toBe('WO-10');
      expect(res.machine.code).toBe('IMM-02');
      expect(res.rawMaterials).toHaveLength(1);
      expect(res.rawMaterials[0].lotNumber).toBe('LOT-PP-99');
      expect(res.rawMaterials[0].supplierLot).toBe('SUP-HEAT-44');
    });
  });

  describe('quarantineLot', () => {
    it('should set lot status to QUARANTINE and calculate containment blast radius', async () => {
      mockPrisma.materialLot.findUnique.mockResolvedValue({
        id: 'lot-bad',
        lotNumber: 'LOT-DEFECT-1',
        remainingQtyKg: new Prisma.Decimal(40),
        material: { name: 'ABS Polymer' },
        consumptions: [
          {
            runId: 'run-1',
            run: {
              productionOrder: { orderNumber: 'WO-101' },
              packagingUnits: [
                { id: 'c-1', barcode: 'PKG-1', partCount: 50 },
                { id: 'c-2', barcode: 'PKG-2', partCount: 50 },
              ],
            },
          },
        ],
      });

      mockPrisma.materialLot.update.mockResolvedValue({
        id: 'lot-bad',
        lotNumber: 'LOT-DEFECT-1',
        status: 'QUARANTINE',
        remainingQtyKg: new Prisma.Decimal(40),
      });

      const res = await service.quarantineLot('lot-bad', 'Polymer melt flow index out of spec');

      expect(res.lot.status).toBe('QUARANTINE');
      expect(res.blastRadius.affectedRunsCount).toBe(1);
      expect(res.blastRadius.affectedCartonsCount).toBe(2);
      expect(res.blastRadius.totalPartsQuarantined).toBe(100);
      expect(res.blastRadius.reason).toBe('Polymer melt flow index out of spec');
    });
  });

  describe('getHopperLevels', () => {
    it('should calculate estimated residual kg and flag low resin status', async () => {
      mockPrisma.productionRun.findMany.mockResolvedValue([
        {
          id: 'run-active',
          totalShots: 200,
          status: 'RUNNING',
          machine: { id: 'm-1', code: 'IMM-01', name: 'Machine 1' },
          mold: { code: 'M-1', cavityCount: 2 },
          productionOrder: { product: { name: 'Bracket' } },
          consumptions: [
            {
              quantityKg: new Prisma.Decimal(35),
              loadedAt: new Date(),
              materialLot: {
                lotNumber: 'LOT-1',
                material: { name: 'Resin A', category: 'BASE_RESIN' },
              },
            },
          ],
        },
      ]);

      const res = await service.getHopperLevels();

      expect(res).toHaveLength(1);
      expect(res[0].totalLoadedKg).toBe(35);
      // 200 shots * 2 cav * 0.08 kg = 32 kg consumed
      expect(res[0].estimatedConsumedKg).toBe(32);
      // 35 - 32 = 3 kg remaining -> isLowResin: true (< 10kg)
      expect(res[0].currentHopperKg).toBe(3);
      expect(res[0].isLowResin).toBe(true);
    });
  });
});
