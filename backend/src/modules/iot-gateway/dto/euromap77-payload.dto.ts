import {
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EuromapMouldStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CLAMPED = 'CLAMPED',
  MOVING = 'MOVING',
  EJECTING = 'EJECTING',
}

export enum EuromapMachineStatus {
  RUNNING = 'RUNNING',
  IDLE = 'IDLE',
  SETUP = 'SETUP',
  STOPPED = 'STOPPED',
  FAULT = 'FAULT',
  DISCONNECTED = 'DISCONNECTED',
  UNKNOWN = 'UNKNOWN',
}

export class EuromapCyclicParametersDto {
  @IsOptional()
  @IsNumber()
  cycleTime?: number;

  @IsOptional()
  @IsNumber()
  injectionTime?: number;

  @IsOptional()
  @IsNumber()
  cushion?: number;

  @IsOptional()
  @IsNumber()
  peakInjectionPressure?: number;
}

export class EuromapClampingUnitDto {
  @IsOptional()
  @IsNumber()
  clampingForce?: number;

  @IsOptional()
  @IsString()
  mouldStatus?: string;
}

export class EuromapHeatingZonesDto {
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  zoneTemperatures?: number[];

  @IsOptional()
  @IsNumber()
  nozzleTemperature?: number;
}

export class EuromapProductionDto {
  @IsOptional()
  @IsNumber()
  totalParts?: number;

  @IsOptional()
  @IsNumber()
  goodParts?: number;

  @IsOptional()
  @IsNumber()
  badParts?: number;
}

export class EuromapFaultDto {
  @IsString()
  @IsNotEmpty()
  faultCode!: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class Euromap77PayloadDto {
  @IsOptional()
  @IsString()
  messageId?: string;

  @IsOptional()
  @IsISO8601()
  timestamp?: string;

  @IsString()
  @IsNotEmpty()
  machineCode!: string;

  @IsOptional()
  @IsString()
  protocol?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EuromapCyclicParametersDto)
  cyclicParameters?: EuromapCyclicParametersDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EuromapClampingUnitDto)
  clampingUnit?: EuromapClampingUnitDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EuromapHeatingZonesDto)
  heatingZones?: EuromapHeatingZonesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EuromapProductionDto)
  production?: EuromapProductionDto;

  @IsOptional()
  @IsString()
  machineStatus?: string;

  @IsOptional()
  @IsString()
  rawStatus?: string;

  @IsOptional()
  @IsNumber()
  cycleTime?: number;

  @IsOptional()
  @IsNumber()
  totalParts?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  barrelTemperatures?: number[];

  @IsOptional()
  @IsString()
  faultCode?: string;

  @IsOptional()
  @IsString()
  faultSeverity?: string;

  @IsOptional()
  @IsString()
  faultDescription?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EuromapFaultDto)
  activeFault?: EuromapFaultDto | null;
}
