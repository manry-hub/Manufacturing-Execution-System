import { randomUUID } from 'node:crypto';
import {
  NormalizedMachineEventDto,
  NormalizedStatusEnum,
  EventTypeEnum,
  SourceTypeEnum,
  DataQualityEnum,
} from '../telemetry/dto/normalized-machine-event.dto.js';

export interface VirtualMachineConfig {
  machineCode: string;
  name: string;
  tonnage: number;
  nominalCycleTimeSeconds: number;
  initialStatus?: NormalizedStatusEnum;
  seed: number;
  isSlowCycleCandidate?: boolean;
  isFaultCandidate?: boolean;
  activeFaultCode?: string;
  activeFaultDescription?: string;
}

export type InjectionPhase =
  | 'MOLD_CLAMPING'
  | 'INJECTION_BOOST'
  | 'PACKING_HOLDING'
  | 'COOLING_PLASTICIZING'
  | 'MOLD_OPENING'
  | 'PART_EJECTION';

export class VirtualMachineNode {
  public readonly machineCode: string;
  public readonly name: string;
  public readonly tonnage: number;
  public readonly nominalCycleTimeSeconds: number;
  public readonly initialStatus: NormalizedStatusEnum;
  public readonly isSlowCycleCandidate: boolean;
  public readonly isFaultCandidate: boolean;

  // Operational state
  public normalizedStatus: NormalizedStatusEnum;
  public rawStatus: string;
  public cycleCounter: number = 0;
  public currentPhase: InjectionPhase = 'MOLD_CLAMPING';
  public phaseElapsedSeconds: number = 0;
  public currentCycleDuration: number = 0;

  // Real-time telemetry snapshot
  public latestMetrics?: {
    cycleTimeSeconds?: number;
    injectionPressureBar?: number;
    peakInjectionPressureBar?: number;
    barrelTemperatures?: {
      zone1?: number;
      zone2?: number;
      zone3?: number;
      zone4?: number;
    };
  };

  // Scenario flags
  public isSlowCycleActive: boolean = false;
  public slowCycleMultiplier: number = 1.0;
  public isFaultActive: boolean = false;
  public activeFaultCode: string | null = null;
  public activeFaultDescription: string | null = null;
  public isDisconnected: boolean = false;

  // Deterministic PRNG
  private seed: number;
  private rng: () => number;

  constructor(config: VirtualMachineConfig) {
    this.machineCode = config.machineCode;
    this.name = config.name;
    this.tonnage = config.tonnage;
    this.nominalCycleTimeSeconds = config.nominalCycleTimeSeconds;
    this.initialStatus = config.initialStatus ?? NormalizedStatusEnum.RUNNING;
    this.normalizedStatus = this.initialStatus;
    this.seed = config.seed;
    this.rng = this.initMulberry32(this.seed);
    this.isSlowCycleCandidate = !!config.isSlowCycleCandidate;
    this.isFaultCandidate = !!config.isFaultCandidate;

    if (this.normalizedStatus === NormalizedStatusEnum.FAULT) {
      this.isFaultActive = false;
      this.activeFaultCode = config.activeFaultCode ?? 'ALM-TEMP-04';
      this.activeFaultDescription = config.activeFaultDescription ?? 'Zone 4 Thermocouple Open Circuit / Heater Band Trip';
      this.rawStatus = 'FAULT_ASSERTED';
      this.latestMetrics = {
        cycleTimeSeconds: 0,
        injectionPressureBar: 0,
        peakInjectionPressureBar: 0,
        barrelTemperatures: { zone1: 190, zone2: 205, zone3: 215, zone4: 145 },
      };
    } else if (this.normalizedStatus === NormalizedStatusEnum.SETUP) {
      this.rawStatus = 'MOLD_CHANGEOVER';
      this.latestMetrics = {
        cycleTimeSeconds: 0,
        injectionPressureBar: 0,
        peakInjectionPressureBar: 0,
        barrelTemperatures: { zone1: 180, zone2: 195, zone3: 200, zone4: 205 },
      };
    } else if (this.normalizedStatus === NormalizedStatusEnum.IDLE) {
      this.rawStatus = 'STANDBY';
      this.latestMetrics = {
        cycleTimeSeconds: 0,
        injectionPressureBar: 0,
        peakInjectionPressureBar: 0,
        barrelTemperatures: { zone1: 24, zone2: 24, zone3: 24, zone4: 24 },
      };
    } else {
      this.rawStatus = 'CYCLING';
      this.latestMetrics = {
        cycleTimeSeconds: this.nominalCycleTimeSeconds,
        injectionPressureBar: Math.round(this.randomRange(138.0, 148.0)),
        peakInjectionPressureBar: Math.round(this.randomRange(138.0, 148.0)),
        barrelTemperatures: { zone1: 190, zone2: 210, zone3: 220, zone4: 225 },
      };
    }
  }

  private initMulberry32(seed: number): () => number {
    return () => {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Generates pseudo-random float between min and max based on seeded PRNG.
   */
  private randomRange(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }

  /**
   * Calculates dynamic phase duration based on nominal cycle time and active slow cycle scenario.
   */
  private getPhaseDuration(phase: InjectionPhase): number {
    const base = this.nominalCycleTimeSeconds * this.slowCycleMultiplier;
    switch (phase) {
      case 'MOLD_CLAMPING':
        return base * 0.1; // 10%
      case 'INJECTION_BOOST':
        return base * 0.15; // 15%
      case 'PACKING_HOLDING':
        return base * 0.15; // 15%
      case 'COOLING_PLASTICIZING':
        return base * 0.45; // 45% (cooling dominates in molding)
      case 'MOLD_OPENING':
        return base * 0.1; // 10%
      case 'PART_EJECTION':
        return base * 0.05; // 5%
    }
  }

  /**
   * Advances simulation by deltaSeconds and emits any resulting normalized telemetry events.
   */
  public tick(deltaSeconds: number): NormalizedMachineEventDto[] {
    const events: NormalizedMachineEventDto[] = [];
    const now = new Date();

    if (this.isDisconnected) {
      return events;
    }

    if (this.isFaultActive) {
      return events;
    }

    if (this.normalizedStatus !== NormalizedStatusEnum.RUNNING) {
      return events;
    }

    this.phaseElapsedSeconds += deltaSeconds;
    this.currentCycleDuration += deltaSeconds;

    while (this.phaseElapsedSeconds >= this.getPhaseDuration(this.currentPhase)) {
      const targetPhaseDuration = this.getPhaseDuration(this.currentPhase);
      this.phaseElapsedSeconds -= targetPhaseDuration;
      const nextPhase = this.getNextPhase(this.currentPhase);

      if (nextPhase === 'MOLD_CLAMPING') {
        // Full shot cycle completed!
        this.cycleCounter++;
        const actualCycleTime = Math.round(this.currentCycleDuration * 10) / 10;
        this.currentCycleDuration = this.phaseElapsedSeconds;

        const peakPressure = Math.round(this.randomRange(135.0, 155.0) * 10) / 10;
        const barrelTemps = [
          Math.round(this.randomRange(188.0, 192.0) * 10) / 10,
          Math.round(this.randomRange(208.0, 212.0) * 10) / 10,
          Math.round(this.randomRange(218.0, 222.0) * 10) / 10,
          Math.round(this.randomRange(223.0, 227.0) * 10) / 10,
        ];

        this.latestMetrics = {
          cycleTimeSeconds: actualCycleTime,
          injectionPressureBar: peakPressure,
          peakInjectionPressureBar: peakPressure,
          barrelTemperatures: {
            zone1: barrelTemps[0],
            zone2: barrelTemps[1],
            zone3: barrelTemps[2],
            zone4: barrelTemps[3],
          },
        };

        const cycleEvent = this.createNormalizedEvent({
          eventType: EventTypeEnum.CYCLE_COMPLETED,
          rawStatus: 'INJECTION_CYCLE_DONE',
          sourceTimestamp: now.toISOString(),
          metrics: {
            cycleCounter: this.cycleCounter,
            cycleTimeSeconds: actualCycleTime,
            injectionTimeSeconds: Math.round(actualCycleTime * 0.15 * 10) / 10,
            coolingTimeSeconds: Math.round(actualCycleTime * 0.45 * 10) / 10,
            cushionPositionMm: Math.round(this.randomRange(10.5, 13.5) * 10) / 10,
            peakInjectionPressureBar: peakPressure,
            clampingForceKn: Math.round(this.tonnage * 9.81),
            barrelTemperatures: barrelTemps,
          },
        });

        events.push(cycleEvent);
      }

      this.currentPhase = nextPhase;
      this.rawStatus = `PHASE_${this.currentPhase}`;
    }

    return events;
  }

  private getNextPhase(phase: InjectionPhase): InjectionPhase {
    switch (phase) {
      case 'MOLD_CLAMPING':
        return 'INJECTION_BOOST';
      case 'INJECTION_BOOST':
        return 'PACKING_HOLDING';
      case 'PACKING_HOLDING':
        return 'COOLING_PLASTICIZING';
      case 'COOLING_PLASTICIZING':
        return 'MOLD_OPENING';
      case 'MOLD_OPENING':
        return 'PART_EJECTION';
      case 'PART_EJECTION':
        return 'MOLD_CLAMPING';
    }
  }

  public triggerSlowCycle(delayPercent: number = 50): NormalizedMachineEventDto {
    this.isSlowCycleActive = true;
    this.slowCycleMultiplier = 1.0 + delayPercent / 100.0;
    this.rawStatus = 'RUNNING_SLOW_CYCLE';

    return this.createNormalizedEvent({
      eventType: EventTypeEnum.PARAMETER_SAMPLE_RECEIVED,
      rawStatus: this.rawStatus,
      sourceTimestamp: new Date().toISOString(),
      metrics: {
        cycleCounter: this.cycleCounter,
        cycleTimeSeconds: Math.round(this.nominalCycleTimeSeconds * this.slowCycleMultiplier * 10) / 10,
      },
    });
  }

  public clearSlowCycle(): NormalizedMachineEventDto {
    this.isSlowCycleActive = false;
    this.slowCycleMultiplier = 1.0;
    this.rawStatus = 'CYCLING';

    return this.createNormalizedEvent({
      eventType: EventTypeEnum.PARAMETER_SAMPLE_RECEIVED,
      rawStatus: this.rawStatus,
      sourceTimestamp: new Date().toISOString(),
      metrics: {
        cycleCounter: this.cycleCounter,
        cycleTimeSeconds: this.nominalCycleTimeSeconds,
      },
    });
  }

  public triggerFault(
    faultCode: string = 'UNP-HYD-JAM',
    description: string = 'Hydraulic clamping pressure drop or mechanical jam',
  ): NormalizedMachineEventDto {
    this.isFaultActive = true;
    this.normalizedStatus = NormalizedStatusEnum.FAULT;
    this.rawStatus = 'FAULT_ASSERTED';
    this.activeFaultCode = faultCode;
    this.activeFaultDescription = description;
    this.latestMetrics = {
      cycleTimeSeconds: 0,
      injectionPressureBar: 0,
      peakInjectionPressureBar: 0,
      barrelTemperatures: { zone1: 190, zone2: 205, zone3: 215, zone4: 145 },
    };

    return this.createNormalizedEvent({
      eventType: EventTypeEnum.FAULT_STARTED,
      rawStatus: this.rawStatus,
      sourceTimestamp: new Date().toISOString(),
      fault: {
        faultCode,
        faultSeverity: 'CRITICAL_STOP',
        faultDescription: description,
      },
    });
  }

  public clearFault(): NormalizedMachineEventDto {
    this.isFaultActive = false;
    const clearedCode = this.activeFaultCode ?? 'FAULT';
    this.activeFaultCode = null;
    this.activeFaultDescription = null;
    this.normalizedStatus = NormalizedStatusEnum.RUNNING;
    this.rawStatus = 'CYCLING';
    this.latestMetrics = {
      cycleTimeSeconds: this.nominalCycleTimeSeconds,
      injectionPressureBar: 142,
      peakInjectionPressureBar: 142,
      barrelTemperatures: { zone1: 190, zone2: 210, zone3: 220, zone4: 225 },
    };

    return this.createNormalizedEvent({
      eventType: EventTypeEnum.FAULT_CLEARED,
      rawStatus: this.rawStatus,
      sourceTimestamp: new Date().toISOString(),
      fault: {
        faultCode: clearedCode,
        faultSeverity: 'INFO',
        faultDescription: 'Fault cleared, machine returned to active production',
      },
    });
  }

  public triggerDisconnect(): NormalizedMachineEventDto {
    this.isDisconnected = true;
    this.normalizedStatus = NormalizedStatusEnum.DISCONNECTED;
    this.rawStatus = 'COMMUNICATION_LOST';

    return this.createNormalizedEvent({
      eventType: EventTypeEnum.SOURCE_CONNECTION_CHANGED,
      rawStatus: this.rawStatus,
      sourceTimestamp: new Date().toISOString(),
      dataQuality: DataQualityEnum.BAD,
    });
  }

  public triggerReconnect(): NormalizedMachineEventDto {
    this.isDisconnected = false;
    this.normalizedStatus = NormalizedStatusEnum.RUNNING;
    this.rawStatus = 'CYCLING';

    return this.createNormalizedEvent({
      eventType: EventTypeEnum.SOURCE_CONNECTION_CHANGED,
      rawStatus: this.rawStatus,
      sourceTimestamp: new Date().toISOString(),
      dataQuality: DataQualityEnum.GOOD,
    });
  }

  public reset(newSeed?: number) {
    if (newSeed !== undefined) {
      this.seed = newSeed;
    }
    this.rng = this.initMulberry32(this.seed);
    this.normalizedStatus = this.initialStatus;
    this.currentPhase = 'MOLD_CLAMPING';
    this.phaseElapsedSeconds = 0;
    this.currentCycleDuration = 0;
    this.cycleCounter = 0;
    this.isSlowCycleActive = false;
    this.slowCycleMultiplier = 1.0;

    if (this.initialStatus === NormalizedStatusEnum.FAULT) {
      this.isFaultActive = false;
      this.activeFaultCode = 'ALM-TEMP-04';
      this.activeFaultDescription = 'Zone 4 Thermocouple Open Circuit / Heater Band Trip';
      this.rawStatus = 'FAULT_ASSERTED';
      this.latestMetrics = {
        cycleTimeSeconds: 0,
        injectionPressureBar: 0,
        peakInjectionPressureBar: 0,
        barrelTemperatures: { zone1: 190, zone2: 205, zone3: 215, zone4: 145 },
      };
    } else if (this.initialStatus === NormalizedStatusEnum.SETUP) {
      this.isFaultActive = false;
      this.activeFaultCode = null;
      this.activeFaultDescription = null;
      this.rawStatus = 'MOLD_CHANGEOVER';
      this.latestMetrics = {
        cycleTimeSeconds: 0,
        injectionPressureBar: 0,
        peakInjectionPressureBar: 0,
        barrelTemperatures: { zone1: 180, zone2: 195, zone3: 200, zone4: 205 },
      };
    } else if (this.initialStatus === NormalizedStatusEnum.IDLE) {
      this.isFaultActive = false;
      this.activeFaultCode = null;
      this.activeFaultDescription = null;
      this.rawStatus = 'STANDBY';
      this.latestMetrics = {
        cycleTimeSeconds: 0,
        injectionPressureBar: 0,
        peakInjectionPressureBar: 0,
        barrelTemperatures: { zone1: 24, zone2: 24, zone3: 24, zone4: 24 },
      };
    } else {
      this.isFaultActive = false;
      this.activeFaultCode = null;
      this.activeFaultDescription = null;
      this.rawStatus = 'CYCLING';
      this.latestMetrics = {
        cycleTimeSeconds: this.nominalCycleTimeSeconds,
        injectionPressureBar: 142,
        peakInjectionPressureBar: 142,
        barrelTemperatures: { zone1: 190, zone2: 210, zone3: 220, zone4: 225 },
      };
    }
    this.isDisconnected = false;
  }

  private createNormalizedEvent(partial: Partial<NormalizedMachineEventDto>): NormalizedMachineEventDto {
    return {
      eventId: randomUUID(),
      machineId: this.machineCode,
      sourceId: `SIM-${this.machineCode}`,
      sourceType: SourceTypeEnum.SIMULATOR,
      sourceTimestamp: partial.sourceTimestamp ?? new Date().toISOString(),
      receivedTimestamp: new Date().toISOString(),
      eventType: partial.eventType ?? EventTypeEnum.MACHINE_STATE_CHANGED,
      rawStatus: partial.rawStatus ?? this.rawStatus,
      normalizedStatus: this.normalizedStatus,
      metrics: partial.metrics,
      fault: partial.fault,
      dataQuality: partial.dataQuality ?? DataQualityEnum.GOOD,
      isSimulated: true,
      schemaVersion: '1.0',
    };
  }
}
