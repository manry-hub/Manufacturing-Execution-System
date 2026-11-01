import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QmsInboundService } from './qms-inbound.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('QmsInboundService', () => {
  let service: QmsInboundService;
  let mockPrisma: any;
  let mockGateway: any;

  beforeEach(() => {
    mockPrisma = {
      productionRun: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
      },
      qualityCheck: {
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(mockPrisma)),
    };

    mockGateway = {
      broadcastQualityEvent: vi.fn(),
    };

    service = new QmsInboundService(mockPrisma, mockGateway);
  });

  describe('processQcRelease', () => {
    const validDto = {
      runId: 'run-101',
      disposition: 'RELEASED' as const,
      inspectorBadge: 'QC-INSP-09',
      notes: 'First-Piece critical dimensions within +/-0.05mm tolerance',
    };

    it('should throw NotFoundException if production run does not exist', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue(null);

      await expect(service.processQcRelease(validDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if run is already COMPLETED', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue({
        id: 'run-101',
        status: 'COMPLETED',
      });

      await expect(service.processQcRelease(validDto)).rejects.toThrow(BadRequestException);
    });

    it('should successfully release First-Piece QC, transition run to ACTIVE and clear interlock', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue({
        id: 'run-101',
        machineId: 'm-1',
        status: 'SETUP',
      });
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-qc', username: 'QC-INSP-09' });
      mockPrisma.qualityCheck.create.mockResolvedValue({
        id: 'qc-1',
        runId: 'run-101',
        disposition: 'RELEASED',
        checkedAt: new Date(),
      });
      mockPrisma.productionRun.update.mockResolvedValue({
        id: 'run-101',
        status: 'ACTIVE',
      });

      const res = await service.processQcRelease(validDto);

      expect(res.success).toBe(true);
      expect(res.disposition).toBe('RELEASED');
      expect(res.runStatus).toBe('ACTIVE');
      expect(res.isInterlocked).toBe(false);

      expect(mockPrisma.qualityCheck.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            runId: 'run-101',
            checkType: 'FIRST_PIECE',
            disposition: 'RELEASED',
          }),
        }),
      );

      expect(mockPrisma.productionRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run-101' },
          data: { status: 'ACTIVE' },
        }),
      );

      expect(mockGateway.broadcastQualityEvent).toHaveBeenCalledWith(
        'machine:interlock_state',
        expect.objectContaining({
          machineId: 'm-1',
          isInterlocked: false,
        }),
      );
    });

    it('should enforce machine interlock and keep SETUP status when QMS rejects first-piece inspection', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue({
        id: 'run-101',
        machineId: 'm-1',
        status: 'SETUP',
      });
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-qc', username: 'QC-INSP-09' });
      mockPrisma.qualityCheck.create.mockResolvedValue({
        id: 'qc-2',
        runId: 'run-101',
        disposition: 'REJECTED',
        checkedAt: new Date(),
      });

      const rejectedDto = {
        ...validDto,
        disposition: 'REJECTED' as const,
        notes: 'Excessive flash on parting line',
      };

      const res = await service.processQcRelease(rejectedDto);

      expect(res.success).toBe(true);
      expect(res.disposition).toBe('REJECTED');
      expect(res.runStatus).toBe('SETUP');
      expect(res.isInterlocked).toBe(true);

      expect(mockGateway.broadcastQualityEvent).toHaveBeenCalledWith(
        'machine:interlock_state',
        expect.objectContaining({
          machineId: 'm-1',
          isInterlocked: true,
          reason: expect.stringContaining('First-Piece QC Rejected by QMS'),
        }),
      );
    });
  });
});
