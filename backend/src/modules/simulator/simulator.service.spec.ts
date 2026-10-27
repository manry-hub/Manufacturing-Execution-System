import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SimulatorService } from './simulator.service.js';
import { TelemetryIngestionService } from '../telemetry/telemetry.service.js';

describe('SimulatorService', () => {
  let service: SimulatorService;
  let mockTelemetryService: any;

  beforeEach(() => {
    mockTelemetryService = {
      ingestEvent: vi.fn().mockResolvedValue({ status: 'PROCESSED' }),
    };

    service = new SimulatorService(
      mockTelemetryService as unknown as TelemetryIngestionService,
    );
    service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should initialize exactly 10 virtual machine nodes adhering to 8+1+1 baseline', () => {
    const status = service.getStatus();
    expect(status.nodes.length).toBe(10);

    const codes = status.nodes.map((n) => n.machineCode);
    for (let i = 1; i <= 10; i++) {
      const expected = `IMM-${String(i).padStart(2, '0')}`;
      expect(codes).toContain(expected);
    }

    // IMM-09 is slow cycle candidate
    const imm09 = service.getNode('IMM-09');
    expect(imm09?.isSlowCycleCandidate).toBe(true);
    expect(imm09?.isSlowCycleActive).toBe(false);

    // IMM-10 is fault candidate
    const imm10 = service.getNode('IMM-10');
    expect(imm10?.isFaultCandidate).toBe(true);
    expect(imm10?.isFaultActive).toBe(false);
  });

  it('should start and stop timer loop', () => {
    service.start();
    expect(service.getStatus().isRunning).toBe(true);

    service.stop();
    expect(service.getStatus().isRunning).toBe(false);
  });

  it('should adjust speed multiplier', () => {
    service.setSpeed(5);
    expect(service.getStatus().speedMultiplier).toBe(5);

    expect(() => service.setSpeed(0)).toThrow();
    expect(() => service.setSpeed(150)).toThrow();
  });

  it('should advance ticks and ingest generated cycle events', async () => {
    // Run enough ticks to complete cycles (e.g. 30 seconds of delta)
    for (let i = 0; i < 30; i++) {
      await service.tick();
    }

    // Ingestion service should have received multiple cycle events
    expect(mockTelemetryService.ingestEvent).toHaveBeenCalled();
  });

  it('should trigger slow cycle scenario on target machine', async () => {
    const result = await service.triggerScenario({
      machineCode: 'IMM-09',
      scenario: 'SLOW_CYCLE',
      delayPercent: 50,
    });

    expect(result.machineCode).toBe('IMM-09');
    expect(result.isSlowCycleActive).toBe(true);

    const node = service.getNode('IMM-09');
    expect(node?.isSlowCycleActive).toBe(true);
    expect(node?.slowCycleMultiplier).toBe(1.5);
  });

  it('should trigger and clear fault scenario on target machine', async () => {
    const faultResult = await service.triggerScenario({
      machineCode: 'IMM-10',
      scenario: 'FAULT',
      faultCode: 'UNP-HYD-JAM',
      description: 'Hydraulic pressure collapse',
    });

    expect(faultResult.machineCode).toBe('IMM-10');
    expect(faultResult.isFaultActive).toBe(true);
    expect(faultResult.normalizedStatus).toBe('FAULT');

    const clearResult = await service.triggerScenario({
      machineCode: 'IMM-10',
      scenario: 'CLEAR_FAULT',
    });

    expect(clearResult.isFaultActive).toBe(false);
    expect(clearResult.normalizedStatus).toBe('RUNNING');
  });

  it('should reset all nodes to initial baseline', async () => {
    await service.triggerScenario({
      machineCode: 'IMM-10',
      scenario: 'FAULT',
    });

    service.reset(42);

    const imm10 = service.getNode('IMM-10');
    expect(imm10?.isFaultActive).toBe(false);
    expect(imm10?.normalizedStatus).toBe('RUNNING');
    expect(imm10?.cycleCounter).toBe(0);
  });
});
