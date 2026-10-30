import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  OPCUAClient,
  AttributeIds,
  type ClientSession,
  MessageSecurityMode,
  SecurityPolicy,
  type ReadValueIdOptions,
  type DataValue,
} from 'node-opcua-client';
import { IngestSourceSelectorService } from './ingest-source-selector.service.js';
import { TelemetryIngestionService } from '../../telemetry/telemetry.service.js';
import {
  EventTypeEnum,
  NormalizedStatusEnum,
  SourceTypeEnum,
  type NormalizedMachineEventDto,
  type EventMetricsDto,
} from '../../telemetry/dto/normalized-machine-event.dto.js';
import {
  type OpcUaClientConfigDto,
  type OpcUaGatewayStatus,
  type OpcUaSessionStatus,
  type OpcUaNodeMappingDto,
} from '../dto/opcua-config.dto.js';
import { randomUUID } from 'node:crypto';

interface ActiveSessionEntry {
  machineCode: string;
  endpointUrl: string;
  client: OPCUAClient;
  session: ClientSession | null;
  pollTimer: NodeJS.Timeout | null;
  config: OpcUaClientConfigDto;
  isConnected: boolean;
  monitoredNodes: Record<string, string>;
  lastReadTimestamp?: string;
  lastValues?: Record<string, any>;
  lastError?: string;
}

@Injectable()
export class OpcUaClientDaemonService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OpcUaClientDaemonService.name);

  private readonly sessions = new Map<string, ActiveSessionEntry>();
  private totalReadsExecuted = 0;
  private isDestroyed = false;

  constructor(
    private readonly ingestSelector: IngestSourceSelectorService,
    private readonly telemetryIngestion: TelemetryIngestionService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing OPC UA Client Daemon for Euromap 77...');
    // Scan configured machines and auto-connect any with OPC_UA source mode
    const allSources = this.ingestSelector.getAllSources();
    for (const source of allSources) {
      if (this.ingestSelector.isOpcUaActiveFor(source.machineCode) && source.opcuaConfig) {
        void this.connectMachine(source.machineCode, source.opcuaConfig);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.isDestroyed = true;
    this.logger.log('Shutting down all active OPC UA sessions...');
    const machineCodes = Array.from(this.sessions.keys());
    await Promise.all(machineCodes.map((code) => this.disconnectMachine(code)));
  }

  /**
   * Connect to an OPC UA binary endpoint for a specific machine.
   */
  async connectMachine(
    machineCode: string,
    config?: OpcUaClientConfigDto,
  ): Promise<boolean> {
    if (this.isDestroyed) return false;

    // Disconnect existing session if present
    if (this.sessions.has(machineCode)) {
      await this.disconnectMachine(machineCode);
    }

    const effectiveConfig =
      config ??
      this.ingestSelector.getMachineSource(machineCode)?.opcuaConfig ?? {
        endpointUrl: 'opc.tcp://127.0.0.1:4840',
        securityMode: 'None',
        securityPolicy: 'None',
        pollIntervalMs: 2000,
      };

    const nodeMappings = this.resolveNodeMappings(machineCode, effectiveConfig.nodeMappings);

    // Create client
    const securityMode =
      effectiveConfig.securityMode === 'SignAndEncrypt'
        ? MessageSecurityMode.SignAndEncrypt
        : effectiveConfig.securityMode === 'Sign'
          ? MessageSecurityMode.Sign
          : MessageSecurityMode.None;

    const securityPolicy =
      effectiveConfig.securityPolicy === 'Basic256Sha256'
        ? SecurityPolicy.Basic256Sha256
        : SecurityPolicy.None;

    const client = OPCUAClient.create({
      applicationName: `MES-Euromap77-Client-${machineCode}`,
      connectionStrategy: {
        initialDelay: 1000,
        maxDelay: 10000,
        maxRetry: 3,
      },
      securityMode,
      securityPolicy,
      endpointMustExist: false,
    });

    const entry: ActiveSessionEntry = {
      machineCode,
      endpointUrl: effectiveConfig.endpointUrl,
      client,
      session: null,
      pollTimer: null,
      config: effectiveConfig,
      isConnected: false,
      monitoredNodes: nodeMappings,
    };

    this.sessions.set(machineCode, entry);

    try {
      this.logger.log(
        `Connecting OPC UA daemon to ${effectiveConfig.endpointUrl} for machine ${machineCode}...`,
      );

      await client.connect(effectiveConfig.endpointUrl);
      const session = await client.createSession();
      entry.session = session;
      entry.isConnected = true;
      entry.lastError = undefined;

      this.logger.log(
        `OPC UA session established successfully with ${effectiveConfig.endpointUrl} (${machineCode})`,
      );

      // Start periodic polling for cyclic parameters & telemetry
      this.startPolling(entry);
      return true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      entry.isConnected = false;
      entry.lastError = errMsg;
      this.logger.warn(
        `Failed to establish OPC UA session with ${effectiveConfig.endpointUrl} for ${machineCode}: ${errMsg}`,
      );
      return false;
    }
  }

  /**
   * Disconnect an active OPC UA session.
   */
  async disconnectMachine(machineCode: string): Promise<boolean> {
    const entry = this.sessions.get(machineCode);
    if (!entry) return false;

    if (entry.pollTimer) {
      clearInterval(entry.pollTimer);
      entry.pollTimer = null;
    }

    try {
      if (entry.session) {
        await entry.session.close();
        entry.session = null;
      }
      await entry.client.disconnect();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.debug(`Error while disconnecting OPC UA client (${machineCode}): ${errMsg}`);
    } finally {
      entry.isConnected = false;
      this.sessions.delete(machineCode);
      this.logger.log(`OPC UA session closed for machine ${machineCode}`);
    }

    return true;
  }

  /**
   * Read monitored nodes for a machine and ingest telemetry.
   */
  async readMachineNodes(machineCode: string): Promise<Record<string, any>> {
    const entry = this.sessions.get(machineCode);
    if (!entry || !entry.session || !entry.isConnected) {
      throw new Error(`OPC UA session not active for machine ${machineCode}`);
    }

    const nodeEntries = Object.entries(entry.monitoredNodes);
    if (nodeEntries.length === 0) return {};

    const nodesToRead: ReadValueIdOptions[] = nodeEntries.map(([, nodeId]) => ({
      nodeId,
      attributeId: AttributeIds.Value,
    }));

    const dataValues: DataValue[] = await entry.session.read(nodesToRead);
    this.totalReadsExecuted++;

    const rawResults: Record<string, any> = {};
    nodeEntries.forEach(([key], index) => {
      const dv = dataValues[index];
      rawResults[key] = dv?.value?.value ?? null;
    });

    entry.lastReadTimestamp = new Date().toISOString();
    entry.lastValues = rawResults;

    // Process and dispatch telemetry if OPC_UA is the active source
    if (this.ingestSelector.isOpcUaActiveFor(machineCode)) {
      this.dispatchNormalizedTelemetry(entry, rawResults);
    }

    return rawResults;
  }

  /**
   * Returns current gateway status across all sessions.
   */
  getStatus(): OpcUaGatewayStatus {
    const sessionStatuses: OpcUaSessionStatus[] = Array.from(this.sessions.values()).map(
      (s) => ({
        machineCode: s.machineCode,
        endpointUrl: s.endpointUrl,
        connected: s.isConnected,
        monitoredNodesCount: Object.keys(s.monitoredNodes).length,
        lastReadTimestamp: s.lastReadTimestamp,
        lastValues: s.lastValues,
        lastError: s.lastError,
      }),
    );

    return {
      enabled: true,
      activeSessionsCount: sessionStatuses.filter((s) => s.connected).length,
      totalReadsExecuted: this.totalReadsExecuted,
      sessions: sessionStatuses,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private startPolling(entry: ActiveSessionEntry): void {
    if (entry.pollTimer) {
      clearInterval(entry.pollTimer);
    }

    const interval = Math.max(entry.config.pollIntervalMs ?? 2000, 500);
    entry.pollTimer = setInterval(async () => {
      if (!entry.isConnected || !entry.session || this.isDestroyed) return;

      try {
        await this.readMachineNodes(entry.machineCode);
      } catch (err) {
        entry.lastError = err instanceof Error ? err.message : String(err);
        this.logger.debug(
          `Cyclic read error on OPC UA machine ${entry.machineCode}: ${entry.lastError}`,
        );
      }
    }, interval);
  }

  private resolveNodeMappings(
    machineCode: string,
    custom?: OpcUaNodeMappingDto,
  ): Record<string, string> {
    return {
      cycleTime:
        custom?.cycleTimeNode ??
        `ns=2;s=${machineCode}/CyclicParameters/CycleTime`,
      injectionTime:
        custom?.injectionTimeNode ??
        `ns=2;s=${machineCode}/CyclicParameters/InjectionTime`,
      cushion:
        custom?.cushionNode ??
        `ns=2;s=${machineCode}/CyclicParameters/Cushion`,
      clampingForce:
        custom?.clampingForceNode ??
        `ns=2;s=${machineCode}/ClampingUnit/ClampingForce`,
      barrelZone1Temp:
        custom?.barrelZone1TempNode ??
        `ns=2;s=${machineCode}/HeatingZones/Zone1/Temperature`,
      barrelZone2Temp:
        custom?.barrelZone2TempNode ??
        `ns=2;s=${machineCode}/HeatingZones/Zone2/Temperature`,
      barrelZone3Temp:
        custom?.barrelZone3TempNode ??
        `ns=2;s=${machineCode}/HeatingZones/Zone3/Temperature`,
      barrelZone4Temp:
        custom?.barrelZone4TempNode ??
        `ns=2;s=${machineCode}/HeatingZones/Zone4/Temperature`,
      barrelZone5Temp:
        custom?.barrelZone5TempNode ??
        `ns=2;s=${machineCode}/HeatingZones/Zone5/Temperature`,
      machineStatus:
        custom?.machineStatusNode ??
        `ns=2;s=${machineCode}/MachineStatus`,
      shotCounter:
        custom?.shotCounterNode ??
        `ns=2;s=${machineCode}/ProductionData/ShotCounter`,
    };
  }

  private dispatchNormalizedTelemetry(
    entry: ActiveSessionEntry,
    data: Record<string, any>,
  ): void {
    const rawStatus = String(data.machineStatus ?? '').toUpperCase();
    let status = NormalizedStatusEnum.RUNNING;
    if (rawStatus.includes('FAULT') || rawStatus.includes('ALARM')) {
      status = NormalizedStatusEnum.FAULT;
    } else if (rawStatus.includes('STOP') || rawStatus.includes('OFF')) {
      status = NormalizedStatusEnum.STOPPED;
    } else if (rawStatus.includes('SETUP')) {
      status = NormalizedStatusEnum.SETUP;
    } else if (rawStatus.includes('IDLE')) {
      status = NormalizedStatusEnum.IDLE;
    }

    const metrics: EventMetricsDto = {};
    if (typeof data.cycleTime === 'number') metrics.cycleTimeSeconds = data.cycleTime;
    if (typeof data.injectionTime === 'number') metrics.injectionTimeSeconds = data.injectionTime;
    if (typeof data.cushion === 'number') metrics.cushionPositionMm = data.cushion;
    if (typeof data.clampingForce === 'number') metrics.clampingForceKn = data.clampingForce;

    // Barrel temperatures
    const temperatures = [
      data.barrelZone1Temp,
      data.barrelZone2Temp,
      data.barrelZone3Temp,
      data.barrelZone4Temp,
      data.barrelZone5Temp,
    ]
      .filter((t) => typeof t === 'number')
      .map(Number);

    if (temperatures.length > 0) {
      metrics.barrelTemperatures = temperatures;
    }

    const event: NormalizedMachineEventDto = {
      eventId: randomUUID(),
      machineId: entry.machineCode,
      sourceId: 'opcua-client-daemon',
      sourceTimestamp: new Date().toISOString(),
      normalizedStatus: status,
      eventType: EventTypeEnum.CYCLE_COMPLETED,
      sourceType: SourceTypeEnum.OPC_UA,
      metrics,
    };

    void this.telemetryIngestion.ingestEvent(event);
    this.ingestSelector.recordPacket(entry.machineCode);
  }
}
