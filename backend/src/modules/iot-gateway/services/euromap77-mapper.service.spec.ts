import { describe, it, expect, beforeEach } from 'vitest';
import { Euromap77MapperService } from './euromap77-mapper.service.js';
import {
  NormalizedStatusEnum,
  EventTypeEnum,
  SourceTypeEnum,
} from '../../telemetry/dto/normalized-machine-event.dto.js';

describe('Euromap77MapperService', () => {
  let mapper: Euromap77MapperService;

  beforeEach(() => {
    mapper = new Euromap77MapperService();
  });

  it('should map a complete Euromap 77 payload into canonical NormalizedMachineEventDto', () => {
    const rawPayload = {
      messageId: 'b75f8582-7ea9-42ff-b97c-e362145e1281',
      timestamp: '2026-10-29T21:00:00.000Z',
      machineCode: 'IMM-01',
      protocol: 'EUROMAP_77',
      version: '1.0',
      cyclicParameters: {
        cycleTime: 23.5,
        injectionTime: 3.4,
        cushion: 4.1,
        peakInjectionPressure: 142.0,
      },
      clampingUnit: {
        clampingForce: 1500.0,
        mouldStatus: 'CLOSED',
      },
      heatingZones: {
        zoneTemperatures: [200, 210, 220, 230],
        nozzleTemperature: 235,
      },
      production: {
        totalParts: 500,
        goodParts: 495,
        badParts: 5,
      },
      machineStatus: 'RUNNING',
    };

    const event = mapper.mapToNormalizedEvent(
      rawPayload,
      'factory/plant-1/IMM-01/euromap77',
    );

    expect(event.eventId).toBe('b75f8582-7ea9-42ff-b97c-e362145e1281');
    expect(event.machineId).toBe('IMM-01');
    expect(event.sourceType).toBe(SourceTypeEnum.MQTT_SPB);
    expect(event.sourceId).toBe('EUROMAP_77_GATEWAY');
    expect(event.normalizedStatus).toBe(NormalizedStatusEnum.RUNNING);
    expect(event.eventType).toBe(EventTypeEnum.CYCLE_COMPLETED);

    expect(event.metrics).toBeDefined();
    expect(event.metrics?.cycleTimeSeconds).toBe(23.5);
    expect(event.metrics?.injectionTimeSeconds).toBe(3.4);
    expect(event.metrics?.cushionPositionMm).toBe(4.1);
    expect(event.metrics?.peakInjectionPressureBar).toBe(142.0);
    expect(event.metrics?.clampingForceKn).toBe(1500.0);
    expect(event.metrics?.barrelTemperatures).toEqual([200, 210, 220, 230]);
    expect(event.metrics?.cycleCounter).toBe(500);
    expect(event.fault).toBeNull();
  });

  it('should extract machine code from MQTT topic when omitted in payload', () => {
    const rawPayload = {
      machineStatus: 'IDLE',
    };

    const event = mapper.mapToNormalizedEvent(
      rawPayload,
      'factory/plant-1/IMM-07/state',
    );

    expect(event.machineId).toBe('IMM-07');
    expect(event.normalizedStatus).toBe(NormalizedStatusEnum.IDLE);
    expect(event.eventType).toBe(EventTypeEnum.MACHINE_STATE_CHANGED);
  });

  it('should normalize various factory status strings', () => {
    expect(mapper.mapNormalizedStatus('OPERATING')).toBe(NormalizedStatusEnum.RUNNING);
    expect(mapper.mapNormalizedStatus('STANDBY')).toBe(NormalizedStatusEnum.IDLE);
    expect(mapper.mapNormalizedStatus('MANUAL')).toBe(NormalizedStatusEnum.SETUP);
    expect(mapper.mapNormalizedStatus('OFFLINE')).toBe(NormalizedStatusEnum.STOPPED);
    expect(mapper.mapNormalizedStatus('ALARM')).toBe(NormalizedStatusEnum.FAULT);
    expect(mapper.mapNormalizedStatus('UNKNOWN_XYZ')).toBe(NormalizedStatusEnum.UNKNOWN);
  });

  it('should map active alarms and faults accurately', () => {
    const rawPayload = {
      machineCode: 'IMM-03',
      machineStatus: 'FAULT',
      activeFault: {
        faultCode: 'ALM-HYD-02',
        severity: 'HIGH',
        description: 'Hydraulic Oil Over-Temperature',
      },
    };

    const event = mapper.mapToNormalizedEvent(rawPayload);

    expect(event.normalizedStatus).toBe(NormalizedStatusEnum.FAULT);
    expect(event.eventType).toBe(EventTypeEnum.FAULT_STARTED);
    expect(event.fault).toBeDefined();
    expect(event.fault?.faultCode).toBe('ALM-HYD-02');
    expect(event.fault?.faultSeverity).toBe('HIGH');
    expect(event.fault?.faultDescription).toBe('Hydraulic Oil Over-Temperature');
  });

  it('should throw error if machine code cannot be determined', () => {
    expect(() => mapper.mapToNormalizedEvent({}, 'invalid-topic')).toThrow(
      /Unable to determine machineCode/,
    );
  });
});
