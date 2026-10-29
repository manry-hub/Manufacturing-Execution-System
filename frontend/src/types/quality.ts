export interface InspectionPlanItem {
  id: string;
  planId: string;
  sequence: number;
  parameterName: string;
  measurementType: 'VARIABLE' | 'ATTRIBUTE';
  targetValue?: number | null;
  upperTolerance?: number | null;
  lowerTolerance?: number | null;
  inspectionStage: 'FIRST_PIECE' | 'PATROL' | 'FINAL_AUDIT';
}

export interface InspectionPlan {
  id: string;
  productId: string;
  name: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  product?: {
    id: string;
    partNumber: string;
    name: string;
  };
  items: InspectionPlanItem[];
}

export interface QualityCheckSample {
  id: string | number;
  qualityCheckId: string;
  planItemId: string;
  measuredValue?: number | null;
  isPassed: boolean;
  planItem?: InspectionPlanItem;
}

export interface QualityCheck {
  id: string;
  runId: string;
  inspectorId: string;
  checkType: 'FIRST_PIECE' | 'HOURLY_PATROL' | 'CONTAINMENT';
  disposition: 'PENDING' | 'RELEASED' | 'QUARANTINE' | 'REWORK' | 'SCRAP';
  notes?: string | null;
  checkedAt: string;
  inspector?: {
    id: string;
    username: string;
  };
  samples: QualityCheckSample[];
}

export interface FirstPieceReleaseStatus {
  runId: string;
  isReleased: boolean;
  firstPieceCheck: QualityCheck | null;
}

export interface CpkMetric {
  planItemId: string;
  parameterName: string;
  targetValue: number | null;
  upperTolerance: number | null;
  lowerTolerance: number | null;
  sampleCount: number;
  mean: number;
  standardDeviation: number;
  cp: number | null;
  cpu: number | null;
  cpl: number | null;
  cpk: number | null;
  status: 'CAPABLE' | 'MARGINAL' | 'INCAPABLE' | 'INSUFFICIENT_DATA';
  sampleValues: number[];
}

export interface CpkAnalyticsResponse {
  runId?: string;
  productId?: string;
  metrics: CpkMetric[];
  overallStatus: 'CAPABLE' | 'MARGINAL' | 'INCAPABLE' | 'INSUFFICIENT_DATA';
}
