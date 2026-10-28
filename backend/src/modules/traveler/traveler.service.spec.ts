import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TravelerService } from './traveler.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { TelemetryGateway } from '../telemetry/telemetry.gateway.js';

describe('TravelerService', () => {
  let service: TravelerService;
  let mockPrisma: any;
  let mockGateway: any;

  const mockRun = {
    id: 'run-101',
    productionOrderId: 'po-101',
    machineId: 'mach-01',
    moldId: 'mold-01',
    status: 'COMPLETED',
    totalShots: 250,
    goodQuantity: 980,
    rejectQuantity: 20,
    startTime: new Date('2026-10-28T08:00:00.000Z'),
    endTime: new Date('2026-10-28T12:00:00.000Z'),
    productionOrder: {
      orderNumber: 'PO-2026-IMM01',
      productId: 'prod-01',
      targetQuantity: 1000,
      product: {
        id: 'prod-01',
        partNumber: 'PART-HOUSING-01',
        name: 'Automotive Sensor Housing Front',
      },
    },
    machine: {
      id: 'mach-01',
      code: 'IMM-01',
      clampingTonnage: 150,
      area: { name: 'Main Molding Hall A' },
    },
    mold: {
      id: 'mold-01',
      code: 'MOLD-HOUSING-4CAV',
      cavityCount: 4,
      compatibilities: [
        {
          productId: 'prod-01',
          idealCycleTime: 22.0,
        },
      ],
    },
    consumptions: [
      {
        quantityKg: 250,
        loadedAt: new Date('2026-10-28T07:45:00.000Z'),
        loadedBy: { username: 'mat_handler' },
        materialLot: {
          lotNumber: 'LOT-PP-202610-01',
          supplierLot: 'SABIC Polymers',
          material: {
            code: 'RESIN-PP-01',
            name: 'Polypropylene Copolymer (PP-CP-7020)',
          },
        },
      },
    ],
    qualityChecks: [
      {
        id: 'qc-1',
        checkType: 'FIRST_PIECE',
        disposition: 'RELEASED',
        checkedAt: new Date('2026-10-28T08:15:00.000Z'),
        inspector: { username: 'qa_mark' },
        samples: [
          {
            measuredValue: 2.51,
            isPassed: true,
            planItem: {
              parameterName: 'Wall Thickness (mm)',
              targetValue: 2.5,
              lowerTolerance: 2.4,
              upperTolerance: 2.6,
            },
          },
        ],
      },
    ],
    packagingUnits: [
      {
        id: 'pkg-1',
        barcode: 'PKG-IMM01-0001',
        palletId: 'PAL-01',
        partCount: 50,
        packedAt: new Date('2026-10-28T09:00:00.000Z'),
        packager: { username: 'pack_operator' },
      },
    ],
    currentStates: [],
  };

  beforeEach(() => {
    mockPrisma = {
      productionRun: {
        findMany: vi.fn().mockResolvedValue([mockRun]),
        findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => {
          if (where.id === 'run-101') return Promise.resolve(mockRun);
          return Promise.resolve(null);
        }),
      },
      auditLog: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: BigInt(1) }),
      },
    };

    mockGateway = {
      broadcastQualityEvent: vi.fn(),
    };

    service = new TravelerService(
      mockPrisma as unknown as PrismaService,
      mockGateway as unknown as TelemetryGateway,
    );
  });

  describe('getTravelerRuns', () => {
    it('should return mapped runs with correct signoffStatus', async () => {
      const runs = await service.getTravelerRuns();
      expect(runs).toHaveLength(1);
      expect(runs[0].orderNumber).toBe('PO-2026-IMM01');
      expect(runs[0].machineCode).toBe('IMM-01');
      expect(runs[0].signoffStatus).toBe('PENDING_REVIEW');
    });
  });

  describe('getDigitalTraveler', () => {
    it('should throw NotFoundException when run does not exist', async () => {
      await expect(service.getDigitalTraveler('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should compile complete composite eBR record for existing run', async () => {
      const traveler = await service.getDigitalTraveler('run-101');

      expect(traveler.orderNumber).toBe('PO-2026-IMM01');
      expect(traveler.partNumber).toBe('PART-HOUSING-01');
      expect(traveler.actualGoodQuantity).toBe(980);
      expect(traveler.actualScrapQuantity).toBe(20);

      // Materials Lineage
      expect(traveler.materials).toHaveLength(1);
      expect(traveler.materials[0].lotNumber).toBe('LOT-PP-202610-01');
      expect(traveler.materials[0].supplierName).toBe('SABIC Polymers');

      // Process Parameters
      expect(traveler.processParameters.cycleTimeNominalSeconds).toBe(22.0);
      expect(traveler.processParameters.parameterComplianceStatus).toBeDefined();

      // Quality Audit
      expect(traveler.qualityAudit.firstPieceStatus).toBe('PASSED');
      expect(traveler.qualityAudit.checksRecorded).toHaveLength(1);
      expect(traveler.qualityAudit.checksRecorded[0].itemsChecked[0].characteristic).toBe(
        'Wall Thickness (mm)',
      );

      // Packaging Manifest
      expect(traveler.packagingManifest.totalUnitsPacked).toBe(1);
      expect(traveler.packagingManifest.units[0].barcode).toBe('PKG-IMM01-0001');

      // Default signoff status
      expect(traveler.signoff.status).toBe('PENDING_REVIEW');
    });
  });

  describe('signoffTraveler', () => {
    it('should create audit log with cryptographic SHA-256 hash', async () => {
      const result = await service.signoffTraveler('run-101', {
        inspectorName: 'Dr. Jane Smith, CQE',
        status: 'RELEASED',
        notes: 'Compliant with drawing REV-C.2 dimensional tolerance.',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('RELEASED');
      expect(result.signedBy).toBe('Dr. Jane Smith, CQE');
      expect(result.tamperProofHash).toHaveLength(64); // Valid SHA-256 hex string

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'TRAVELER_SIGNOFF',
            entityType: 'ProductionRun',
            entityId: 'run-101',
          }),
        }),
      );

      expect(mockGateway.broadcastQualityEvent).toHaveBeenCalledWith(
        'quality:first_piece_status_changed',
        expect.objectContaining({
          runId: 'run-101',
          status: 'PASSED',
        }),
      );
    });
  });

  describe('getCertificateOfConformance', () => {
    it('should generate official CoC certificate with critical characteristics', async () => {
      const coc = await service.getCertificateOfConformance('run-101');

      expect(coc.certificateNumber).toContain('PO-2026-IMM01');
      expect(coc.partNumber).toBe('PART-HOUSING-01');
      expect(coc.resinLotNumber).toBe('LOT-PP-202610-01');
      expect(coc.standardsCompliance).toContain(
        'IATF 16949:2016 Automotive Quality Management Certified Facility',
      );
      expect(coc.criticalCharacteristics.length).toBeGreaterThan(0);
      expect(coc.criticalCharacteristics[0].result).toBe('CONFORMS');
      expect(coc.signoff.tamperProofHash).toBeDefined();
    });
  });
});
