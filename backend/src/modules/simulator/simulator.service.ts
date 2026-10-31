import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { VirtualMachineNode } from './virtual-machine-node.js';
import { TelemetryIngestionService } from '../telemetry/telemetry.service.js';
import { NormalizedStatusEnum } from '../telemetry/dto/normalized-machine-event.dto.js';
import { IngestSourceSelectorService } from '../iot-gateway/services/ingest-source-selector.service.js';

export interface SimulatorStatus {
  isRunning: boolean;
  speedMultiplier: number;
  baseTickIntervalMs: number;
  currentSeed: number;
  nodes: {
    machineCode: string;
    name: string;
    tonnage: number;
    normalizedStatus: string;
    rawStatus: string;
    cycleCounter: number;
    currentPhase: string;
    nominalCycleTimeSeconds: number;
    isSlowCycleActive: boolean;
    isFaultActive: boolean;
    activeFaultCode: string | null;
    isDisconnected: boolean;
    latestMetrics?: VirtualMachineNode['latestMetrics'];
  }[];
}

@Injectable()
export class SimulatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimulatorService.name);

  private readonly nodes = new Map<string, VirtualMachineNode>();
  private tickTimer?: NodeJS.Timeout;
  private isRunning = false;
  private speedMultiplier = 1;
  private readonly baseTickIntervalMs = 1000;
  private currentSeed = 42;

  constructor(
    private readonly telemetryService: TelemetryIngestionService,
    @Optional() private readonly ingestSelector?: IngestSourceSelectorService,
  ) {}

  onModuleInit() {
    this.initializeBaselineNodes();
    this.logger.log('SimulatorService initialized with 10 virtual injection molding machines (8 normal, 1 slow cycle, 1 fault candidate)');
  }

  onModuleDestroy() {
    this.stop();
  }

  /**
   * Initializes the 10 virtual machines adhering to the 8+1+1 baseline allocation.
   */
  public initializeBaselineNodes(seed: number = 42) {
    this.currentSeed = seed;
    this.nodes.clear();

    const machineConfigs = [
      { code: 'IMM-01', name: 'Battenfeld 150T', tonnage: 150, nominalCycleTime: 18.0, initialStatus: NormalizedStatusEnum.RUNNING },
      { code: 'IMM-02', name: 'Battenfeld 150T', tonnage: 150, nominalCycleTime: 18.0, initialStatus: NormalizedStatusEnum.RUNNING },
      { code: 'IMM-03', name: 'Engel Victory 200T', tonnage: 200, nominalCycleTime: 20.0, initialStatus: NormalizedStatusEnum.RUNNING },
      { code: 'IMM-04', name: 'Engel Victory 200T', tonnage: 200, nominalCycleTime: 20.0, initialStatus: NormalizedStatusEnum.RUNNING },
      { code: 'IMM-05', name: 'KraussMaffei 350T', tonnage: 350, nominalCycleTime: 24.0, initialStatus: NormalizedStatusEnum.RUNNING },
      { code: 'IMM-06', name: 'KraussMaffei 350T', tonnage: 350, nominalCycleTime: 24.0, initialStatus: NormalizedStatusEnum.RUNNING },
      { code: 'IMM-07', name: 'Haitian Mars 500T', tonnage: 500, nominalCycleTime: 28.0, initialStatus: NormalizedStatusEnum.RUNNING },
      { code: 'IMM-08', name: 'Haitian Mars 500T', tonnage: 500, nominalCycleTime: 28.0, initialStatus: NormalizedStatusEnum.SETUP },
      {
        code: 'IMM-09',
        name: 'Fanuc Roboshot 150T',
        tonnage: 150,
        nominalCycleTime: 20.0,
        initialStatus: NormalizedStatusEnum.FAULT,
        isSlowCycleCandidate: true,
        isFaultCandidate: true,
        activeFaultCode: 'ALM-TEMP-04',
        activeFaultDescription: 'Zone 4 Thermocouple Open Circuit / Heater Band Trip (ALM-TEMP-04)',
      },
      {
        code: 'IMM-10',
        name: 'Demag Ergotech 250T',
        tonnage: 250,
        nominalCycleTime: 22.0,
        initialStatus: NormalizedStatusEnum.IDLE,
        isFaultCandidate: true,
      },
    ];

    for (let i = 0; i < machineConfigs.length; i++) {
      const cfg = machineConfigs[i];
      const node = new VirtualMachineNode({
        machineCode: cfg.code,
        name: cfg.name,
        tonnage: cfg.tonnage,
        nominalCycleTimeSeconds: cfg.nominalCycleTime,
        initialStatus: cfg.initialStatus,
        seed: seed + i * 100,
        isSlowCycleCandidate: cfg.isSlowCycleCandidate,
        isFaultCandidate: cfg.isFaultCandidate,
        activeFaultCode: cfg.activeFaultCode,
        activeFaultDescription: cfg.activeFaultDescription,
      });

      this.nodes.set(cfg.code, node);
    }
  }

  public start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    const intervalMs = Math.max(50, Math.round(this.baseTickIntervalMs / this.speedMultiplier));

    this.tickTimer = setInterval(async () => {
      await this.tick();
    }, intervalMs);

    this.logger.log(`Simulator started (Speed: ${this.speedMultiplier}x, Interval: ${intervalMs}ms)`);
  }

  public stop() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = undefined;
    }
    this.isRunning = false;
    this.logger.log('Simulator stopped');
  }

  public setSpeed(multiplier: number) {
    if (multiplier <= 0 || multiplier > 100) {
      throw new Error('Speed multiplier must be between 1 and 100');
    }

    this.speedMultiplier = multiplier;
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  public reset(seed?: number) {
    const wasRunning = this.isRunning;
    this.stop();
    this.initializeBaselineNodes(seed ?? this.currentSeed);
    if (wasRunning) {
      this.start();
    }
    this.logger.log(`Simulator reset to baseline (Seed: ${this.currentSeed})`);
  }

  /**
   * Executes a single simulation step across all virtual nodes and ingests emitted events.
   */
  public async tick() {
    const deltaSeconds = (this.baseTickIntervalMs / 1000) * this.speedMultiplier;

    for (const node of this.nodes.values()) {
      if (this.ingestSelector && !this.ingestSelector.isSimulatorActiveFor(node.machineCode)) {
        continue;
      }
      const events = node.tick(deltaSeconds);
      for (const ev of events) {
        try {
          await this.telemetryService.ingestEvent(ev);
        } catch (error) {
          this.logger.error(`Error ingesting simulated event for ${node.machineCode}: ${(error as Error).message}`);
        }
      }
    }
  }

  /**
   * Manually triggers a named scenario on a target machine node.
   */
  public async triggerScenario(params: {
    machineCode: string;
    scenario: 'SLOW_CYCLE' | 'CLEAR_SLOW_CYCLE' | 'FAULT' | 'CLEAR_FAULT' | 'DISCONNECT' | 'RECONNECT';
    faultCode?: string;
    description?: string;
    delayPercent?: number;
  }) {
    const node = this.nodes.get(params.machineCode);
    if (!node) {
      throw new Error(`Machine node "${params.machineCode}" not found in simulator`);
    }

    let event;
    switch (params.scenario) {
      case 'SLOW_CYCLE':
        event = node.triggerSlowCycle(params.delayPercent ?? 50);
        break;
      case 'CLEAR_SLOW_CYCLE':
        event = node.clearSlowCycle();
        break;
      case 'FAULT':
        event = node.triggerFault(params.faultCode ?? 'UNP-HYD-JAM', params.description);
        break;
      case 'CLEAR_FAULT':
        event = node.clearFault();
        break;
      case 'DISCONNECT':
        event = node.triggerDisconnect();
        break;
      case 'RECONNECT':
        event = node.triggerReconnect();
        break;
      default:
        throw new Error(`Unsupported scenario "${String(params.scenario)}"`);
    }

    if (event) {
      await this.telemetryService.ingestEvent(event);
    }

    return {
      machineCode: node.machineCode,
      scenario: params.scenario,
      normalizedStatus: node.normalizedStatus,
      rawStatus: node.rawStatus,
      isSlowCycleActive: node.isSlowCycleActive,
      isFaultActive: node.isFaultActive,
      isDisconnected: node.isDisconnected,
    };
  }

  public getStatus(): SimulatorStatus {
    const nodesStatus = Array.from(this.nodes.values()).map((node) => ({
      machineCode: node.machineCode,
      name: node.name,
      tonnage: node.tonnage,
      normalizedStatus: node.normalizedStatus,
      rawStatus: node.rawStatus,
      cycleCounter: node.cycleCounter,
      currentPhase: node.currentPhase,
      nominalCycleTimeSeconds: node.nominalCycleTimeSeconds,
      isSlowCycleActive: node.isSlowCycleActive,
      isFaultActive: node.isFaultActive,
      activeFaultCode: node.activeFaultCode,
      isDisconnected: node.isDisconnected,
      latestMetrics: node.latestMetrics,
    }));

    return {
      isRunning: this.isRunning,
      speedMultiplier: this.speedMultiplier,
      baseTickIntervalMs: this.baseTickIntervalMs,
      currentSeed: this.currentSeed,
      nodes: nodesStatus,
    };
  }

  public getNode(machineCode: string): VirtualMachineNode | undefined {
    return this.nodes.get(machineCode);
  }
}
