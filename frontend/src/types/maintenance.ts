export interface MoldPmSchedule {
  id: string;
  moldId: string;
  pmLevel: 'LEVEL_1_CLEAN' | 'LEVEL_2_INSPECT' | 'LEVEL_3_OVERHAUL' | string;
  intervalShots: string;
  lastServicedShot: string;
  isActive: boolean;
  mold?: {
    id: string;
    code: string;
    name: string;
    totalShots: string | number;
  };
}

export interface MaintenanceWorkOrder {
  id: string;
  orderNumber: string;
  moldId?: string | null;
  machineId?: string | null;
  workType: 'PREVENTIVE_SHOT' | 'CORRECTIVE_BREAKDOWN' | 'CHANGEOVER' | string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedTechId?: string | null;
  triggerShots?: string | null;
  checklistPayload?: string | null;
  createdAt: string;
  completedAt?: string | null;
  mold?: {
    id: string;
    code: string;
    name: string;
    totalShots: string | number;
  } | null;
  machine?: {
    id: string;
    code: string;
    name: string;
  } | null;
  assignedTech?: {
    id: string;
    username: string;
    email: string;
  } | null;
}
