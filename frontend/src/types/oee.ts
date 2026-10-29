export interface OeeCalculationResult {
  scopeType: 'MACHINE' | 'PLANT' | 'RUN';
  scopeId: string;
  windowType: 'RUN' | 'SHIFT' | 'DAY';
  periodStart: string;
  periodEnd: string;
  plannedProductionTimeMinutes: number;
  operatingTimeMinutes: number;
  downtimeMinutes: number;
  unplannedDowntimeMinutes: number;
  plannedDowntimeMinutes: number;
  availability: number; // 0.0 - 1.0
  performance: number;  // 0.0 - 1.0 (or capped)
  quality: number;      // 0.0 - 1.0
  oee: number;          // 0.0 - 1.0
  totalPartsProduced: number;
  goodPartsProduced: number;
  scrapPartsProduced: number;
  isOverSpeed?: boolean;
}

export interface OeeBreakdownDetails {
  plannedProductionTimeSeconds: number;
  operatingTimeSeconds: number;
  idealCycleTimeSeconds: number;
  totalPartsProduced: number;
  goodPartsCount: number;
  scrapPartsCount: number;
}

export interface OeeMetricsResult {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  speedOverPerformance: boolean;
  isValid: boolean;
  breakdown: OeeBreakdownDetails;
}

export interface MachineOeeBreakdownItem {
  machineId: string;
  machineCode: string;
  machineName: string;
  metrics: OeeMetricsResult;
}

export interface PlantOeeResponse {
  window: 'SHIFT' | 'DAY';
  machineCount: number;
  metrics: OeeMetricsResult;
  machineBreakdown?: MachineOeeBreakdownItem[];
}
