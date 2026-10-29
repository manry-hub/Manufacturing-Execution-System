import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpcCalculatorService } from './spc-calculator.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { SpcParameterEnum } from '../dto/analytics.dto.js';

describe('SpcCalculatorService', () => {
  let service: SpcCalculatorService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      machine: {
        findUnique: vi.fn(),
      },
      machineEventLog: {
        findMany: vi.fn(),
      },
      qualityCheckSample: {
        findMany: vi.fn(),
      },
    };

    service = new SpcCalculatorService(mockPrisma as unknown as PrismaService);
  });

  describe('calculateSpc', () => {
    it('should calculate SPC metrics with valid subgroups, control limits, and capability', async () => {
      mockPrisma.machine.findUnique.mockResolvedValue({ id: 'm-1', code: 'IMM-01' });

      // Mock 50 machine event logs with cushion position
      const mockLogs = Array.from({ length: 50 }, (_, i) => ({
        id: BigInt(i + 1),
        rawPayload: JSON.stringify({
          metrics: {
            cushionPositionMm: 12.0 + (i % 5 - 2) * 0.1, // variations: 11.8, 11.9, 12.0, 12.1, 12.2
          },
        }),
      }));
      mockPrisma.machineEventLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.calculateSpc({
        machineCode: 'IMM-01',
        parameter: SpcParameterEnum.CUSHION_POSITION,
        subgroupSize: 5,
        sampleCount: 50,
      });

      expect(result).toBeDefined();
      expect(result.machineCode).toBe('IMM-01');
      expect(result.parameter).toBe(SpcParameterEnum.CUSHION_POSITION);
      expect(result.subgroupSize).toBe(5);
      expect(result.subgroups.length).toBe(10); // 50 / 5 = 10 subgroups

      // Check control limits
      expect(result.controlLimits.mean).toBeCloseTo(12.0, 1);
      expect(result.controlLimits.ucl).toBeGreaterThan(result.controlLimits.mean);
      expect(result.controlLimits.lcl).toBeLessThan(result.controlLimits.mean);
      expect(result.controlLimits.sigma).toBeGreaterThan(0);

      // Check process capability
      expect(result.capability.cp).toBeGreaterThan(0);
      expect(result.capability.cpk).toBeGreaterThan(0);
      expect(['EXCELLENT', 'CAPABLE', 'MARGINAL', 'INCAPABLE']).toContain(
        result.capability.rating,
      );
    });

    it('should detect Rule 1 violation if point exceeds UCL or LCL', async () => {
      mockPrisma.machine.findUnique.mockResolvedValue({ id: 'm-1', code: 'IMM-01' });

      // Generate 25 normal samples (5 subgroups) and 1 extreme outlier
      const mockLogs = Array.from({ length: 30 }, (_, i) => {
        let val = 12.0;
        if (i === 0) val = 18.0; // extreme outlier
        return {
          id: BigInt(i + 1),
          rawPayload: JSON.stringify({
            metrics: { cushionPositionMm: val },
          }),
        };
      });
      mockPrisma.machineEventLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.calculateSpc({
        machineCode: 'IMM-01',
        parameter: SpcParameterEnum.CUSHION_POSITION,
        subgroupSize: 5,
        sampleCount: 30,
      });

      expect(result.violations.some((v) => v.ruleNumber === 1)).toBe(true);
    });

    it('should fall back to synthetic baseline when database has no events', async () => {
      mockPrisma.machine.findUnique.mockResolvedValue(null); // machine not found or empty
      mockPrisma.machineEventLog.findMany.mockResolvedValue([]);

      const result = await service.calculateSpc({
        machineCode: 'IMM-99',
        parameter: SpcParameterEnum.INJECTION_PRESSURE,
        subgroupSize: 5,
        sampleCount: 40,
      });

      expect(result).toBeDefined();
      expect(result.subgroups.length).toBe(8); // 40 / 5 = 8
      expect(result.controlLimits.mean).toBeGreaterThan(100);
      expect(result.capability.target).toBe(145.0);
    });

    it('should handle QC dimension parameter querying qualityCheckSample', async () => {
      mockPrisma.machine.findUnique.mockResolvedValue({ id: 'm-1', code: 'IMM-01' });
      mockPrisma.qualityCheckSample.findMany.mockResolvedValue(
        Array.from({ length: 25 }, (_, i) => ({
          id: BigInt(i + 1),
          measuredValue: 1450.0 + (i % 3 - 1) * 0.2,
        })),
      );

      const result = await service.calculateSpc({
        machineCode: 'IMM-01',
        parameter: SpcParameterEnum.QC_DIMENSION,
        subgroupSize: 5,
        sampleCount: 25,
      });

      expect(result.parameterName).toBe('Critical Width Dimension');
      expect(result.controlLimits.mean).toBeCloseTo(1450.0, 1);
      expect(result.capability.target).toBe(1450.0);
    });
  });
});
