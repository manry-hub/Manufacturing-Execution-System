import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlmInboundService } from './plm-inbound.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PlmInboundService', () => {
  let service: PlmInboundService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      product: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      mold: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      moldProductCompatibility: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      recipeMaster: {
        upsert: vi.fn(),
        findFirst: vi.fn(),
      },
    };

    service = new PlmInboundService(mockPrisma);
  });

  describe('syncRecipe', () => {
    const validDto = {
      recipeCode: 'RCP-BUMPER-001',
      productPartNumber: 'PRD-BUMPER',
      moldCode: 'MOLD-01',
      barrelTempZones: [200, 205, 210, 215, 220],
      injectionPressureBar: 140.0,
      holdingPressureBar: 95.0,
      holdingTimeSec: 6.5,
      coolingTimeSec: 12.0,
      cushionLimitMm: 4.5,
      clampingTonnage: 350,
      resinGrade: 'PP-IM-750',
    };

    it('should throw NotFoundException if product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.syncRecipe(validDto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if mold does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', partNumber: 'PRD-BUMPER' });
      mockPrisma.mold.findUnique.mockResolvedValue(null);

      await expect(service.syncRecipe(validDto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if barrel temperatures violate physical limits', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', partNumber: 'PRD-BUMPER' });
      mockPrisma.mold.findUnique.mockResolvedValue({ id: 'mold-1', code: 'MOLD-01' });
      mockPrisma.moldProductCompatibility.findUnique.mockResolvedValue({ id: 'comp-1' });

      const invalidDto = {
        ...validDto,
        barrelTempZones: [50, 205, 210, 215, 220], // 50 deg C is below 100 deg C limit
      };

      await expect(service.syncRecipe(invalidDto as any)).rejects.toThrow(BadRequestException);
    });

    it('should successfully upsert recipe and auto-register compatibility if missing', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', partNumber: 'PRD-BUMPER' });
      mockPrisma.mold.findUnique.mockResolvedValue({ id: 'mold-1', code: 'MOLD-01' });
      mockPrisma.moldProductCompatibility.findUnique.mockResolvedValue(null);
      mockPrisma.moldProductCompatibility.create.mockResolvedValue({ id: 'comp-new' });

      mockPrisma.recipeMaster.upsert.mockResolvedValue({
        id: 'rec-1',
        recipeCode: 'RCP-BUMPER-001',
        revision: 'REV-A',
        status: 'APPROVED',
        barrelTempZones: JSON.stringify([200, 205, 210, 215, 220]),
        injectionPressureBar: 140.0,
        clampingTonnage: 350,
        updatedAt: new Date(),
        product: { partNumber: 'PRD-BUMPER', name: 'Front Bumper' },
        mold: { code: 'MOLD-01', name: 'Bumper Mold', cavityCount: 2 },
      });

      const res = await service.syncRecipe(validDto as any);

      expect(res.success).toBe(true);
      expect(res.recipeCode).toBe('RCP-BUMPER-001');
      expect(mockPrisma.moldProductCompatibility.create).toHaveBeenCalled();
      expect(mockPrisma.recipeMaster.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recipeCode: 'RCP-BUMPER-001' },
        }),
      );
    });
  });

  describe('getRecipe', () => {
    it('should return approved recipe with parsed fields', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1', partNumber: 'PRD-BUMPER' });
      mockPrisma.mold.findFirst.mockResolvedValue({ id: 'mold-1', code: 'MOLD-01' });
      mockPrisma.recipeMaster.findFirst.mockResolvedValue({
        id: 'rec-1',
        recipeCode: 'RCP-BUMPER-001',
        barrelTempZones: JSON.stringify([200, 205, 210, 215, 220]),
        injectionPressureBar: '140.0',
        holdingPressureBar: '95.0',
        holdingTimeSec: '6.5',
        coolingTimeSec: '12.0',
        cushionLimitMm: '4.5',
        tempTolerance: '5.0',
        cushionToleranceMm: '0.5',
        masterbatchRatio: '2.0',
        regrindAllowedPct: '15.0',
        product: { partNumber: 'PRD-BUMPER' },
        mold: { code: 'MOLD-01' },
      });

      const res = await service.getRecipe('PRD-BUMPER', 'MOLD-01');

      expect(res.recipeCode).toBe('RCP-BUMPER-001');
      expect(res.barrelTempZones).toEqual([200, 205, 210, 215, 220]);
      expect(res.injectionPressureBar).toBe(140.0);
    });

    it('should throw NotFoundException if no approved recipe exists', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1', partNumber: 'PRD-BUMPER' });
      mockPrisma.mold.findFirst.mockResolvedValue({ id: 'mold-1', code: 'MOLD-01' });
      mockPrisma.recipeMaster.findFirst.mockResolvedValue(null);

      await expect(service.getRecipe('PRD-BUMPER', 'MOLD-01')).rejects.toThrow(NotFoundException);
    });
  });
});
