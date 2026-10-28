export type NormalizedMachineStatus =
  | 'RUNNING'
  | 'IDLE'
  | 'FAULT'
  | 'SETUP'
  | 'STOPPED'
  | 'DISCONNECTED'
  | 'UNKNOWN';

export type InjectionCyclePhase =
  | 'CLAMPING'
  | 'INJECTION'
  | 'HOLDING'
  | 'COOLING'
  | 'MOLD_OPENING'
  | 'EJECTION';

export interface BarrelTemperatures {
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  nozzle?: number;
}

export interface TelemetryMetrics {
  cycleTimeSeconds?: number;
  injectionPressureBar?: number;
  holdingPressureBar?: number;
  cushionPositionMm?: number;
  plasticizingTimeSeconds?: number;
  shotCounter?: number;
  barrelTemperatures?: BarrelTemperatures;
  hydraulicOilTempCelsius?: number;
  moldTempFixedCelsius?: number;
  moldTempMovingCelsius?: number;
}

export interface MachineCurrentState {
  machineId: string;
  normalizedStatus: NormalizedMachineStatus;
  rawStatus?: string;
  activeRunId?: string | null;
  currentCycleTime?: number | string | null;
  lastEventTimestamp: string;
  connectionStatus: 'ONLINE' | 'OFFLINE';
  updatedAt: string;
}

export interface MachineArea {
  id: string;
  code: string;
  name: string;
  plant?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface Machine {
  id: string;
  code: string;
  name: string;
  areaId: string;
  tonnage: number;
  clampingTonnage?: number;
  shotCapacityGrams?: number;
  status: string;
  area?: MachineArea;
  currentState?: MachineCurrentState;
  // Simulator live augmentations
  cycleCounter?: number;
  currentPhase?: InjectionCyclePhase;
  nominalCycleTimeSeconds?: number;
  isSlowCycleActive?: boolean;
  isFaultActive?: boolean;
  activeFaultCode?: string | null;
  isDisconnected?: boolean;
  latestMetrics?: TelemetryMetrics;
}

export interface TelemetryEventPayload {
  eventId: string;
  machineId: string;
  internalMachineId: string;
  eventType: string;
  normalizedStatus: NormalizedMachineStatus;
  rawStatus?: string;
  sourceTimestamp: string;
  metrics?: TelemetryMetrics;
  fault?: {
    faultCode?: string;
    description?: string;
    severity?: string;
  };
}
