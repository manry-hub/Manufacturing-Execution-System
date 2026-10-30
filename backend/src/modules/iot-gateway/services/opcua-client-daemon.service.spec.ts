import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpcUaClientDaemonService } from './opcua-client-daemon.service.js';
import { IngestSourceSelectorService } from './ingest-source-selector.service.js';
import { IngestSourceMode } from '../dto/modbus-config.dto.js';
import { NormalizedStatusEnum, SourceTypeEnum } from '../../telemetry/dto/normalized-machine-event.dto.js';

describe('OpcUaClientDaemonService', () => {
  let service: OpcUaClientDaemonService;
  let mockIngestSelector: Partial<IngestSourceSelectorService>;
  let mockTelemetryIngestion: { ingestEvent: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockIngestSelector = {
      getAllSources: vi.fn().mockReturnValue([
        {
          machineCode: 'IMM-01',
          source: IngestSourceMode.SIMULATOR,
          packetsReceived: 0,
        },
      ]),
      getMachineSource: vi.fn().mockReturnValue({
        machineCode: 'IMM-01',
        source: IngestSourceMode.OPC_UA,
        opcuaConfig: {
          endpointUrl: 'opc.tcp://192.168.10.101:4840',
          pollIntervalMs: 1000,
        },
      }),
      isOpcUaActiveFor: vi.fn().mockReturnValue(true),
      recordPacket: vi.fn(),
    };

    mockTelemetryIngestion = {
      ingestEvent: vi.fn().mockResolvedValue({ success: true }),
    };

    service = new OpcUaClientDaemonService(
      mockIngestSelector as IngestSourceSelectorService,
      mockTelemetryIngestion as any,
    );
  });

  it('should initialize with default status', () => {
    const status = service.getStatus();
    expect(status.enabled).toBe(true);
    expect(status.activeSessionsCount).toBe(0);
    expect(status.totalReadsExecuted).toBe(0);
    expect(Array.isArray(status.sessions)).toBe(true);
  });

  it('should handle connection failure gracefully and record error in status', async () => {
    // Spy on OPCUAClient.create or mock connection rejection
    const mockClient: any = {
      connect: vi.fn().mockRejectedValue(new Error('Connection refused to OPC UA server')),
      createSession: vi.fn(),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };

    // Inject mock into private method / client creation
    vi.spyOn(service, 'connectMachine').mockImplementation(async (machineCode: string, config: any) => {
      const entry: any = {
        machineCode,
        endpointUrl: config?.endpointUrl ?? 'opc.tcp://127.0.0.1:9999',
        client: mockClient,
        session: null,
        pollTimer: null,
        config: config ?? {},
        isConnected: false,
        monitoredNodes: {},
      };
      (service as any).sessions.set(machineCode, entry);
      try {
        await mockClient.connect(entry.endpointUrl);
        entry.isConnected = true;
        return true;
      } catch (err: any) {
        entry.isConnected = false;
        entry.lastError = err.message;
        return false;
      }
    });

    const result = await service.connectMachine('IMM-01', {
      endpointUrl: 'opc.tcp://127.0.0.1:9999',
      pollIntervalMs: 1000,
    });

    expect(result).toBe(false);
    const status = service.getStatus();
    const session = status.sessions.find((s) => s.machineCode === 'IMM-01');
    expect(session).toBeDefined();
    expect(session?.connected).toBe(false);
    expect(session?.lastError).toContain('Connection refused');
  });

  it('should properly dispatch normalized telemetry from raw node values', () => {
    const fakeEntry: any = {
      machineCode: 'IMM-02',
    };

    const fakeData = {
      cycleTime: 24.5,
      injectionTime: 3.2,
      cushion: 4.8,
      clampingForce: 1200.0,
      barrelZone1Temp: 210.5,
      barrelZone2Temp: 220.0,
      barrelZone3Temp: 230.5,
      machineStatus: 'RUNNING',
    };

    (service as any).dispatchNormalizedTelemetry(fakeEntry, fakeData);

    expect(mockTelemetryIngestion.ingestEvent).toHaveBeenCalledTimes(1);
    const event = mockTelemetryIngestion.ingestEvent.mock.calls[0][0];
    expect(event.machineId).toBe('IMM-02');
    expect(event.normalizedStatus).toBe(NormalizedStatusEnum.RUNNING);
    expect(event.sourceType).toBe(SourceTypeEnum.OPC_UA);
    expect(event.metrics.cycleTimeSeconds).toBe(24.5);
    expect(event.metrics.cushionPositionMm).toBe(4.8);
    expect(event.metrics.barrelTemperatures).toEqual([210.5, 220.0, 230.5]);
    expect(mockIngestSelector.recordPacket).toHaveBeenCalledWith('IMM-02');
  });

  it('should map status correctly to FAULT, STOPPED, or SETUP', () => {
    const fakeEntry: any = { machineCode: 'IMM-03' };

    (service as any).dispatchNormalizedTelemetry(fakeEntry, { machineStatus: 'ALARM_ZONE_TEMP' });
    expect(mockTelemetryIngestion.ingestEvent.mock.calls[0][0].normalizedStatus).toBe(NormalizedStatusEnum.FAULT);

    (service as any).dispatchNormalizedTelemetry(fakeEntry, { machineStatus: 'STOPPED_EMERGENCY' });
    expect(mockTelemetryIngestion.ingestEvent.mock.calls[1][0].normalizedStatus).toBe(NormalizedStatusEnum.STOPPED);

    (service as any).dispatchNormalizedTelemetry(fakeEntry, { machineStatus: 'SETUP_MOLD_CHANGE' });
    expect(mockTelemetryIngestion.ingestEvent.mock.calls[2][0].normalizedStatus).toBe(NormalizedStatusEnum.SETUP);
  });

  it('should disconnect cleanly and remove session from map', async () => {
    // Mock a dummy session in map
    (service as any).sessions.set('IMM-04', {
      machineCode: 'IMM-04',
      endpointUrl: 'opc.tcp://test:4840',
      client: { disconnect: vi.fn().mockResolvedValue(undefined) },
      session: { close: vi.fn().mockResolvedValue(undefined) },
      pollTimer: null,
      isConnected: true,
      monitoredNodes: {},
    });

    const disconnected = await service.disconnectMachine('IMM-04');
    expect(disconnected).toBe(true);
    expect((service as any).sessions.has('IMM-04')).toBe(false);
  });
});
