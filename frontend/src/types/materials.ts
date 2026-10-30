export interface Material {
  id: string;
  code: string;
  name: string;
  category: string;
  densityGcm3?: number | null;
  _count?: {
    lots: number;
  };
}

export interface MaterialLot {
  id: string;
  materialId: string;
  lotNumber: string;
  supplierLot?: string | null;
  initialQtyKg: number;
  remainingQtyKg: number;
  status: 'AVAILABLE' | 'CONSUMED' | 'EXPIRED' | 'QUARANTINE';
  expirationDate?: string | null;
  receivedAt: string;
  material?: Material;
}

export interface RunGenealogy {
  runId: string;
  orderNumber: string;
  product: {
    partNumber: string;
    name: string;
  };
  machine: {
    code: string;
    name: string;
  };
  mold: {
    code: string;
    cavities: number;
  };
  runStatus: string;
  totalShots: number;
  goodQuantity: number;
  rejectQuantity: number;
  rawMaterialsConsumed: Array<{
    consumptionId: string;
    materialCode: string;
    materialName: string;
    category: string;
    lotNumber: string;
    supplierLot?: string | null;
    quantityKg: number;
    loadedAt: string;
    loadedBy: string;
  }>;
  packagingUnits: Array<{
    barcode: string;
    partCount: number;
    palletId?: string | null;
    packedAt: string;
    packager: string;
  }>;
}

export interface LotGenealogy {
  lotNumber: string;
  supplierLot?: string | null;
  status: string;
  initialQtyKg: number;
  remainingQtyKg: number;
  material: {
    code: string;
    name: string;
    category: string;
  };
  producedRuns: Array<{
    runId: string;
    orderNumber: string;
    partNumber: string;
    productName: string;
    machineCode: string;
    quantityConsumedKg: number;
    consumedAt: string;
    runStatus: string;
    producedGoodQty: number;
  }>;
}

export interface CartonGenealogy {
  carton: {
    id: string;
    barcode: string;
    partCount: number;
    palletId?: string | null;
    packedAt: string;
    packager: string;
  };
  run: {
    id: string;
    orderNumber: string;
    status: string;
    totalShots: number;
    goodQuantity: number;
    rejectQuantity: number;
  };
  product: {
    partNumber: string;
    name: string;
  };
  machine: {
    code: string;
    name: string;
  };
  mold: {
    code: string;
    cavities: number;
  };
  rawMaterials: Array<{
    consumptionId: string;
    lotId: string;
    lotNumber: string;
    materialCode: string;
    materialName: string;
    category: string;
    supplierLot?: string | null;
    status: string;
    quantityKg: number;
    loadedAt: string;
    loadedBy: string;
  }>;
}

export interface QuarantineResponse {
  lot: {
    id: string;
    lotNumber: string;
    status: string;
    remainingQtyKg: number;
  };
  blastRadius: {
    affectedRunsCount: number;
    affectedRuns: Array<{
      runId: string;
      orderNumber: string;
      cartonCount: number;
      partCount: number;
    }>;
    affectedCartonsCount: number;
    totalPartsQuarantined: number;
    quarantinedAt: string;
    reason: string;
  };
}

export interface HopperLevel {
  runId: string;
  orderNumber: string;
  machine: {
    id: string;
    code: string;
    name: string;
  };
  productName: string;
  totalLoadedKg: number;
  estimatedConsumedKg: number;
  currentHopperKg: number;
  isLowResin: boolean;
  isEmpty: boolean;
  activeLots: Array<{
    lotNumber: string;
    materialName: string;
    category: string;
    quantityKg: number;
  }>;
}
