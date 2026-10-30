import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class OpcUaNodeMappingDto {
  @IsOptional()
  @IsString()
  cycleTimeNode?: string;

  @IsOptional()
  @IsString()
  injectionTimeNode?: string;

  @IsOptional()
  @IsString()
  cushionNode?: string;

  @IsOptional()
  @IsString()
  clampingForceNode?: string;

  @IsOptional()
  @IsString()
  barrelZone1TempNode?: string;

  @IsOptional()
  @IsString()
  barrelZone2TempNode?: string;

  @IsOptional()
  @IsString()
  barrelZone3TempNode?: string;

  @IsOptional()
  @IsString()
  barrelZone4TempNode?: string;

  @IsOptional()
  @IsString()
  barrelZone5TempNode?: string;

  @IsOptional()
  @IsString()
  machineStatusNode?: string;

  @IsOptional()
  @IsString()
  shotCounterNode?: string;
}

export class OpcUaClientConfigDto {
  @IsNotEmpty()
  @IsString()
  endpointUrl!: string;

  @IsOptional()
  @IsString()
  securityMode?: string;

  @IsOptional()
  @IsString()
  securityPolicy?: string;

  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(60000)
  pollIntervalMs: number = 2000;

  @IsOptional()
  nodeMappings?: OpcUaNodeMappingDto;
}

export interface OpcUaSessionStatus {
  machineCode: string;
  endpointUrl: string;
  connected: boolean;
  monitoredNodesCount: number;
  lastReadTimestamp?: string;
  lastValues?: Record<string, any>;
  lastError?: string;
}

export interface OpcUaGatewayStatus {
  enabled: boolean;
  activeSessionsCount: number;
  totalReadsExecuted: number;
  sessions: OpcUaSessionStatus[];
}
