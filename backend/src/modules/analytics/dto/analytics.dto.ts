import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum SpcParameterEnum {
  CUSHION_POSITION = 'cushionPositionMm',
  INJECTION_PRESSURE = 'peakInjectionPressureBar',
  CYCLE_TIME = 'cycleTimeSeconds',
  BARREL_TEMP_Z1 = 'barrelTemperatureZone1',
  BARREL_TEMP_Z2 = 'barrelTemperatureZone2',
  BARREL_TEMP_Z3 = 'barrelTemperatureZone3',
  BARREL_TEMP_Z4 = 'barrelTemperatureZone4',
  QC_DIMENSION = 'qcDimension',
}

export class SpcQueryDto {
  @IsOptional()
  @IsString()
  machineCode?: string = 'IMM-01';

  @IsOptional()
  @IsEnum(SpcParameterEnum)
  parameter?: SpcParameterEnum = SpcParameterEnum.CUSHION_POSITION;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2)
  @Max(10)
  subgroupSize?: number = 5;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(20)
  @Max(500)
  sampleCount?: number = 100;
}

export interface SpcSubgroupDto {
  subgroupId: number;
  timestamp: string;
  samples: number[];
  mean: number;
  range: number;
  stdDev: number;
  isViolation: boolean;
  violations: string[];
}

export interface NelsonRuleViolationDto {
  ruleNumber: number;
  ruleName: string;
  description: string;
  subgroupIndices: number[];
}

export interface SpcControlLimitsDto {
  mean: number;
  ucl: number;
  lcl: number;
  sigma: number;
  rangeMean: number;
  rangeUcl: number;
  rangeLcl: number;
}

export interface ProcessCapabilityDto {
  usl: number;
  lsl: number;
  target: number;
  cp: number;
  cpk: number;
  cpl: number;
  cpu: number;
  rating: 'EXCELLENT' | 'CAPABLE' | 'MARGINAL' | 'INCAPABLE';
}

export interface SpcResponseDto {
  machineCode: string;
  parameter: SpcParameterEnum;
  parameterName: string;
  parameterUnit: string;
  subgroupSize: number;
  totalSamples: number;
  subgroups: SpcSubgroupDto[];
  controlLimits: SpcControlLimitsDto;
  capability: ProcessCapabilityDto;
  violations: NelsonRuleViolationDto[];
}

export class FmeaQueryDto {
  @IsOptional()
  @IsString()
  machineCode?: string;

  @IsOptional()
  @IsString()
  riskFilter?: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'ALL';
}

export interface FmeaItemDto {
  id: string;
  subsystem: string;
  failureMode: string;
  failureEffect: string;
  potentialCause: string;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedAction: string;
  status: 'ACTION_REQUIRED' | 'MONITORING' | 'CONTROLLED';
  linkedIncidentCount: number;
  lastIncidentAt?: string;
}

export interface FmeaMatrixCellDto {
  severity: number;
  occurrence: number;
  count: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface FmeaSummaryDto {
  totalAssessed: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  criticalSeverityCount: number;
  averageRpn: number;
  highestRpn: number;
}

export interface FmeaResponseDto {
  summary: FmeaSummaryDto;
  items: FmeaItemDto[];
  matrix: FmeaMatrixCellDto[];
}

export class CycleTimeQueryDto {
  @IsOptional()
  @IsString()
  machineCode?: string = 'IMM-01';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(20)
  @Max(500)
  sampleCount?: number = 100;
}

export interface CycleTimeHistogramBinDto {
  binStart: number;
  binEnd: number;
  binLabel: string;
  count: number;
  density: number;
  normalCurveValue: number;
}

export interface CycleTimeDistributionResponseDto {
  machineCode: string;
  nominalCycleTime: number;
  meanCycleTime: number;
  stdDev: number;
  minCycleTime: number;
  maxCycleTime: number;
  totalCycles: number;
  withinTolerancePercent: number;
  bins: CycleTimeHistogramBinDto[];
}
