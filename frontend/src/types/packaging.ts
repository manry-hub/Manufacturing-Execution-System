export interface PackagingUnit {
  id: string;
  runId: string;
  barcode: string;
  partCount: number;
  palletId?: string | null;
  packedAt: string;
  packager?: {
    id: string;
    username: string;
  };
  run?: {
    id: string;
    productionOrderId: string;
    machine?: {
      code: string;
      name: string;
    };
    productionOrder?: {
      orderNumber: string;
      product?: {
        partNumber: string;
        name: string;
      };
    };
  };
}

export interface RunReconciliation {
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
  targetQuantity: number;
  totalShots?: number;
  expectedFromShots?: number;
  producedGoodQuantity: number;
  scrappedQuantity: number;
  packedQuantity: number;
  varianceUnpacked: number;
  variancePercentage?: number;
  discrepancyStatus?: 'BALANCED' | 'DEFICIT' | 'SURPLUS';
  discrepancyAlert?: boolean;
  toleranceMargin?: number;
  completionPercentage: number;
  isFullyPacked: boolean;
  packagingUnitsCount: number;
  pallets?: Array<{
    palletId: string;
    cartonCount: number;
    totalParts: number;
  }>;
  packagingUnits: Array<{
    id: string;
    barcode: string;
    partCount: number;
    palletId?: string | null;
    packedAt: string;
  }>;
}
