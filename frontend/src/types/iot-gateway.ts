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
