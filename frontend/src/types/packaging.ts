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
  producedGoodQuantity: number;
  scrappedQuantity: number;
  packedQuantity: number;
  varianceUnpacked: number;
  completionPercentage: number;
  isFullyPacked: boolean;
  packagingUnitsCount: number;
  packagingUnits: Array<{
    id: string;
    barcode: string;
    partCount: number;
    palletId?: string | null;
    packedAt: string;
  }>;
}
