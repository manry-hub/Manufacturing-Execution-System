import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  NormalizedMachineEventDto,
  NormalizedStatusEnum,
  EventTypeEnum,
} from './dto/normalized-machine-event.dto.js';
import { Subject } from 'rxjs';

export interface IngestionResult {
  status: 'PROCESSED' | 'DUPLICATE_DROPPED';
  eventId: string;
  machineId: string;
  machineCode: string;
  normalizedStatus: string;
}

export interface MachineSnapshot {
  id: string;
  code: string;
  name: string;
  clampingTonnage: number | null;
  isVirtual: boolean;
  area: {
    id: string;
    code: string;
    name: string;
  };
  currentState: {
    normalizedStatus: string;
    rawStatus: string | null;
    currentCycleTime: number | null;
    lastEventTimestamp: Date;
    connectionStatus: string;
  } | null;
}

@Injectable()
export class TelemetryIngestionService {
  private readonly logger = new Logger(TelemetryIngestionService.name);

  // In-memory cache for fast Machine ID & Code resolution
  private readonly machineCodeToId = new Map<string, string>();
  private readonly machineIdToCode = new Map<string, string>();

  // In-memory cache for tracking the start of current state per machine for time segmentation
  private readonly machineStateStartTime = new Map<string, Date>();

  // RxJS stream for outgoing live broadcasts
  public readonly telemetryStream$ = new Subject<{
    event: NormalizedMachineEventDto;
    internalMachineId: string;
  }>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves machine code (e.g. 'IMM-01') or UUID to internal machine ID.
   */
  async resolveMachineId(identifier: string): Promise<{ id: string; code: string }> {
    if (this.machineCodeToId.has(identifier)) {
      const id = this.machineCodeToId.get(identifier)!;
      return { id, code: identifier };
    }

    if (this.machineIdToCode.has(identifier)) {
      const code = this.machineIdToCode.get(identifier)!;
      return { id: identifier, code };
    }

    // Query database
    const machine = await this.prisma.machine.findFirst({
      where: {
        OR: [{ id: identifier }, { code: identifier }],
      },
    });

    if (!machine) {
      throw new NotFoundException(`Machine identifier "${identifier}" not found`);
    }

    this.machineCodeToId.set(machine.code, machine.id);
    this.machineIdToCode.set(machine.id, machine.code);

    return { id: machine.id, code: machine.code };
  }

  /**
   * Maps normalized status to OEE time segment category.
   */
  mapStatusToTimeCategory(status: NormalizedStatusEnum): string {
    switch (status) {
      case NormalizedStatusEnum.RUNNING:
        return 'OPERATING';
      case NormalizedStatusEnum.SETUP:
        return 'CHANGEOVER';
      case NormalizedStatusEnum.FAULT:
        return 'UNPLANNED_DOWNTIME';
      case NormalizedStatusEnum.STOPPED:
        return 'PLANNED_DOWNTIME';
      case NormalizedStatusEnum.IDLE:
      case NormalizedStatusEnum.DISCONNECTED:
      case NormalizedStatusEnum.UNKNOWN:
      default:
        return 'UNALLOCATED';
    }
  }

  /**
   * Ingests a single normalized machine event with idempotency, state projection, and segment slicing.
   */
  async ingestEvent(event: NormalizedMachineEventDto): Promise<IngestionResult> {
    const { id: machineId, code: machineCode } = await this.resolveMachineId(event.machineId);

    // 1. Idempotency Check: Drop duplicate events by unique eventId
    const existingLog = await this.prisma.machineEventLog.findUnique({
      where: { eventId: event.eventId },
      select: { id: true },
    });

    if (existingLog) {
      this.logger.debug(`Duplicate event dropped: ${event.eventId} (Machine: ${machineCode})`);
      return {
        status: 'DUPLICATE_DROPPED',
        eventId: event.eventId,
        machineId,
        machineCode,
        normalizedStatus: event.normalizedStatus,
      };
    }

    const sourceTimestamp = new Date(event.sourceTimestamp);
    const receivedTimestamp = event.receivedTimestamp ? new Date(event.receivedTimestamp) : new Date();

    // 2. Fetch or initialize current projection state
    const currentState = await this.prisma.machineCurrentState.findUnique({
      where: { machineId },
    });

    const previousStatus = currentState?.normalizedStatus as NormalizedStatusEnum | undefined;
    const isStatusTransition = previousStatus !== undefined && previousStatus !== event.normalizedStatus;

    // 3. Time Segment Management on State Transitions
    if (isStatusTransition && currentState) {
      const stateStartTime = this.machineStateStartTime.get(machineId) ?? currentState.lastEventTimestamp;
      const durationSeconds = Math.max(
        0,
        Math.round((sourceTimestamp.getTime() - stateStartTime.getTime()) / 1000),
      );

      if (durationSeconds > 0) {
        let downtimeReasonId: string | null = null;
        if (previousStatus === NormalizedStatusEnum.FAULT && event.fault?.faultCode) {
          const reason = await this.prisma.downtimeReason.findUnique({
            where: { code: event.fault.faultCode },
          });
          downtimeReasonId = reason?.id ?? null;
        }

        await this.prisma.machineTimeSegment.create({
          data: {
            machineId,
            category: this.mapStatusToTimeCategory(previousStatus),
            startTime: stateStartTime,
            endTime: sourceTimestamp,
            durationSeconds,
            downtimeReasonId,
          },
        });
      }

      this.machineStateStartTime.set(machineId, sourceTimestamp);
    } else if (!this.machineStateStartTime.has(machineId)) {
      this.machineStateStartTime.set(machineId, sourceTimestamp);
    }

    // 4. Update Current State Projection
    const cycleTimeDecimal = event.metrics?.cycleTimeSeconds !== undefined
      ? event.metrics.cycleTimeSeconds
      : currentState?.currentCycleTime;

    const connectionStatus = event.eventType === EventTypeEnum.SOURCE_CONNECTION_CHANGED
      ? event.normalizedStatus === NormalizedStatusEnum.DISCONNECTED ? 'OFFLINE' : 'ONLINE'
      : (currentState?.connectionStatus ?? 'ONLINE');

    await this.prisma.machineCurrentState.upsert({
      where: { machineId },
      update: {
        normalizedStatus: event.normalizedStatus,
        rawStatus: event.rawStatus ?? currentState?.rawStatus,
        currentCycleTime: cycleTimeDecimal,
        lastEventTimestamp: sourceTimestamp,
        connectionStatus,
      },
      create: {
        machineId,
        normalizedStatus: event.normalizedStatus,
        rawStatus: event.rawStatus,
        currentCycleTime: cycleTimeDecimal,
        lastEventTimestamp: sourceTimestamp,
        connectionStatus,
      },
    });

    // 5. Append Raw Event Log
    await this.prisma.machineEventLog.create({
      data: {
        eventId: event.eventId,
        machineId,
        eventType: event.eventType,
        normalizedStatus: event.normalizedStatus,
        sourceTimestamp,
        receivedTimestamp,
        cycleCounter: event.metrics?.cycleCounter !== undefined ? BigInt(event.metrics.cycleCounter) : null,
        faultCode: event.fault?.faultCode ?? null,
        rawPayload: JSON.stringify(event),
        isSimulated: event.isSimulated ?? true,
      },
    });

    // 6. Push to real-time notification stream for WebSocket broadcasting
    this.telemetryStream$.next({
      event,
      internalMachineId: machineId,
    });

    return {
      status: 'PROCESSED',
      eventId: event.eventId,
      machineId,
      machineCode,
      normalizedStatus: event.normalizedStatus,
    };
  }

  /**
   * Batch ingestion for high-throughput packet streams.
   */
  async ingestBatch(events: NormalizedMachineEventDto[]): Promise<IngestionResult[]> {
    const results: IngestionResult[] = [];
    for (const ev of events) {
      const res = await this.ingestEvent(ev);
      results.push(res);
    }
    return results;
  }

  /**
   * Retrieves current machine snapshot with latest status and recent event log.
   */
  async getMachineSnapshot(identifier: string): Promise<MachineSnapshot & { recentEvents: any[] }> {
    const { id: machineId } = await this.resolveMachineId(identifier);

    const machine = await this.prisma.machine.findUnique({
      where: { id: machineId },
      include: {
        area: {
          select: { id: true, code: true, name: true },
        },
        currentState: true,
        eventLogs: {
          orderBy: { sourceTimestamp: 'desc' },
          take: 10,
        },
      },
    });

    if (!machine) {
      throw new NotFoundException(`Machine "${identifier}" not found`);
    }

    return {
      id: machine.id,
      code: machine.code,
      name: machine.name,
      clampingTonnage: machine.clampingTonnage,
      isVirtual: machine.isVirtual,
      area: machine.area,
      currentState: machine.currentState
        ? {
            normalizedStatus: machine.currentState.normalizedStatus,
            rawStatus: machine.currentState.rawStatus,
            currentCycleTime: machine.currentState.currentCycleTime ? Number(machine.currentState.currentCycleTime) : null,
            lastEventTimestamp: machine.currentState.lastEventTimestamp,
            connectionStatus: machine.currentState.connectionStatus,
          }
        : null,
      recentEvents: machine.eventLogs.map((log) => ({
        ...log,
        id: Number(log.id),
        cycleCounter: log.cycleCounter !== null ? Number(log.cycleCounter) : null,
      })),
    };
  }
}
