export type AndonStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export type AndonCategory =
  | 'MACHINE_FAULT'
  | 'QUALITY_ISSUE'
  | 'MATERIAL_SHORTAGE'
  | 'SAFETY'
  | 'PROCESS_DEVIATION';

export interface AndonTicket {
  id: string;
  ticketNumber: string;
  machineId: string;
  productionRunId?: string | null;
  category: AndonCategory;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: AndonStatus;
  description: string;
  reportedBy?: string;
  acknowledgedBy?: string | null;
  resolvedBy?: string | null;
  downtimeReasonId?: string | null;
  downtimeClassification?: string | null;
  correctiveAction?: string | null;
  createdAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  responseTimeSeconds?: number | null;
  resolutionTimeSeconds?: number | null;
  machine?: {
    code: string;
    name: string;
  };
}
