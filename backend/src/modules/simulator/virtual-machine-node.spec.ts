import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualMachineNode } from './virtual-machine-node.js';
import {
  NormalizedStatusEnum,
  EventTypeEnum,
} from '../telemetry/dto/normalized-machine-event.dto.js';

describe('VirtualMachineNode', () => {
  let node: VirtualMachineNode;

  beforeEach(() => {
    node = new VirtualMachineNode({
      machineCode: 'IMM-01',
      name: 'Battenfeld 150T',
      tonnage: 150,
      nominalCycleTimeSeconds: 20.0,
      initialStatus: NormalizedStatusEnum.RUNNING,
      seed: 12345,
      isSlowCycleCandidate: false,
      isFaultCandidate: false,
    });
  });

  it('should initialize with correct configuration', () => {
    expect(node.machineCode).toBe('IMM-01');
    expect(node.tonnage).toBe(150);
    expect(node.nominalCycleTimeSeconds).toBe(20.0);
    expect(node.normalizedStatus).toBe(NormalizedStatusEnum.RUNNING);
    expect(node.cycleCounter).toBe(0);
    expect(node.currentPhase).toBe('MOLD_CLAMPING');
  });

  it('should progress through injection phases during ticks', () => {
    // 2.0s tick advances past MOLD_CLAMPING (which is 2.0s)
    node.tick(2.1);
    expect(node.currentPhase).toBe('INJECTION_BOOST');

    // Next phase is PACKING_HOLDING (3.0s)
    node.tick(3.1);
    expect(node.currentPhase).toBe('PACKING_HOLDING');
  });

  it('should complete a cycle and emit CYCLE_COMPLETED event when all phases finish', () => {
    // Tick through entire 20s cycle
    const events = node.tick(20.5);

    expect(node.cycleCounter).toBe(1);
    expect(events.length).toBeGreaterThanOrEqual(1);

    const cycleEvent = events.find((e) => e.eventType === EventTypeEnum.CYCLE_COMPLETED);
    expect(cycleEvent).toBeDefined();
    expect(cycleEvent?.machineId).toBe('IMM-01');
    expect(cycleEvent?.metrics?.cycleCounter).toBe(1);
    expect(cycleEvent?.metrics?.cycleTimeSeconds).toBeGreaterThanOrEqual(20.0);
    expect(cycleEvent?.metrics?.peakInjectionPressureBar).toBeGreaterThan(130);
    expect(cycleEvent?.metrics?.clampingForceKn).toBe(Math.round(150 * 9.81));
  });

  it('should produce deterministic metric values for identical seeds', () => {
    const nodeA = new VirtualMachineNode({
      machineCode: 'IMM-01',
      name: 'Node A',
      tonnage: 150,
      nominalCycleTimeSeconds: 20.0,
      seed: 99999,
    });

    const nodeB = new VirtualMachineNode({
      machineCode: 'IMM-01',
      name: 'Node B',
      tonnage: 150,
      nominalCycleTimeSeconds: 20.0,
      seed: 99999,
    });

    const eventsA = nodeA.tick(20.5);
    const eventsB = nodeB.tick(20.5);

    expect(eventsA[0].metrics?.peakInjectionPressureBar).toBe(
      eventsB[0].metrics?.peakInjectionPressureBar,
    );
    expect(eventsA[0].metrics?.cushionPositionMm).toBe(
      eventsB[0].metrics?.cushionPositionMm,
    );
  });

  it('should extend cycle duration when slow cycle scenario is triggered', () => {
    node.triggerSlowCycle(50); // 50% slower -> 30s nominal
    expect(node.isSlowCycleActive).toBe(true);
    expect(node.slowCycleMultiplier).toBe(1.5);

    // 20.5s is not enough to complete a 30s cycle
    const eventsAt20s = node.tick(20.5);
    expect(eventsAt20s.length).toBe(0);
    expect(node.cycleCounter).toBe(0);

    // Further 10s should complete the cycle (total ~30.5s)
    const eventsAt30s = node.tick(10.5);
    expect(eventsAt30s.length).toBe(1);
    expect(node.cycleCounter).toBe(1);
    expect(eventsAt30s[0].metrics?.cycleTimeSeconds).toBeGreaterThanOrEqual(30.0);
  });

  it('should halt cycling and emit FAULT_STARTED when fault scenario is triggered', () => {
    const faultEvent = node.triggerFault('UNP-HYD-JAM', 'Hydraulic pressure drop');

    expect(node.isFaultActive).toBe(true);
    expect(node.normalizedStatus).toBe(NormalizedStatusEnum.FAULT);
    expect(faultEvent.eventType).toBe(EventTypeEnum.FAULT_STARTED);
    expect(faultEvent.fault?.faultCode).toBe('UNP-HYD-JAM');

    // Ticks while in fault should not advance cycle or emit cycle events
    const events = node.tick(50.0);
    expect(events.length).toBe(0);
    expect(node.cycleCounter).toBe(0);

    // Clearing fault returns to running
    const clearEvent = node.clearFault();
    expect(node.isFaultActive).toBe(false);
    expect(node.normalizedStatus).toBe(NormalizedStatusEnum.RUNNING);
    expect(clearEvent.eventType).toBe(EventTypeEnum.FAULT_CLEARED);
  });

  it('should handle disconnect and reconnect scenarios', () => {
    const disconnectEvent = node.triggerDisconnect();
    expect(node.isDisconnected).toBe(true);
    expect(node.normalizedStatus).toBe(NormalizedStatusEnum.DISCONNECTED);
    expect(disconnectEvent.eventType).toBe(EventTypeEnum.SOURCE_CONNECTION_CHANGED);

    const reconnectEvent = node.triggerReconnect();
    expect(node.isDisconnected).toBe(false);
    expect(node.normalizedStatus).toBe(NormalizedStatusEnum.RUNNING);
    expect(reconnectEvent.eventType).toBe(EventTypeEnum.SOURCE_CONNECTION_CHANGED);
  });
});
