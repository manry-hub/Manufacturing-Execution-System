export interface TimelineBlockConflict {
  type: 'TONNAGE_MISMATCH' | 'TOOLING_COLLISION' | 'MACHINE_OVERLAP' | 'DUE_DATE_RISK';
  severity: 'WARNING' | 'CRITICAL';
  message: string;
}

export type TimelineBlockType = 'PRODUCTION_ORDER' | 'ACTIVE_RUN' | 'MOLD_CHANGEOVER';

export interface TimelineBlock {
  id: string;
  blockType: TimelineBlockType;
  orderId?: string;
  orderNumber?: string;
  externalOrderRef?: string;
  dueDate?: string;
  externalSyncStatus?: string;
  suggestedMachineCode?: string;
  productName?: string;
  moldId?: string;
  moldCode?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  priority?: number;
  targetQuantity?: number;
  producedQuantity?: number;
  progressPercent?: number;
  conflicts?: TimelineBlockConflict[];
}

export interface TimelineMachineRow {
  machineId: string;
  machineCode: string;
  machineName: string;
  clampingTonnage: number;
  currentStatus: string;
  blocks: TimelineBlock[];
}

export interface SchedulingTimelineResponse {
  horizonStart: string;
  horizonEnd: string;
  machines: TimelineMachineRow[];
  summary: {
    totalScheduledOrders: number;
    activeConflictsCount: number;
    totalChangeovers: number;
    scheduledHours: number;
  };
}

export interface MoldChangeoverRule {
  id: string;
  fromMoldId: string;
  toMoldId: string;
  setupMinutes: number;
  purgeMinutes: number;
  fromMold?: { code: string; name: string };
  toMold?: { code: string; name: string };
}
