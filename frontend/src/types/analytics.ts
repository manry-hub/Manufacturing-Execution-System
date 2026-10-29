export type SpcParameter =
  | 'cushionPositionMm'
  | 'peakInjectionPressureBar'
  | 'cycleTimeSeconds'
  | 'barrelTemperatureZone1'
  | 'barrelTemperatureZone2'
  | 'barrelTemperatureZone3'
  | 'barrelTemperatureZone4'
  | 'qcDimension';

export interface SpcSubgroup {
  subgroupId: number;
  timestamp: string;
  samples: number[];
  mean: number;
  range: number;
  stdDev: number;
  isViolation: boolean;
  violations: string[];
}

export interface NelsonRuleViolation {
  ruleNumber: number;
  ruleName: string;
  description: string;
  subgroupIndices: number[];
}

export interface SpcControlLimits {
  mean: number;
  ucl: number;
  lcl: number;
  sigma: number;
  rangeMean: number;
  rangeUcl: number;
  rangeLcl: number;
}

export interface ProcessCapability {
  usl: number;
  lsl: number;
  target: number;
  cp: number;
  cpk: number;
  cpu: number;
  cpl: number;
  rating: 'EXCELLENT' | 'CAPABLE' | 'MARGINAL' | 'INCAPABLE';
}

export interface SpcResponse {
  machineCode: string;
  parameter: SpcParameter;
  parameterName: string;
  parameterUnit: string;
  subgroupSize: number;
  totalSamples: number;
  subgroups: SpcSubgroup[];
  controlLimits: SpcControlLimits;
  capability: ProcessCapability;
  violations: NelsonRuleViolation[];
}

export interface FmeaItem {
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

export interface FmeaMatrixCell {
  severity: number;
  occurrence: number;
  count: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface FmeaSummary {
  totalAssessed: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  criticalSeverityCount: number;
  averageRpn: number;
  highestRpn: number;
}

export interface FmeaResponse {
  summary: FmeaSummary;
  items: FmeaItem[];
  matrix: FmeaMatrixCell[];
}

export interface CycleTimeHistogramBin {
  binStart: number;
  binEnd: number;
  binLabel: string;
  count: number;
  density: number;
  normalCurveValue: number;
}

export interface CycleTimeDistributionResponse {
  machineCode: string;
  nominalCycleTime: number;
  meanCycleTime: number;
  stdDev: number;
  minCycleTime: number;
  maxCycleTime: number;
  totalCycles: number;
  withinTolerancePercent: number;
  bins: CycleTimeHistogramBin[];
}
