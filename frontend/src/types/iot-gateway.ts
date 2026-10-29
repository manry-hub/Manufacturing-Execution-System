export interface IotGatewayStats {
  totalPacketsReceived: number;
  totalPacketsProcessed: number;
  parseErrors: number;
  packetsPerSecond: number;
  uptimeSeconds: number;
}

export interface IotGatewayStatus {
  enabled: boolean;
  status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR' | 'DISABLED';
  brokerUrl: string;
  subscribedTopics: string[];
  lastConnectedAt: string | null;
  lastPacketReceivedAt: string | null;
  stats: IotGatewayStats;
}

export interface RawPacketRecord {
  id: string;
  topic: string;
  machineCode: string;
  timestamp: string;
  sizeBytes: number;
  payload: unknown;
  status: 'PROCESSED' | 'ERROR';
  errorMessage?: string;
}

export type IngestSourceMode = 'SIMULATOR' | 'MQTT' | 'MODBUS_TCP';

export interface ModbusClientConfig {
  host: string;
  port: number;
  unitId: number;
  pollIntervalMs: number;
  startRegister: number;
  registerCount: number;
}

export interface MachineIngestSource {
  machineCode: string;
  source: IngestSourceMode;
  modbusConfig?: ModbusClientConfig;
  mqttTopic?: string;
  lastPacketAt?: string;
  packetsReceived: number;
}

export interface ModbusRegisterSnapshot {
  unitId: number;
  machineCode: string;
  registers: number[];
  lastUpdatedAt: string;
}

export interface ModbusGatewayStatus {
  enabled: boolean;
  serverListening: boolean;
  port: number;
  activeClientCount: number;
  totalRequestsServed: number;
  totalRegistersWritten: number;
  pollingActive: boolean;
  trackedMachines: ModbusRegisterSnapshot[];
}
