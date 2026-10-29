import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SourceTypeEnum {
  SIMULATOR = 'SIMULATOR',
  OPC_UA = 'OPC_UA',
  MQTT_SPB = 'MQTT_SPB',
  MODBUS_TCP = 'MODBUS_TCP',
}

export enum EventTypeEnum {
  MACHINE_STATE_CHANGED = 'MACHINE_STATE_CHANGED',
  CYCLE_COMPLETED = 'CYCLE_COMPLETED',
  COUNTER_UPDATED = 'COUNTER_UPDATED',
  FAULT_STARTED = 'FAULT_STARTED',
  FAULT_CLEARED = 'FAULT_CLEARED',
  SETUP_STARTED = 'SETUP_STARTED',
  SETUP_COMPLETED = 'SETUP_COMPLETED',
  JOB_CONTEXT_CHANGED = 'JOB_CONTEXT_CHANGED',
  PARAMETER_SAMPLE_RECEIVED = 'PARAMETER_SAMPLE_RECEIVED',
  SOURCE_CONNECTION_CHANGED = 'SOURCE_CONNECTION_CHANGED',
}

export enum NormalizedStatusEnum {
  RUNNING = 'RUNNING',
  IDLE = 'IDLE',
  SETUP = 'SETUP',
  STOPPED = 'STOPPED',
  FAULT = 'FAULT',
  DISCONNECTED = 'DISCONNECTED',
  UNKNOWN = 'UNKNOWN',
}

export enum DataQualityEnum {
  GOOD = 'GOOD',
  UNCERTAIN = 'UNCERTAIN',
  BAD = 'BAD',
}

export class EventMetricsDto {
  @IsOptional()
  @IsNumber()
  cycleCounter?: number;

  @IsOptional()
  @IsNumber()
  cycleTimeSeconds?: number;

  @IsOptional()
  @IsNumber()
  injectionTimeSeconds?: number;

  @IsOptional()
  @IsNumber()
  coolingTimeSeconds?: number;

  @IsOptional()
  @IsNumber()
  cushionPositionMm?: number;

  @IsOptional()
  @IsNumber()
  peakInjectionPressureBar?: number;

  @IsOptional()
  @IsNumber()
  clampingForceKn?: number;

  @IsOptional()
  @IsNumber({}, { each: true })
  barrelTemperatures?: number[];
}

export class EventContextDto {
  @IsOptional()
  @IsString()
  productionOrderId?: string;

  @IsOptional()
  @IsString()
  productionRunId?: string;

  @IsOptional()
  @IsString()
  moldId?: string;
}

export class EventFaultDto {
  @IsString()
  @IsNotEmpty()
  faultCode!: string;

  @IsOptional()
  @IsString()
  faultSeverity?: string;

  @IsOptional()
  @IsString()
  faultDescription?: string;
}

export class NormalizedMachineEventDto {
  @IsUUID()
  @IsNotEmpty()
  eventId!: string;

  @IsString()
  @IsNotEmpty()
  machineId!: string;

  @IsString()
  @IsNotEmpty()
  sourceId!: string;

  @IsEnum(SourceTypeEnum)
  sourceType!: SourceTypeEnum;

  @IsISO8601()
  sourceTimestamp!: string;

  @IsOptional()
  @IsISO8601()
  receivedTimestamp?: string;

  @IsEnum(EventTypeEnum)
  eventType!: EventTypeEnum;

  @IsOptional()
  @IsString()
  rawStatus?: string;

  @IsEnum(NormalizedStatusEnum)
  normalizedStatus!: NormalizedStatusEnum;

  @IsOptional()
  @ValidateNested()
  @Type(() => EventContextDto)
  context?: EventContextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EventMetricsDto)
  metrics?: EventMetricsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EventFaultDto)
  fault?: EventFaultDto | null;

  @IsOptional()
  @IsEnum(DataQualityEnum)
  dataQuality?: DataQualityEnum;

  @IsOptional()
  @IsBoolean()
  isSimulated?: boolean;

  @IsOptional()
  @IsString()
  schemaVersion?: string;
}
