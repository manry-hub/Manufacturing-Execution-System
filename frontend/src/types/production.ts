export type OrderStatus = 'DRAFT' | 'RELEASED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type RunStatus = 'SETUP' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export interface Product {
  id: string;
  partNumber: string;
  name: string;
  nominalCycleTimeSeconds: number;
}

export interface Mold {
  id: string;
  code: string;
  name: string;
  cavityCount: number;
}

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  productId: string;
  targetQuantity: number;
  status: OrderStatus;
  plannedStartTime: string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  product?: Product;
}

export interface ProductionRun {
  id: string;
  productionOrderId: string;
  machineId: string;
  moldId: string;
  status: RunStatus;
  totalShots: number;
  goodQuantity: number;
  rejectQuantity: number;
  startTime: string;
  endTime?: string | null;
  productionOrder?: ProductionOrder;
  mold?: Mold;
  machine?: {
    code: string;
    name: string;
  };
}
