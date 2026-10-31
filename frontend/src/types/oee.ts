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

export interface ExecutiveOeeFilterParams {
  areaId?: string;
  machineId?: string;
  window?: 'SHIFT' | 'DAY' | 'WEEK';
  startDate?: string;
  endDate?: string;
}

export interface ExecutiveOeeAnalyticsResponse {
  filter: {
    areaId: string;
    machineId: string;
    window?: 'SHIFT' | 'DAY' | 'WEEK';
    startTime: string;
    endTime: string;
  };
  kpi: {
    oee: number;
    availability: number;
    performance: number;
    quality: number;
    isWorldClass: boolean;
    speedOverPerformance: boolean;
  };
  productQuantity: {
    actualQuantity: number;
    expectedQuantity: number;
    targetQuantity: number;
    scrapQuantity: number;
  };
  productionRate: {
    currentRate: number;
    targetRate: number;
    unit: string;
  };
  lossAccounts: {
    availabilityLoss: {
      unplannedSeconds: number;
      plannedSeconds: number;
    };
    productionLoss: {
      smallStopsSeconds: number;
      reducedSpeedSeconds: number;
    };
    qualityLoss: {
      productionRejects: number;
      startupRejects: number;
    };
  };
  timeAccounts: {
    activeSeconds: number;
    undefinedSeconds: number;
    downtimeSeconds: number;
    setupSeconds: number;
    plannedSeconds: number;
    nonScheduledSeconds?: number;
    totalSeconds: number;
    calendarSeconds?: number;
  };
  trendOverTime: Array<{
    date: string;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
    goal: number;
  }>;
  availableFilters: {
    areas: Array<{ id: string; code: string; name: string }>;
    machines: Array<{ id: string; code: string; name: string; areaId?: string }>;
  };
}
