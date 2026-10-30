import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'node:net';
import { TelemetryIngestionService } from '../../telemetry/telemetry.service.js';
import { IngestSourceSelectorService } from './ingest-source-selector.service.js';
import {
  EventTypeEnum,
  NormalizedStatusEnum,
  SourceTypeEnum,
  type NormalizedMachineEventDto,
} from '../../telemetry/dto/normalized-machine-event.dto.js';
import { IngestSourceMode } from '../dto/modbus-config.dto.js';

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

@Injectable()
export class ModbusTcpGatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ModbusTcpGatewayService.name);

  private server: net.Server | null = null;
  private isServerListening = false;
  private readonly serverPort: number;
  private activeSockets = new Set<net.Socket>();
  private totalRequestsServed = 0;
  private totalRegistersWritten = 0;
  private pollIntervalTimer: NodeJS.Timeout | null = null;
  private pollerTxId = 1;

  // Holding Registers memory bank (UnitId -> Array of 16-bit registers)
  // Mapping Unit ID 1..10 to IMM-01..IMM-10
  private readonly registerBanks = new Map<number, number[]>();
  private readonly unitIdToMachineCode = new Map<number, string>();
  private readonly machineCodeToUnitId = new Map<string, number>();
  private readonly lastUpdateMap = new Map<number, Date>();

  constructor(
    private readonly configService: ConfigService,
    private readonly telemetryIngestion: TelemetryIngestionService,
    private readonly ingestSelector: IngestSourceSelectorService,
  ) {
    this.serverPort = Number(this.configService.get<string>('MODBUS_TCP_PORT') || 5502);
    this.initializeRegisterBanks();
  }

  private initializeRegisterBanks(): void {
    for (let i = 1; i <= 10; i++) {
      const code = `IMM-${i.toString().padStart(2, '0')}`;
      this.unitIdToMachineCode.set(i, code);
      this.machineCodeToUnitId.set(code, i);

      // Default baseline holding registers (16 words):
      // 0: Status (1=RUNNING)
      // 1-2: Shot Counter (0)
      // 3: Cycle Time (180 = 18.0s)
      // 4: Injection Time (38 = 3.8s)
      // 5: Cushion (425 = 4.25mm)
      // 6: Peak Pressure (136 bar)
      // 7: Clamp Force (1500 kN)
      // 8: Zone 1 (2050 = 205.0 C)
      // 9: Zone 2 (2150 = 215.0 C)
      // 10: Zone 3 (2280 = 228.0 C)
      // 11: Zone 4 (2300 = 230.0 C)
      // 12: Nozzle (2320 = 232.0 C)
      // 13: Fault Code (0 = None)
      // 14: Good Parts (0)
      // 15: Scrap Parts (0)
      const defaultRegisters = [
        1, 0, 100, 180, 38, 425, 136, 1500,
        2050, 2150, 2280, 2300, 2320, 0, 98, 2,
      ];
      this.registerBanks.set(i, defaultRegisters);
      this.lastUpdateMap.set(i, new Date());
    }
  }

  async onModuleInit(): Promise<void> {
    const isEnabled = this.configService.get<string>('MODBUS_ENABLED', 'true') === 'true';
    if (!isEnabled) {
      this.logger.log('Modbus TCP Gateway is disabled via configuration (MODBUS_ENABLED=false)');
      return;
    }

    this.startServer();
    this.startPollingEngine();
  }

  onModuleDestroy(): void {
    this.stopPollingEngine();
    this.stopServer();
  }

  /**
   * Starts the Modbus TCP Server socket listening for external PLC connections.
   */
  public startServer(): void {
    if (this.server) return;

    try {
      this.server = net.createServer((socket) => {
        this.activeSockets.add(socket);
        this.logger.debug(`Modbus TCP client connected from ${socket.remoteAddress}:${socket.remotePort}`);

        let bufferAccumulator: any = Buffer.alloc(0);

        socket.on('data', (data) => {
          bufferAccumulator = Buffer.concat([bufferAccumulator, data]);
          bufferAccumulator = this.processModbusFrames(socket, bufferAccumulator as Buffer);
        });

        socket.on('close', () => {
          this.activeSockets.delete(socket);
          this.logger.debug(`Modbus TCP client disconnected: ${socket.remoteAddress}`);
        });

        socket.on('error', (err) => {
          this.activeSockets.delete(socket);
          this.logger.warn(`Modbus TCP socket error: ${err.message}`);
        });
      });

      this.server.listen(this.serverPort, '0.0.0.0', () => {
        this.isServerListening = true;
        this.logger.log(`Modbus TCP Gateway Server listening on 0.0.0.0:${this.serverPort}`);
      });

      this.server.on('error', (err: any) => {
        this.isServerListening = false;
        this.logger.warn(`Modbus TCP Server listen warning on port ${this.serverPort}: ${err.message}`);
      });
    } catch (err: any) {
      this.logger.error(`Failed to initialize Modbus TCP server: ${err.message}`);
    }
  }

  public stopServer(): void {
    if (this.server) {
      for (const socket of this.activeSockets) {
        socket.destroy();
      }
      this.activeSockets.clear();
      this.server.close();
      this.server = null;
      this.isServerListening = false;
      this.logger.log('Modbus TCP Gateway Server stopped');
    }
  }

  /**
   * Starts periodic polling engine for machines configured with MODBUS_TCP client mode.
   */
  private startPollingEngine(): void {
    if (this.pollIntervalTimer) return;

    this.pollIntervalTimer = setInterval(() => {
      void this.pollConfiguredModbusMachines();
    }, 2000);
  }

  private stopPollingEngine(): void {
    if (this.pollIntervalTimer) {
      clearInterval(this.pollIntervalTimer);
      this.pollIntervalTimer = null;
    }
  }

  /**
   * Processes inbound byte stream from Modbus TCP socket and responds with MBAP packets.
   */
  private processModbusFrames(socket: net.Socket, buffer: Buffer): Buffer {
    while (buffer.length >= 7) {
      const transactionId = buffer.readUInt16BE(0);
      const protocolId = buffer.readUInt16BE(2);
      const length = buffer.readUInt16BE(4);
      const unitId = buffer.readUInt8(6);

      // Check protocol ID (0x0000 = Modbus)
      if (protocolId !== 0) {
        // Discard invalid protocol
        return Buffer.from(buffer.subarray(1));
      }

      // Check if full packet received (MBAP 6 bytes + length)
      if (buffer.length < 6 + length) {
        break; // Wait for more data
      }

      const pdu = buffer.subarray(7, 6 + length);
      buffer = Buffer.from(buffer.subarray(6 + length)); // Consume packet

      this.totalRequestsServed++;
      const responsePdu = this.handlePdu(unitId, pdu);

      if (responsePdu) {
        const responseMbap = Buffer.alloc(7);
        responseMbap.writeUInt16BE(transactionId, 0);
        responseMbap.writeUInt16BE(0, 2); // Protocol ID = 0
        responseMbap.writeUInt16BE(responsePdu.length + 1, 4); // Length = Unit ID + PDU
        responseMbap.writeUInt8(unitId, 6);

        socket.write(Buffer.concat([responseMbap, responsePdu]));
      }
    }

    return Buffer.from(buffer);
  }

  /**
   * Handles Modbus PDU (Function Codes 0x03, 0x04, 0x06, 0x10).
   */
  public handlePdu(unitId: number, pdu: Buffer): Buffer | null {
    if (pdu.length < 1) return null;
    const functionCode = pdu.readUInt8(0);
    const registers = this.registerBanks.get(unitId) ?? this.registerBanks.get(1)!;

    switch (functionCode) {
      // 0x03: Read Holding Registers
      // 0x04: Read Input Registers
      case 0x03:
      case 0x04: {
        if (pdu.length < 5) return this.makeExceptionPdu(functionCode, 0x03);
        const startAddr = pdu.readUInt16BE(1);
        const quantity = pdu.readUInt16BE(3);

        if (startAddr + quantity > 125 || quantity < 1) {
          return this.makeExceptionPdu(functionCode, 0x02); // Illegal Data Address
        }

        const byteCount = quantity * 2;
        const res = Buffer.alloc(2 + byteCount);
        res.writeUInt8(functionCode, 0);
        res.writeUInt8(byteCount, 1);

        for (let i = 0; i < quantity; i++) {
          const val = registers[startAddr + i] ?? 0;
          res.writeUInt16BE(val, 2 + i * 2);
        }

        return res;
      }

      // 0x06: Write Single Register
      case 0x06: {
        if (pdu.length < 5) return this.makeExceptionPdu(functionCode, 0x03);
        const regAddr = pdu.readUInt16BE(1);
        const value = pdu.readUInt16BE(3);

        this.setRegisterValue(unitId, regAddr, value);
        this.totalRegistersWritten++;

        // Echo back written address and value
        const res = Buffer.alloc(5);
        res.writeUInt8(0x06, 0);
        res.writeUInt16BE(regAddr, 1);
        res.writeUInt16BE(value, 3);
        return res;
      }

      // 0x10 (16): Write Multiple Registers
      case 0x10: {
        if (pdu.length < 6) return this.makeExceptionPdu(functionCode, 0x03);
        const startAddr = pdu.readUInt16BE(1);
        const quantity = pdu.readUInt16BE(3);
        const byteCount = pdu.readUInt8(5);

        if (pdu.length < 6 + byteCount || byteCount !== quantity * 2) {
          return this.makeExceptionPdu(functionCode, 0x03);
        }

        for (let i = 0; i < quantity; i++) {
          const val = pdu.readUInt16BE(6 + i * 2);
          this.setRegisterValue(unitId, startAddr + i, val, false);
        }

        this.totalRegistersWritten += quantity;
        this.triggerIngestionForUnit(unitId);

        // Response echo
        const res = Buffer.alloc(5);
        res.writeUInt8(0x10, 0);
        res.writeUInt16BE(startAddr, 1);
        res.writeUInt16BE(quantity, 3);
        return res;
      }

      default:
        return this.makeExceptionPdu(functionCode, 0x01); // Illegal Function
    }
  }

  private makeExceptionPdu(functionCode: number, exceptionCode: number): Buffer {
    const res = Buffer.alloc(2);
    res.writeUInt8(functionCode | 0x80, 0);
    res.writeUInt8(exceptionCode, 1);
    return res;
  }

  /**
   * Sets register value for a unit and optionally triggers normalized telemetry ingestion.
   */
  public setRegisterValue(unitId: number, regAddress: number, value: number, triggerIngest: boolean = true): void {
    let bank = this.registerBanks.get(unitId);
    if (!bank) {
      bank = Array.from({ length: 16 }, () => 0);
      this.registerBanks.set(unitId, bank);
    }

    while (bank.length <= regAddress) {
      bank.push(0);
    }

    bank[regAddress] = value & 0xffff;
    this.lastUpdateMap.set(unitId, new Date());

    if (triggerIngest) {
      this.triggerIngestionForUnit(unitId);
    }
  }

  /**
   * Writes registers by machine code.
   */
  public writeRegisterByMachine(machineCode: string, regAddress: number, value: number): void {
    const unitId = this.machineCodeToUnitId.get(machineCode) ?? 1;
    this.setRegisterValue(unitId, regAddress, value, true);
  }

  public writeMultipleRegistersByMachine(machineCode: string, startAddress: number, values: number[]): void {
    const unitId = this.machineCodeToUnitId.get(machineCode) ?? 1;
    for (let i = 0; i < values.length; i++) {
      this.setRegisterValue(unitId, startAddress + i, values[i], false);
    }
    this.triggerIngestionForUnit(unitId);
  }

  /**
   * Translates 16 holding registers into canonical NormalizedMachineEventDto and ingests into MES.
   */
  public triggerIngestionForUnit(unitId: number): void {
    const machineCode = this.unitIdToMachineCode.get(unitId) ?? `IMM-${unitId.toString().padStart(2, '0')}`;
    const registers = this.registerBanks.get(unitId);
    if (!registers) return;

    // Record packet count in selector registry
    this.ingestSelector.recordPacket(machineCode);

    // If machine is set to SIMULATOR or MQTT, only process if explicitly configured
    if (!this.ingestSelector.isModbusActiveFor(machineCode) && this.ingestSelector.getMachineSource(machineCode)?.source !== IngestSourceMode.MODBUS_TCP) {
      // Still update holding registers in memory, but don't override simulator unless machine is in MODBUS_TCP mode
      return;
    }

    const event = this.convertRegistersToEvent(machineCode, registers);
    void this.telemetryIngestion.ingestEvent(event);
  }

  /**
   * Converts holding registers to NormalizedMachineEventDto.
   */
  public convertRegistersToEvent(machineCode: string, registers: number[]): NormalizedMachineEventDto {
    const statusRaw = registers[0] ?? 1;
    let normalizedStatus = NormalizedStatusEnum.RUNNING;
    let rawStatus = 'RUNNING';

    switch (statusRaw) {
      case 1:
        normalizedStatus = NormalizedStatusEnum.RUNNING;
        rawStatus = 'RUNNING';
        break;
      case 2:
        normalizedStatus = NormalizedStatusEnum.IDLE;
        rawStatus = 'IDLE';
        break;
      case 3:
        normalizedStatus = NormalizedStatusEnum.SETUP;
        rawStatus = 'SETUP';
        break;
      case 4:
        normalizedStatus = NormalizedStatusEnum.STOPPED;
        rawStatus = 'STOPPED';
        break;
      case 5:
        normalizedStatus = NormalizedStatusEnum.FAULT;
        rawStatus = 'FAULT';
        break;
      case 6:
        normalizedStatus = NormalizedStatusEnum.DISCONNECTED;
        rawStatus = 'DISCONNECTED';
        break;
      default:
        normalizedStatus = NormalizedStatusEnum.UNKNOWN;
        rawStatus = 'UNKNOWN';
        break;
    }

    const shotHigh = registers[1] ?? 0;
    const shotLow = registers[2] ?? 0;
    const cycleCounter = (shotHigh << 16) | shotLow;

    const cycleTimeSeconds = (registers[3] ?? 180) / 10;
    const injectionTimeSeconds = (registers[4] ?? 38) / 10;
    const cushionPositionMm = (registers[5] ?? 425) / 100;
    const peakPressureBar = registers[6] ?? 136;
    const clampingForceKn = registers[7] ?? 1500;

    const t1 = (registers[8] ?? 2050) / 10;
    const t2 = (registers[9] ?? 2150) / 10;
    const t3 = (registers[10] ?? 2280) / 10;
    const t4 = (registers[11] ?? 2300) / 10;
    const barrelTemperatures = [t1, t2, t3, t4];

    const faultCodeRaw = registers[13] ?? 0;
    let fault: { faultCode: string; description: string; severity: string } | undefined;

    if (faultCodeRaw > 0) {
      const faultMap: Record<number, { code: string; desc: string }> = {
        101: { code: 'ALM-TEMP-ZONE1', desc: 'Barrel zone 1 thermocouple open loop / runaway' },
        102: { code: 'ALM-HYD-PRESSURE', desc: 'Hydraulic main line pressure below setpoint' },
        103: { code: 'ALM-CLAMP-SAFETY', desc: 'Front safety gate optical interlock tripped' },
        104: { code: 'ALM-FEED-HOPPER', desc: 'Hopper level optical switch starvation' },
      };
      const f = faultMap[faultCodeRaw] ?? { code: `ALM-MODBUS-${faultCodeRaw}`, desc: 'Generic Modbus PLC fault' };
      fault = {
        faultCode: f.code,
        description: f.desc,
        severity: 'CRITICAL',
      };
    }

    return {
      eventId: `modbus-${machineCode}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      sourceId: 'modbus-tcp-gateway',
      machineId: machineCode,
      sourceType: SourceTypeEnum.MODBUS_TCP,
      eventType: normalizedStatus === NormalizedStatusEnum.FAULT ? EventTypeEnum.FAULT_STARTED : EventTypeEnum.CYCLE_COMPLETED,
      normalizedStatus,
      rawStatus,
      sourceTimestamp: new Date().toISOString(),
      metrics: {
        cycleCounter,
        cycleTimeSeconds,
        injectionTimeSeconds,
        cushionPositionMm,
        peakInjectionPressureBar: peakPressureBar,
        clampingForceKn,
        barrelTemperatures,
      },
      fault,
      isSimulated: false,
    };
  }

  /**
   * Polls all machines configured with MODBUS_TCP client ingestion mode.
   */
  public async pollConfiguredModbusMachines(): Promise<void> {
    const sources = this.ingestSelector.getAllSources();
    const modbusMachines = sources.filter((s) => s.source === IngestSourceMode.MODBUS_TCP);

    for (const machine of modbusMachines) {
      const config = machine.modbusConfig;
      if (!config) continue;

      // If pointing to localhost:5502, read directly from register memory to avoid self-socket overhead
      if ((config.host === '127.0.0.1' || config.host === 'localhost') && config.port === this.serverPort) {
        this.triggerIngestionForUnit(config.unitId);
        continue;
      }

      // Otherwise connect via standard TCP client socket
      try {
        await this.pollRemoteModbusDevice(machine.machineCode, config.host, config.port, config.unitId);
      } catch (err: any) {
        this.logger.debug(`Modbus poll for ${machine.machineCode} at ${config.host}:${config.port} skipped: ${err.message}`);
      }
    }
  }

  /**
   * Connects to a physical or remote Modbus TCP PLC, polls 16 holding registers, and updates memory bank.
   */
  public pollRemoteModbusDevice(machineCode: string, host: string, port: number, unitId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(1500);

      const txId = this.pollerTxId++;
      if (this.pollerTxId > 65535) this.pollerTxId = 1;

      // Build 0x03 Read Holding Registers Request
      const req = Buffer.alloc(12);
      req.writeUInt16BE(txId, 0);
      req.writeUInt16BE(0, 2);
      req.writeUInt16BE(6, 4); // Length = 6
      req.writeUInt8(unitId, 6);
      req.writeUInt8(0x03, 7); // FC 03
      req.writeUInt16BE(0, 8); // Start Address = 0
      req.writeUInt16BE(16, 10); // Quantity = 16

      socket.connect(port, host, () => {
        socket.write(req);
      });

      let responseBuffer = Buffer.alloc(0);

      socket.on('data', (chunk) => {
        responseBuffer = Buffer.concat([responseBuffer, chunk]);
        if (responseBuffer.length >= 9) {
          const respTxId = responseBuffer.readUInt16BE(0);
          const byteCount = responseBuffer.readUInt8(8);
          if (respTxId === txId && responseBuffer.length >= 9 + byteCount) {
            const qty = byteCount / 2;
            for (let i = 0; i < qty; i++) {
              const val = responseBuffer.readUInt16BE(9 + i * 2);
              this.setRegisterValue(unitId, i, val, false);
            }
            this.triggerIngestionForUnit(unitId);
            socket.destroy();
            resolve();
          }
        }
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Modbus connection timeout'));
      });

      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });
    });
  }

  /**
   * Returns Modbus Gateway status and register snapshots.
   */
  public getStatus(): ModbusGatewayStatus {
    const trackedMachines: ModbusRegisterSnapshot[] = [];

    for (const [unitId, regs] of this.registerBanks.entries()) {
      const code = this.unitIdToMachineCode.get(unitId) ?? `IMM-${unitId}`;
      const lastUpdated = this.lastUpdateMap.get(unitId)?.toISOString() ?? new Date().toISOString();
      trackedMachines.push({
        unitId,
        machineCode: code,
        registers: [...regs],
        lastUpdatedAt: lastUpdated,
      });
    }

    return {
      enabled: true,
      serverListening: this.isServerListening,
      port: this.serverPort,
      activeClientCount: this.activeSockets.size,
      totalRequestsServed: this.totalRequestsServed,
      totalRegistersWritten: this.totalRegistersWritten,
      pollingActive: this.pollIntervalTimer !== null,
      trackedMachines,
    };
  }
}
