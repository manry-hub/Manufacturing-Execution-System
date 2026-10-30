import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelemetryIngestionService } from './telemetry.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  NormalizedMachineEventDto,
  NormalizedStatusEnum,
  EventTypeEnum,
  SourceTypeEnum,
} from './dto/normalized-machine-event.dto.js';

describe('TelemetryIngestionService', () => {
  let service: TelemetryIngestionService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      machine: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'uuid-imm-01',
          code: 'IMM-01',
          name: 'Battenfeld 150T',
        }),
        findUnique: vi.fn(),
      },
      machineEventLog: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: BigInt(1) }),
      },
      machineCurrentState: {
        findUnique: vi.fn().mockResolvedValue({
          machineId: 'uuid-imm-01',
          normalizedStatus: 'IDLE',
          lastEventTimestamp: new Date(Date.now() - 60000),
          currentCycleTime: null,
          connectionStatus: 'ONLINE',
        }),
        upsert: vi.fn().mockResolvedValue({}),
      },
      machineTimeSegment: {
        create: vi.fn().mockResolvedValue({ id: BigInt(1) }),
      },
      downtimeReason: {
        findUnique: vi.fn().mockResolvedValue({ id: 'reason-1' }),
      },
    };

    service = new TelemetryIngestionService(mockPrisma as unknown as PrismaService);
  });

  const sampleEvent: NormalizedMachineEventDto = {
    eventId: 'e-100',
    machineId: 'IMM-01',
    sourceId: 'SIM-IMM-01',
    sourceType: SourceTypeEnum.SIMULATOR,
    sourceTimestamp: new Date().toISOString(),
    eventType: EventTypeEnum.CYCLE_COMPLETED,
    rawStatus: 'INJECTION_DONE',
    normalizedStatus: NormalizedStatusEnum.RUNNING,
    metrics: {
      cycleCounter: 15,
      cycleTimeSeconds: 20.4,
    },
  };

  it('should process valid event and update current state projection', async () => {
    const streamSpy = vi.fn();
    service.telemetryStream$.subscribe(streamSpy);

    const result = await service.ingestEvent(sampleEvent);

    expect(result.status).toBe('PROCESSED');
    expect(result.machineId).toBe('uuid-imm-01');
    expect(result.machineCode).toBe('IMM-01');
    expect(mockPrisma.machineEventLog.create).toHaveBeenCalled();
    expect(mockPrisma.machineCurrentState.upsert).toHaveBeenCalled();
    expect(streamSpy).toHaveBeenCalled();
  });

  it('should drop duplicate events with identical eventId (Idempotency)', async () => {
    mockPrisma.machineEventLog.findUnique.mockResolvedValue({ id: BigInt(99) });

    const result = await service.ingestEvent(sampleEvent);

    expect(result.status).toBe('DUPLICATE_DROPPED');
    expect(mockPrisma.machineEventLog.create).not.toHaveBeenCalled();
    expect(mockPrisma.machineCurrentState.upsert).not.toHaveBeenCalled();
  });

  it('should record MachineTimeSegment on state transitions', async () => {
    const faultEvent: NormalizedMachineEventDto = {
      eventId: 'e-101',
      machineId: sampleEvent.machineId,
      sourceId: sampleEvent.sourceId,
      sourceType: sampleEvent.sourceType,
      sourceTimestamp: sampleEvent.sourceTimestamp,
      eventType: EventTypeEnum.FAULT_STARTED,
      rawStatus: 'ALARM',
      normalizedStatus: NormalizedStatusEnum.FAULT,
      fault: {
        faultCode: 'UNP-HYD-JAM',
      },
    };

    // Current state in mock was 'IDLE', transitioning to 'FAULT'
    await service.ingestEvent(faultEvent);

    expect(mockPrisma.machineTimeSegment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          machineId: 'uuid-imm-01',
          category: 'UNALLOCATED', // Mapped from previous 'IDLE' state
        }),
      }),
    );
  });
});
