import { Injectable, Logger } from '@nestjs/common';
import { IngestSourceMode, type ModbusClientConfigDto, type UpdateIngestSourceDto } from '../dto/modbus-config.dto.js';
import type { OpcUaClientConfigDto } from '../dto/opcua-config.dto.js';

export interface MachineSourceEntry {
  machineCode: string;
  source: IngestSourceMode;
  modbusConfig?: ModbusClientConfigDto;
  mqttTopic?: string;
  opcuaConfig?: OpcUaClientConfigDto;
  lastPacketAt?: string;
  packetsReceived: number;
}

@Injectable()
export class IngestSourceSelectorService {
  private readonly logger = new Logger(IngestSourceSelectorService.name);

  // In-memory registry of machine ingestion sources
  private readonly registry = new Map<string, MachineSourceEntry>();

  constructor() {
    this.initializeDefaults();
  }

  private initializeDefaults(): void {
    // Standard 10 injection machines from plant topology
    for (let i = 1; i <= 10; i++) {
      const code = `IMM-${i.toString().padStart(2, '0')}`;
      this.registry.set(code, {
        machineCode: code,
        source: IngestSourceMode.SIMULATOR,
        modbusConfig: {
          host: '127.0.0.1',
          port: 5502,
          unitId: i,
          pollIntervalMs: 2000,
          startRegister: 0,
          registerCount: 16,
        },
        mqttTopic: `factory/plant-1/${code}/euromap77`,
        opcuaConfig: {
          endpointUrl: `opc.tcp://192.168.10.${100 + i}:4840`,
          securityMode: 'None',
          securityPolicy: 'None',
          pollIntervalMs: 2000,
        },
        packetsReceived: 0,
      });
    }
    this.logger.log('IngestSourceSelectorService initialized with 10 machines (default: SIMULATOR)');
  }

  public getMachineSource(machineCode: string): MachineSourceEntry | undefined {
    return this.registry.get(machineCode);
  }

  public getAllSources(): MachineSourceEntry[] {
    return Array.from(this.registry.values()).sort((a, b) =>
      a.machineCode.localeCompare(b.machineCode),
    );
  }

  public setMachineSource(machineCode: string, dto: UpdateIngestSourceDto): MachineSourceEntry {
    let entry = this.registry.get(machineCode);
    if (!entry) {
      entry = {
        machineCode,
        source: dto.source,
        modbusConfig: dto.modbusConfig ?? {
          host: '127.0.0.1',
          port: 5502,
          unitId: 1,
          pollIntervalMs: 2000,
          startRegister: 0,
          registerCount: 16,
        },
        mqttTopic: dto.mqttTopic ?? `factory/plant-1/${machineCode}/euromap77`,
        packetsReceived: 0,
      };
    } else {
      entry.source = dto.source;
      if (dto.modbusConfig) {
        entry.modbusConfig = {
          host: dto.modbusConfig.host ?? entry.modbusConfig?.host ?? '127.0.0.1',
          port: dto.modbusConfig.port ?? entry.modbusConfig?.port ?? 5502,
          unitId: dto.modbusConfig.unitId ?? entry.modbusConfig?.unitId ?? 1,
          pollIntervalMs: dto.modbusConfig.pollIntervalMs ?? entry.modbusConfig?.pollIntervalMs ?? 2000,
          startRegister: dto.modbusConfig.startRegister ?? entry.modbusConfig?.startRegister ?? 0,
          registerCount: dto.modbusConfig.registerCount ?? entry.modbusConfig?.registerCount ?? 16,
        };
      }
      if (dto.mqttTopic) {
        entry.mqttTopic = dto.mqttTopic;
      }
      if (dto.opcuaConfig) {
        entry.opcuaConfig = {
          endpointUrl: dto.opcuaConfig.endpointUrl ?? entry.opcuaConfig?.endpointUrl ?? `opc.tcp://192.168.10.100:4840`,
          securityMode: dto.opcuaConfig.securityMode ?? entry.opcuaConfig?.securityMode ?? 'None',
          securityPolicy: dto.opcuaConfig.securityPolicy ?? entry.opcuaConfig?.securityPolicy ?? 'None',
          pollIntervalMs: dto.opcuaConfig.pollIntervalMs ?? entry.opcuaConfig?.pollIntervalMs ?? 2000,
          nodeMappings: dto.opcuaConfig.nodeMappings ?? entry.opcuaConfig?.nodeMappings,
        };
      }
    }

    this.registry.set(machineCode, entry);
    this.logger.log(`Switched telemetry ingestion source for ${machineCode} to ${dto.source}`);
    return entry;
  }

  public recordPacket(machineCode: string): void {
    const entry = this.registry.get(machineCode);
    if (entry) {
      entry.packetsReceived++;
      entry.lastPacketAt = new Date().toISOString();
    }
  }

  public isSimulatorActiveFor(machineCode: string): boolean {
    const entry = this.registry.get(machineCode);
    return !entry || entry.source === IngestSourceMode.SIMULATOR;
  }

  public isMqttActiveFor(machineCode: string): boolean {
    const entry = this.registry.get(machineCode);
    return entry?.source === IngestSourceMode.MQTT;
  }

  public isModbusActiveFor(machineCode: string): boolean {
    const entry = this.registry.get(machineCode);
    return entry?.source === IngestSourceMode.MODBUS_TCP;
  }

  public isOpcUaActiveFor(machineCode: string): boolean {
    const entry = this.registry.get(machineCode);
    return entry?.source === IngestSourceMode.OPC_UA;
  }
}
