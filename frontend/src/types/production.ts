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
  totalShots?: number | bigint;
  compatibilities?: Array<{
    id?: string;
    productId: string;
    idealCycleTime?: number;
  }>;
}

export interface OrderOperationStep {
  id: string;
  productionOrderId: string;
  sequence: number;
  operationName: 'MOLDING' | 'SECONDARY_FINISHING' | 'PACKAGING' | string;
  stationType: 'INJECTION_MACHINE' | 'MANUAL_WORKBENCH' | 'PACKAGING_STATION' | string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  quantityIn: number;
  quantityPassed: number;
  quantityScrapped: number;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  productId: string;
  targetQuantity: number;
  packedQuantity?: number;
  status: OrderStatus;
  plannedStartTime: string;
  plannedEndTime?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  assignedMachineId?: string | null;
  assignedMoldId?: string | null;
  priority?: number;
  sequenceOrder?: number;
  schedulingNotes?: string | null;
  externalOrderRef?: string | null;
  dueDate?: string | null;
  externalSyncStatus?: string;
  suggestedMachineCode?: string | null;
  product?: Product;
  assignedMachine?: { id: string; code: string; name: string };
  assignedMold?: Mold;
  operationSteps?: OrderOperationStep[];
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
