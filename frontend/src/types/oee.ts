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
