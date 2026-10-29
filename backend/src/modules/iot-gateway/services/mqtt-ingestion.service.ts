import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mqtt, { type MqttClient } from 'mqtt';
import { TelemetryIngestionService } from '../../telemetry/telemetry.service.js';
import { Euromap77MapperService } from './euromap77-mapper.service.js';

export interface RawPacketRecord {
  id: string;
  topic: string;
  machineCode: string;
  timestamp: string;
  sizeBytes: number;
  payload: any;
  status: 'PROCESSED' | 'ERROR';
  errorMessage?: string;
}

export interface GatewayStatus {
  enabled: boolean;
  status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR' | 'DISABLED';
  brokerUrl: string;
  subscribedTopics: string[];
  lastConnectedAt: string | null;
  lastPacketReceivedAt: string | null;
  stats: {
    totalPacketsReceived: number;
    totalPacketsProcessed: number;
    parseErrors: number;
    packetsPerSecond: number;
    uptimeSeconds: number;
  };
}

@Injectable()
export class MqttIngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttIngestionService.name);
  private client: MqttClient | null = null;

  private isConnected = false;
  private connectionStatus: GatewayStatus['status'] = 'DISCONNECTED';
  private brokerUrl = 'mqtt://localhost:1883';
  private subscribedTopics = ['factory/+/+/+'];
  private lastConnectedAt: Date | null = null;
  private lastPacketReceivedAt: Date | null = null;
  private readonly startedAt = new Date();

  // Metrics
  private totalPacketsReceived = 0;
  private totalPacketsProcessed = 0;
  private parseErrors = 0;
  private packetsInLastSecond = 0;
  private currentPacketsPerSecond = 0;
  private rateInterval: NodeJS.Timeout | null = null;

  // In-memory ring buffer for recent raw packets (diagnostic inspector)
  private readonly recentPackets: RawPacketRecord[] = [];
  private readonly maxRecentPackets = 100;

  constructor(
    private readonly configService: ConfigService,
    private readonly euromap77Mapper: Euromap77MapperService,
    private readonly telemetryIngestion: TelemetryIngestionService,
  ) {
    this.brokerUrl =
      this.configService.get<string>('MQTT_BROKER_URL') || 'mqtt://localhost:1883';
  }

  async onModuleInit(): Promise<void> {
    const isEnabled =
      this.configService.get<string>('MQTT_ENABLED', 'true') === 'true';

    if (!isEnabled) {
      this.connectionStatus = 'DISABLED';
      this.logger.log('MQTT Gateway ingestion is disabled via configuration (MQTT_ENABLED=false)');
      return;
    }

    this.startRateMeter();
    this.connect();
  }

  onModuleDestroy(): void {
    if (this.rateInterval) {
      clearInterval(this.rateInterval);
      this.rateInterval = null;
    }
    if (this.client) {
      this.logger.log('Disconnecting from MQTT broker...');
      this.client.end(true);
      this.client = null;
      this.isConnected = false;
      this.connectionStatus = 'DISCONNECTED';
    }
  }

  private connect(): void {
    try {
      this.logger.log(`Connecting to Industrial IoT MQTT Broker at ${this.brokerUrl}...`);
      this.connectionStatus = 'RECONNECTING';

      this.client = mqtt.connect(this.brokerUrl, {
        clientId: `mes-backend-ingestion-${Math.random().toString(16).slice(2, 8)}`,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 5000,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.connectionStatus = 'CONNECTED';
        this.lastConnectedAt = new Date();
        this.logger.log(`Successfully connected to MQTT Broker at ${this.brokerUrl}`);

        for (const topic of this.subscribedTopics) {
          this.client?.subscribe(topic, { qos: 1 }, (err) => {
            if (err) {
              this.logger.error(`Failed to subscribe to MQTT topic "${topic}": ${err.message}`);
            } else {
              this.logger.log(`Subscribed to industrial MQTT topic: ${topic}`);
            }
          });
        }
      });

      this.client.on('message', (topic: string, message: Buffer) => {
        void this.handleInboundMessage(topic, message);
      });

      this.client.on('reconnect', () => {
        this.connectionStatus = 'RECONNECTING';
        this.logger.debug('Reconnecting to MQTT broker...');
      });

      this.client.on('offline', () => {
        this.isConnected = false;
        this.connectionStatus = 'DISCONNECTED';
        this.logger.warn('MQTT Broker is offline');
      });

      this.client.on('error', (err) => {
        this.connectionStatus = 'ERROR';
        this.logger.error(`MQTT Client error: ${err.message}`);
      });
    } catch (err: any) {
      this.connectionStatus = 'ERROR';
      this.logger.error(`Failed to initialize MQTT client: ${err?.message || err}`);
    }
  }

  /**
   * Processes inbound MQTT byte message.
   */
  public async handleInboundMessage(topic: string, message: Buffer): Promise<void> {
    this.totalPacketsReceived++;
    this.packetsInLastSecond++;
    this.lastPacketReceivedAt = new Date();

    const rawString = message.toString('utf-8');
    let payload: any;
    let machineCode = this.euromap77Mapper.extractMachineCodeFromTopic(topic) || 'UNKNOWN';

    try {
      payload = JSON.parse(rawString);
      if (payload.machineCode) {
        machineCode = payload.machineCode;
      }
    } catch (err: any) {
      this.parseErrors++;
      this.logger.warn(`Failed to parse JSON on topic "${topic}": ${err.message}`);
      this.recordPacket({
        id: `pkt-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        topic,
        machineCode,
        timestamp: new Date().toISOString(),
        sizeBytes: message.length,
        payload: rawString,
        status: 'ERROR',
        errorMessage: `JSON Parse Error: ${err.message}`,
      });
      return;
    }

    try {
      const normalizedEvent = this.euromap77Mapper.mapToNormalizedEvent(payload, topic);
      machineCode = normalizedEvent.machineId;

      await this.telemetryIngestion.ingestEvent(normalizedEvent);
      this.totalPacketsProcessed++;

      this.recordPacket({
        id: normalizedEvent.eventId,
        topic,
        machineCode,
        timestamp: normalizedEvent.sourceTimestamp,
        sizeBytes: message.length,
        payload,
        status: 'PROCESSED',
      });
    } catch (err: any) {
      this.logger.error(`Error processing telemetry from topic "${topic}": ${err.message}`);
      this.recordPacket({
        id: `pkt-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        topic,
        machineCode,
        timestamp: new Date().toISOString(),
        sizeBytes: message.length,
        payload,
        status: 'ERROR',
        errorMessage: err.message,
      });
    }
  }

  private recordPacket(record: RawPacketRecord): void {
    if (this.recentPackets.length >= this.maxRecentPackets) {
      this.recentPackets.shift();
    }
    this.recentPackets.push(record);
  }

  private startRateMeter(): void {
    this.rateInterval = setInterval(() => {
      this.currentPacketsPerSecond = this.packetsInLastSecond;
      this.packetsInLastSecond = 0;
    }, 1000);
  }

  /**
   * Returns live status and throughput metrics.
   */
  getStatus(): GatewayStatus {
    const isEnabled =
      this.configService.get<string>('MQTT_ENABLED', 'true') === 'true';

    const now = Date.now();
    const uptimeSeconds = Math.floor((now - this.startedAt.getTime()) / 1000);

    return {
      enabled: isEnabled,
      status: !isEnabled ? 'DISABLED' : this.connectionStatus,
      brokerUrl: this.brokerUrl,
      subscribedTopics: this.subscribedTopics,
      lastConnectedAt: this.lastConnectedAt ? this.lastConnectedAt.toISOString() : null,
      lastPacketReceivedAt: this.lastPacketReceivedAt
        ? this.lastPacketReceivedAt.toISOString()
        : null,
      stats: {
        totalPacketsReceived: this.totalPacketsReceived,
        totalPacketsProcessed: this.totalPacketsProcessed,
        parseErrors: this.parseErrors,
        packetsPerSecond: this.currentPacketsPerSecond,
        uptimeSeconds,
      },
    };
  }

  /**
   * Returns recent raw packets filtered optionally by machine code.
   */
  getRecentPackets(machineCode?: string, limit = 20): RawPacketRecord[] {
    const effectiveLimit = Math.min(Math.max(1, limit), this.maxRecentPackets);
    const filtered = machineCode
      ? this.recentPackets.filter(
          (p) => p.machineCode.toUpperCase() === machineCode.toUpperCase(),
        )
      : this.recentPackets;

    return filtered.slice(-effectiveLimit).reverse();
  }

  /**
   * Publishes or injects a test payload into the broker or directly into pipeline.
   */
  async publishTestPacket(topic: string, payload: any): Promise<{ success: boolean; message: string }> {
    const messageBuffer = Buffer.from(JSON.stringify(payload));

    if (this.client && this.isConnected) {
      return new Promise((resolve) => {
        this.client!.publish(topic, messageBuffer, { qos: 1 }, (err) => {
          if (err) {
            resolve({ success: false, message: `Publish error: ${err.message}` });
          } else {
            resolve({ success: true, message: `Packet published to topic ${topic}` });
          }
        });
      });
    }

    // Direct pipeline ingestion fallback if MQTT broker is currently disconnected
    await this.handleInboundMessage(topic, messageBuffer);
    return {
      success: true,
      message: `Directly ingested packet into pipeline (MQTT broker disconnected)`,
    };
  }
}
