import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import type { OpcUaClientConfigDto } from './opcua-config.dto.js';

export enum IngestSourceMode {
  SIMULATOR = 'SIMULATOR',
  MQTT = 'MQTT',
  MODBUS_TCP = 'MODBUS_TCP',
  OPC_UA = 'OPC_UA',
}

export class ModbusClientConfigDto {
  @IsNotEmpty()
  @IsString()
  host!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port: number = 5502;

  @IsInt()
  @Min(1)
  @Max(247)
  unitId: number = 1;

  @IsInt()
  @Min(250)
  @Max(60000)
  pollIntervalMs: number = 2000;

  @IsInt()
  @Min(0)
  @Max(65535)
  startRegister: number = 0;

  @IsInt()
  @Min(1)
  @Max(125)
  registerCount: number = 16;
}

export class UpdateIngestSourceDto {
  @IsNotEmpty()
  @IsEnum(IngestSourceMode)
  source!: IngestSourceMode;

  @IsOptional()
  modbusConfig?: ModbusClientConfigDto;

  @IsOptional()
  @IsString()
  mqttTopic?: string;

  @IsOptional()
  opcuaConfig?: OpcUaClientConfigDto;
}

export class ModbusWriteRegisterDto {
  @IsNotEmpty()
  @IsString()
  machineCode!: string;

  @IsInt()
  @Min(0)
  @Max(65535)
  registerAddress!: number;

  @IsInt()
  @Min(0)
  @Max(65535)
  value!: number;
}

export class ModbusWriteMultipleRegistersDto {
  @IsNotEmpty()
  @IsString()
  machineCode!: string;

  @IsInt()
  @Min(0)
  @Max(65535)
  startAddress!: number;

  @IsNumber({}, { each: true })
  values!: number[];
}
