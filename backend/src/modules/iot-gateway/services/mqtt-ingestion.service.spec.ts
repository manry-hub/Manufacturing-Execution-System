import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { MqttIngestionService } from './mqtt-ingestion.service.js';
import { Euromap77MapperService } from './euromap77-mapper.service.js';
import { TelemetryIngestionService } from '../../telemetry/telemetry.service.js';

describe('MqttIngestionService', () => {
  let service: MqttIngestionService;
  let mockConfigService: any;
  let mockTelemetryService: any;
  let mapperService: Euromap77MapperService;

  beforeEach(() => {
    vi.useFakeTimers();

    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: string) => {
        if (key === 'MQTT_ENABLED') return 'true';
        if (key === 'MQTT_BROKER_URL') return 'mqtt://localhost:1883';
        return defaultValue;
      }),
    };

    mockTelemetryService = {
      ingestEvent: vi.fn().mockResolvedValue({
        status: 'PROCESSED',
        eventId: 'test-event-id',
        machineId: 'm-imm-01',
        machineCode: 'IMM-01',
        normalizedStatus: 'RUNNING',
      }),
    };

    mapperService = new Euromap77MapperService();

    service = new MqttIngestionService(
      mockConfigService as unknown as ConfigService,
      mapperService,
      mockTelemetryService as unknown as TelemetryIngestionService,
    );
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.useRealTimers();
  });

  it('should initialize status with broker URL and default topic subscriptions', () => {
    const status = service.getStatus();
    expect(status.enabled).toBe(true);
    expect(status.brokerUrl).toBe('mqtt://localhost:1883');
    expect(status.subscribedTopics).toContain('factory/+/+/+');
    expect(status.stats.totalPacketsReceived).toBe(0);
  });

  it('should process inbound Euromap 77 packet buffer and pass to TelemetryIngestionService', async () => {
    const rawPayload = {
      machineCode: 'IMM-02',
      machineStatus: 'RUNNING',
      cyclicParameters: { cycleTime: 24.1 },
    };
    const buffer = Buffer.from(JSON.stringify(rawPayload), 'utf-8');

    await service.handleInboundMessage('factory/plant-1/IMM-02/euromap77', buffer);

    expect(mockTelemetryService.ingestEvent).toHaveBeenCalledTimes(1);
    const calledEvent = mockTelemetryService.ingestEvent.mock.calls[0][0];
    expect(calledEvent.machineId).toBe('IMM-02');
    expect(calledEvent.normalizedStatus).toBe('RUNNING');

    const status = service.getStatus();
    expect(status.stats.totalPacketsReceived).toBe(1);
    expect(status.stats.totalPacketsProcessed).toBe(1);
    expect(status.stats.parseErrors).toBe(0);
  });

  it('should catch malformed JSON packets without crashing and increment parseErrors', async () => {
    const malformedBuffer = Buffer.from('NOT_A_VALID_JSON_STRING{{{', 'utf-8');

    await service.handleInboundMessage('factory/plant-1/IMM-01/telemetry', malformedBuffer);

    expect(mockTelemetryService.ingestEvent).not.toHaveBeenCalled();

    const status = service.getStatus();
    expect(status.stats.totalPacketsReceived).toBe(1);
    expect(status.stats.totalPacketsProcessed).toBe(0);
    expect(status.stats.parseErrors).toBe(1);

    const recentPackets = service.getRecentPackets('IMM-01');
    expect(recentPackets.length).toBe(1);
    expect(recentPackets[0].status).toBe('ERROR');
  });

  it('should track recent packets in circular buffer and filter by machineCode', async () => {
    const p1 = Buffer.from(JSON.stringify({ machineCode: 'IMM-01', machineStatus: 'RUNNING' }));
    const p2 = Buffer.from(JSON.stringify({ machineCode: 'IMM-02', machineStatus: 'IDLE' }));

    await service.handleInboundMessage('factory/plant-1/IMM-01/euromap77', p1);
    await service.handleInboundMessage('factory/plant-1/IMM-02/euromap77', p2);

    const allPackets = service.getRecentPackets();
    expect(allPackets.length).toBe(2);

    const imm01Packets = service.getRecentPackets('IMM-01');
    expect(imm01Packets.length).toBe(1);
    expect(imm01Packets[0].machineCode).toBe('IMM-01');

    const imm02Packets = service.getRecentPackets('IMM-02');
    expect(imm02Packets.length).toBe(1);
    expect(imm02Packets[0].machineCode).toBe('IMM-02');
  });

  it('should fall back to direct ingestion when publishing test packet if broker client is offline', async () => {
    const testPayload = {
      machineCode: 'IMM-04',
      machineStatus: 'SETUP',
    };

    const result = await service.publishTestPacket(
      'factory/plant-1/IMM-04/state',
      testPayload,
    );

    expect(result.success).toBe(true);
    expect(mockTelemetryService.ingestEvent).toHaveBeenCalledTimes(1);
  });
});
