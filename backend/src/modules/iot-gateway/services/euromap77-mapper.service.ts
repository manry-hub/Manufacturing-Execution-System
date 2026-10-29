import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  NormalizedMachineEventDto,
  NormalizedStatusEnum,
  EventTypeEnum,
  SourceTypeEnum,
  DataQualityEnum,
  EventMetricsDto,
  EventFaultDto,
} from '../../telemetry/dto/normalized-machine-event.dto.js';
import { Euromap77PayloadDto } from '../dto/euromap77-payload.dto.js';

@Injectable()
export class Euromap77MapperService {
  private readonly logger = new Logger(Euromap77MapperService.name);

  /**
   * Maps an OPC 40077 / Euromap 77 JSON payload into the MES canonical NormalizedMachineEventDto.
   *
   * @param payload Inbound Euromap 77 payload
   * @param topic Optional MQTT topic from which the payload arrived
   */
  mapToNormalizedEvent(
    payload: Euromap77PayloadDto | Record<string, any>,
    topic?: string,
  ): NormalizedMachineEventDto {
    const machineCode = payload.machineCode || this.extractMachineCodeFromTopic(topic);
    if (!machineCode) {
      throw new Error(`Unable to determine machineCode from payload or topic "${topic}"`);
    }

    const timestamp = payload.timestamp
      ? new Date(payload.timestamp).toISOString()
      : new Date().toISOString();

    const normalizedStatus = this.mapNormalizedStatus(payload.machineStatus);
    const eventType = this.determineEventType(payload, topic, normalizedStatus);

    // Extract metrics
    const metrics: EventMetricsDto = {};
    if (payload.cyclicParameters) {
      if (typeof payload.cyclicParameters.cycleTime === 'number') {
        metrics.cycleTimeSeconds = payload.cyclicParameters.cycleTime;
      }
      if (typeof payload.cyclicParameters.injectionTime === 'number') {
        metrics.injectionTimeSeconds = payload.cyclicParameters.injectionTime;
      }
      if (typeof payload.cyclicParameters.cushion === 'number') {
        metrics.cushionPositionMm = payload.cyclicParameters.cushion;
      }
      if (typeof payload.cyclicParameters.peakInjectionPressure === 'number') {
        metrics.peakInjectionPressureBar = payload.cyclicParameters.peakInjectionPressure;
      }
    }

    if (payload.clampingUnit?.clampingForce !== undefined) {
      metrics.clampingForceKn = payload.clampingUnit.clampingForce;
    }

    if (Array.isArray(payload.heatingZones?.zoneTemperatures)) {
      metrics.barrelTemperatures = payload.heatingZones.zoneTemperatures.map((t: any) =>
        Number(t),
      );
    }

    if (payload.production?.totalParts !== undefined) {
      metrics.cycleCounter = payload.production.totalParts;
    }

    // Direct flat metric fallback for lightweight payloads
    if (metrics.cycleCounter === undefined && typeof payload.totalParts === 'number') {
      metrics.cycleCounter = payload.totalParts;
    }
    if (metrics.cycleTimeSeconds === undefined && typeof payload.cycleTime === 'number') {
      metrics.cycleTimeSeconds = payload.cycleTime;
    }
    if (metrics.barrelTemperatures === undefined && Array.isArray(payload.barrelTemperatures)) {
      metrics.barrelTemperatures = payload.barrelTemperatures.map(Number);
    }

    // Extract active fault if present
    let fault: EventFaultDto | null = null;
    if (payload.activeFault && payload.activeFault.faultCode) {
      fault = {
        faultCode: payload.activeFault.faultCode,
        faultSeverity: payload.activeFault.severity || 'CRITICAL',
        faultDescription: payload.activeFault.description || 'Euromap 77 PLC Alarm',
      };
    } else if (payload.faultCode) {
      fault = {
        faultCode: payload.faultCode,
        faultSeverity: payload.faultSeverity || 'CRITICAL',
        faultDescription: payload.faultDescription || 'PLC Alarm',
      };
    }

    const eventId =
      payload.messageId && this.isValidUuid(payload.messageId)
        ? payload.messageId
        : randomUUID();

    const normalizedEvent: NormalizedMachineEventDto = {
      eventId,
      machineId: machineCode,
      sourceId: 'EUROMAP_77_GATEWAY',
      sourceType: SourceTypeEnum.MQTT_SPB,
      sourceTimestamp: timestamp,
      receivedTimestamp: new Date().toISOString(),
      eventType,
      rawStatus: payload.clampingUnit?.mouldStatus || payload.rawStatus || payload.machineStatus,
      normalizedStatus,
      metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
      fault,
      dataQuality: DataQualityEnum.GOOD,
      isSimulated: false,
      schemaVersion: '1.0',
    };

    return normalizedEvent;
  }

  /**
   * Resolves machine code from standard industrial MQTT topic: factory/<plantId>/<machineCode>/<channel>
   */
  extractMachineCodeFromTopic(topic?: string): string | null {
    if (!topic) return null;
    const parts = topic.split('/');
    // e.g. factory/plant-1/IMM-01/euromap77 -> parts[2] = 'IMM-01'
    if (parts.length >= 3 && parts[0] === 'factory') {
      return parts[2];
    }
    return null;
  }

  /**
   * Normalizes raw machine status string to canonical NormalizedStatusEnum.
   */
  mapNormalizedStatus(rawStatus?: string): NormalizedStatusEnum {
    if (!rawStatus) return NormalizedStatusEnum.UNKNOWN;

    const normalized = rawStatus.toUpperCase().trim();
    switch (normalized) {
      case 'RUNNING':
      case 'OPERATING':
      case 'AUTOMATIC':
      case 'SEMI_AUTOMATIC':
        return NormalizedStatusEnum.RUNNING;
      case 'IDLE':
      case 'STANDBY':
      case 'READY':
        return NormalizedStatusEnum.IDLE;
      case 'SETUP':
      case 'CHANGEOVER':
      case 'MANUAL':
      case 'MAINTENANCE':
        return NormalizedStatusEnum.SETUP;
      case 'STOPPED':
      case 'STOP':
      case 'OFF':
      case 'OFFLINE':
        return NormalizedStatusEnum.STOPPED;
      case 'FAULT':
      case 'ALARM':
      case 'ERROR':
      case 'EMERGENCY_STOP':
        return NormalizedStatusEnum.FAULT;
      case 'DISCONNECTED':
        return NormalizedStatusEnum.DISCONNECTED;
      default:
        return NormalizedStatusEnum.UNKNOWN;
    }
  }

  /**
   * Determines canonical event type based on payload and channel.
   */
  private determineEventType(
    payload: any,
    topic?: string,
    status?: NormalizedStatusEnum,
  ): EventTypeEnum {
    const channel = topic ? topic.split('/').pop()?.toLowerCase() : null;

    if (channel === 'cycle' || (payload.cyclicParameters?.cycleTime && payload.production?.totalParts)) {
      return EventTypeEnum.CYCLE_COMPLETED;
    }

    if (payload.activeFault || payload.faultCode || status === NormalizedStatusEnum.FAULT) {
      return EventTypeEnum.FAULT_STARTED;
    }

    if (channel === 'state') {
      return EventTypeEnum.MACHINE_STATE_CHANGED;
    }

    if (channel === 'telemetry') {
      return EventTypeEnum.PARAMETER_SAMPLE_RECEIVED;
    }

    if (status === NormalizedStatusEnum.RUNNING && payload.cyclicParameters?.cycleTime) {
      return EventTypeEnum.CYCLE_COMPLETED;
    }

    return EventTypeEnum.PARAMETER_SAMPLE_RECEIVED;
  }

  private isValidUuid(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
}
