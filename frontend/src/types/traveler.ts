export interface TravelerMaterialLineage {
  materialName: string;
  materialCode: string;
  lotNumber: string;
  supplierName: string;
  allocatedKg: number;
  consumedKg: number;
  loadedAt: string;
}

export interface TravelerProcessParameters {
  cycleTimeNominalSeconds: number;
  cycleTimeActualAvgSeconds: number;
  injectionPressureBarAvg: number;
  injectionPressureBarMax: number;
  cushionPositionMmAvg: number;
  barrelTemperaturesAvg: {
    zone1: number;
    zone2: number;
    zone3: number;
    zone4: number;
    nozzle?: number;
  };
  parameterComplianceStatus: 'IN_SPEC' | 'OUT_OF_SPEC' | 'WARNING';
}

export interface TravelerQualityAudit {
  firstPieceStatus: 'PENDING' | 'PASSED' | 'QUARANTINE' | 'REJECTED';
  firstPieceInspector?: string;
  firstPieceSignedAt?: string;
  inspectionPlanName?: string;
  checksRecorded: {
    id: string;
    checkType: string;
    recordedAt: string;
    inspector: string;
    disposition: string;
    itemsChecked: {
      characteristic: string;
      targetValue?: number;
      measuredValue?: number;
      toleranceMin?: number;
      toleranceMax?: number;
      status: 'PASS' | 'FAIL';
    }[];
  }[];
  scrapBreakdown: {
    defectReason: string;
    quantity: number;
    category: string;
  }[];
}

export interface TravelerPackagingManifest {
  totalUnitsPacked: number;
  partsPerUnit: number;
  totalPackedQuantity: number;
  shotToPackVariancePct: number;
  reconciliationStatus: 'BALANCED' | 'VARIANCE_WARNING';
  units: {
    id: string;
    barcode: string;
    palletId?: string;
    partCount: number;
    packedAt: string;
  }[];
}

export interface TravelerSignoffRecord {
  status: 'DRAFT' | 'PENDING_REVIEW' | 'RELEASED' | 'QUARANTINED' | 'CONCESSION';
  signedBy?: string;
  signedByRole?: string;
  signedAt?: string;
  comments?: string;
  tamperProofHash?: string;
}

export interface DigitalTravelerRecord {
  runId: string;
  orderNumber: string;
  partNumber: string;
  partName: string;
  customerName: string;
  drawingRevision: string;

  // Equipment Context
  machineCode: string;
  machineTonnage: number;
  moldCode: string;
  cavityCount: number;

  // Timing & Quantities
  plannedQuantity: number;
  actualGoodQuantity: number;
  actualScrapQuantity: number;
  totalShots: number;
  runStatus: string;
  startTime: string;
  endTime?: string | null;
  durationHours: number;

  // Material Lineage
  materials: TravelerMaterialLineage[];

  // Process Parameters Window
  processParameters: TravelerProcessParameters;

  // Quality & Inspection Signoffs
  qualityAudit: TravelerQualityAudit;

  // Packaging & Carton Manifest
  packagingManifest: TravelerPackagingManifest;

  // Cryptographic QA Release Stamp
  signoff: TravelerSignoffRecord;
}

export interface CertificateOfConformanceDto {
  certificateNumber: string;
  issueDate: string;
  customerName: string;
  purchaseOrderNumber: string;
  productionRunId: string;
  partNumber: string;
  partName: string;
  drawingRevision: string;
  quantityCertified: number;
  resinLotNumber: string;
  materialSpecification: string;
  standardsCompliance: string[];
  criticalCharacteristics: {
    characteristic: string;
    nominal: number;
    minTolerance: number;
    maxTolerance: number;
    measuredActual: number;
    result: 'CONFORMS' | 'NON_CONFORMS';
  }[];
  signoff: {
    signoffOfficer: string;
    title: string;
    disposition: string;
    tamperProofHash: string;
    signedAt: string;
  };
}

export interface TravelerRunSummaryDto {
  runId: string;
  orderNumber: string;
  partNumber: string;
  partName: string;
  machineCode: string;
  moldCode: string;
  runStatus: string;
  goodQuantity: number;
  targetQuantity: number;
  signoffStatus: string;
  startTime: string;
  endTime?: string | null;
}

export interface SignoffTravelerPayload {
  inspectorName: string;
  status: 'RELEASED' | 'QUARANTINED' | 'CONCESSION';
  notes?: string;
}
