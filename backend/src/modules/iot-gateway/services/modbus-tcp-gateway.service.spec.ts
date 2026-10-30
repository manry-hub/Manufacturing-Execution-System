import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModbusTcpGatewayService } from './modbus-tcp-gateway.service.js';
import { IngestSourceSelectorService } from './ingest-source-selector.service.js';
import { ConfigService } from '@nestjs/config';
import { TelemetryIngestionService } from '../../telemetry/telemetry.service.js';
import {
  NormalizedStatusEnum,
  SourceTypeEnum,
} from '../../telemetry/dto/normalized-machine-event.dto.js';
import { IngestSourceMode } from '../dto/modbus-config.dto.js';

describe('ModbusTcpGatewayService & IngestSourceSelectorService', () => {
  let modbusGateway: ModbusTcpGatewayService;
  let ingestSelector: IngestSourceSelectorService;
  let telemetryService: any;
  let configService: any;

  beforeEach(() => {
    configService = {
      get: vi.fn((key: string, defaultValue?: string) => {
        if (key === 'MODBUS_TCP_PORT') return '5502';
        if (key === 'MODBUS_ENABLED') return 'false'; // disable socket binding in unit tests
        return defaultValue;
      }),
    };

    telemetryService = {
      ingestEvent: vi.fn().mockResolvedValue({ success: true, eventId: 'e-1' }),
    };

    ingestSelector = new IngestSourceSelectorService();

    modbusGateway = new ModbusTcpGatewayService(
      configService as unknown as ConfigService,
      telemetryService as unknown as TelemetryIngestionService,
      ingestSelector,
    );
  });

  describe('IngestSourceSelectorService', () => {
    it('should initialize 10 machines with SIMULATOR source by default', () => {
      const sources = ingestSelector.getAllSources();
      expect(sources).toHaveLength(10);
      expect(sources[0].machineCode).toBe('IMM-01');
      expect(sources[0].source).toBe(IngestSourceMode.SIMULATOR);
      expect(ingestSelector.isSimulatorActiveFor('IMM-01')).toBe(true);
      expect(ingestSelector.isModbusActiveFor('IMM-01')).toBe(false);
    });

    it('should switch machine source and configuration', () => {
      ingestSelector.setMachineSource('IMM-01', {
        source: IngestSourceMode.MODBUS_TCP,
        modbusConfig: {
          host: '192.168.1.100',
          port: 502,
          unitId: 1,
          pollIntervalMs: 1000,
          startRegister: 0,
          registerCount: 16,
        },
      });

      expect(ingestSelector.isSimulatorActiveFor('IMM-01')).toBe(false);
      expect(ingestSelector.isModbusActiveFor('IMM-01')).toBe(true);
      const machine = ingestSelector.getMachineSource('IMM-01');
      expect(machine?.source).toBe(IngestSourceMode.MODBUS_TCP);
      expect(machine?.modbusConfig?.host).toBe('192.168.1.100');
    });
  });

  describe('Modbus Protocol Decoding & Holding Registers', () => {
    it('should read holding registers via FC 03', () => {
      // PDU for FC 03: FC(1) + startAddr(2) + quantity(2)
      const pdu = Buffer.alloc(5);
      pdu.writeUInt8(0x03, 0);
      pdu.writeUInt16BE(0, 1); // Start address 0
      pdu.writeUInt16BE(4, 3); // Read 4 registers

      const response = modbusGateway.handlePdu(1, pdu);
      expect(response).not.toBeNull();
      expect(response!.readUInt8(0)).toBe(0x03);
      expect(response!.readUInt8(1)).toBe(8); // 4 registers * 2 bytes = 8 bytes
      // Reg 0: Status (1 = RUNNING)
      expect(response!.readUInt16BE(2)).toBe(1);
    });

    it('should write single holding register via FC 06', () => {
      // PDU for FC 06: FC(1) + regAddr(2) + value(2)
      const pdu = Buffer.alloc(5);
      pdu.writeUInt8(0x06, 0);
      pdu.writeUInt16BE(0, 1); // Reg 0 (Status)
      pdu.writeUInt16BE(5, 3); // Value 5 (FAULT)

      const response = modbusGateway.handlePdu(1, pdu);
      expect(response).not.toBeNull();
      expect(response!.readUInt8(0)).toBe(0x06);
      expect(response!.readUInt16BE(1)).toBe(0);
      expect(response!.readUInt16BE(3)).toBe(5);

      // Verify register updated in memory
      const status = modbusGateway.getStatus();
      const imm01 = status.trackedMachines.find((m) => m.unitId === 1);
      expect(imm01?.registers[0]).toBe(5);
    });

    it('should write multiple holding registers via FC 16 and trigger normalized telemetry', () => {
      // Set machine to MODBUS_TCP mode so it triggers telemetry ingestion
      ingestSelector.setMachineSource('IMM-01', {
        source: IngestSourceMode.MODBUS_TCP,
      });

      // PDU for FC 16 (0x10): FC(1) + start(2) + qty(2) + byteCount(1) + values(N*2)
      const values = [
        1,       // 0: RUNNING
        0, 2500, // 1-2: Shots 2500
        195,     // 3: Cycle time 19.5s
        40,      // 4: Injection time 4.0s
        415,     // 5: Cushion 4.15mm
        140,     // 6: Pressure 140 bar
        1550,    // 7: Clamping 1550 kN
        2060, 2160, 2290, 2310, 2325, // 8-12: Temperatures
        0,       // 13: Fault None
        2480, 20 // 14-15: Good & scrap
      ];

      const pdu = Buffer.alloc(6 + values.length * 2);
      pdu.writeUInt8(0x10, 0);
      pdu.writeUInt16BE(0, 1); // Start 0
      pdu.writeUInt16BE(values.length, 3);
      pdu.writeUInt8(values.length * 2, 5);
      for (let i = 0; i < values.length; i++) {
        pdu.writeUInt16BE(values[i], 6 + i * 2);
      }

      const response = modbusGateway.handlePdu(1, pdu);
      expect(response).not.toBeNull();
      expect(response!.readUInt8(0)).toBe(0x10);
      expect(response!.readUInt16BE(1)).toBe(0);
      expect(response!.readUInt16BE(3)).toBe(values.length);

      // Verify telemetry ingestion was called with canonical normalized event
      expect(telemetryService.ingestEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          machineId: 'IMM-01',
          sourceType: SourceTypeEnum.MODBUS_TCP,
          normalizedStatus: NormalizedStatusEnum.RUNNING,
          metrics: expect.objectContaining({
            cycleCounter: 2500,
            cycleTimeSeconds: 19.5,
            peakInjectionPressureBar: 140,
            clampingForceKn: 1550,
            barrelTemperatures: [206.0, 216.0, 229.0, 231.0],
          }),
        }),
      );
    });

    it('should correctly convert fault code in register 13 to canonical fault event', () => {
      const registers = [
        5, 0, 100, 180, 38, 425, 136, 1500,
        2050, 2150, 2280, 2300, 2320,
        101, // Fault: ALM-TEMP-ZONE1
        98, 2,
      ];

      const event = modbusGateway.convertRegistersToEvent('IMM-01', registers);
      expect(event.normalizedStatus).toBe(NormalizedStatusEnum.FAULT);
      expect(event.fault).toBeDefined();
      expect(event.fault?.faultCode).toBe('ALM-TEMP-ZONE1');
      expect(event.sourceType).toBe(SourceTypeEnum.MODBUS_TCP);
    });
  });
});
