import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { OeeCalculator, OeeCalculationInput } from './oee-calculator.js';

@Injectable()
export class OeeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves machine by ID or code.
   */
  private async resolveMachine(identifier: string) {
    const machine = await this.prisma.machine.findFirst({
      where: {
        OR: [{ id: identifier }, { code: identifier }],
      },
      include: {
        currentState: true,
      },
    });

    if (!machine) {
      throw new NotFoundException(`Machine "${identifier}" not found`);
    }

    return machine;
  }

  /**
   * Calculates OEE for a specific Production Run.
   */
  async calculateRunOee(runId: string) {
    const run = await this.prisma.productionRun.findUnique({
      where: { id: runId },
      include: {
        productionOrder: { include: { product: true } },
        mold: true,
        machine: true,
      },
    });

    if (!run) {
      throw new NotFoundException(`Production run with ID "${runId}" not found`);
    }

    const startTime = run.startTime;
    const endTime = run.endTime ?? new Date();
    const plannedProductionTimeSeconds = Math.max(
      1,
      Math.round((endTime.getTime() - startTime.getTime()) / 1000),
    );

    // Sum time segments during run window
    const segments = await this.prisma.machineTimeSegment.findMany({
      where: {
        machineId: run.machineId,
        startTime: { gte: startTime },
        endTime: { lte: endTime },
      },
    });

    let operatingTimeSeconds = segments
      .filter((s) => s.category === 'OPERATING')
      .reduce((acc, s) => acc + s.durationSeconds, 0);

    // If no closed segments exist yet and machine is currently RUNNING
    const currentState = await this.prisma.machineCurrentState.findUnique({
      where: { machineId: run.machineId },
    });

    if (operatingTimeSeconds === 0 && currentState?.normalizedStatus === 'RUNNING') {
      operatingTimeSeconds = plannedProductionTimeSeconds;
    }

    // Retrieve ideal cycle time from compatibility matrix
    const compatibility = await this.prisma.moldProductCompatibility.findFirst({
      where: {
        moldId: run.moldId,
        productId: run.productionOrder.productId,
      },
    });

    const idealCycleTimeSeconds = compatibility
      ? Number(compatibility.idealCycleTime)
      : Number(run.productionOrder.product.standardCycleTime);

    const totalPartsProduced = run.totalShots * run.mold.cavityCount;
    const goodPartsCount = run.goodQuantity;

    const metrics = OeeCalculator.calculate({
      plannedProductionTimeSeconds,
      operatingTimeSeconds,
      idealCycleTimeSeconds,
      totalPartsProduced,
      goodPartsCount,
    });

    // Persist into oee_results
    await this.prisma.oeeResult.create({
      data: {
        machineId: run.machineId,
        runId: run.id,
        calculationWindow: 'RUN',
        availability: metrics.availability,
        performance: Math.min(1.0, metrics.performance),
        quality: metrics.quality,
        oee: metrics.oee,
      },
    });

    return {
      runId: run.id,
      machineCode: run.machine.code,
      orderNumber: run.productionOrder.orderNumber,
      metrics,
    };
  }

  /**
   * Calculates OEE for a specific machine across a rolling window ('RUN' | 'SHIFT' | 'DAY').
   */
  async calculateMachineOee(identifier: string, window: 'RUN' | 'SHIFT' | 'DAY' = 'SHIFT') {
    const machine = await this.resolveMachine(identifier);

    if (window === 'RUN') {
      // Find latest or active run on machine
      const activeRun = await this.prisma.productionRun.findFirst({
        where: { machineId: machine.id },
        orderBy: { startTime: 'desc' },
      });

      if (activeRun) {
        return this.calculateRunOee(activeRun.id);
      }
    }

    const windowHours = window === 'DAY' ? 24 : 8;
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowHours * 3600 * 1000);
    const plannedProductionTimeSeconds = windowHours * 3600;

    // Fetch time segments in window
    const segments = await this.prisma.machineTimeSegment.findMany({
      where: {
        machineId: machine.id,
        startTime: { gte: windowStart },
      },
    });

    let operatingTimeSeconds = segments
      .filter((s) => s.category === 'OPERATING')
      .reduce((acc, s) => acc + s.durationSeconds, 0);

    // If currently running, add elapsed time of current cycle/state
    if (machine.currentState?.normalizedStatus === 'RUNNING') {
      const elapsed = Math.round((now.getTime() - machine.currentState.lastEventTimestamp.getTime()) / 1000);
      operatingTimeSeconds += Math.max(0, elapsed);
    }
    operatingTimeSeconds = Math.min(plannedProductionTimeSeconds, operatingTimeSeconds);

    // Retrieve production runs in this window
    const runsInWindow = await this.prisma.productionRun.findMany({
      where: {
        machineId: machine.id,
        startTime: { gte: windowStart },
      },
      include: {
        mold: true,
        productionOrder: { include: { product: true } },
      },
    });

    let totalPartsProduced = 0;
    let goodPartsCount = 0;
    let idealCycleTimeSeconds = 20.0; // standard default if no runs

    if (runsInWindow.length > 0) {
      for (const r of runsInWindow) {
        totalPartsProduced += r.totalShots * r.mold.cavityCount;
        goodPartsCount += r.goodQuantity;
      }
      idealCycleTimeSeconds = Number(runsInWindow[0].productionOrder.product.standardCycleTime);
    } else {
      // If machine is running in simulator without explicit order
      const eventLogs = await this.prisma.machineEventLog.findMany({
        where: {
          machineId: machine.id,
          sourceTimestamp: { gte: windowStart },
          eventType: 'CYCLE_COMPLETED',
        },
      });

      totalPartsProduced = eventLogs.length; // assuming 1 part per shot baseline
      goodPartsCount = totalPartsProduced;
    }

    const metrics = OeeCalculator.calculate({
      plannedProductionTimeSeconds,
      operatingTimeSeconds,
      idealCycleTimeSeconds,
      totalPartsProduced,
      goodPartsCount,
    });

    // Record snapshot
    await this.prisma.oeeResult.create({
      data: {
        machineId: machine.id,
        calculationWindow: window,
        availability: metrics.availability,
        performance: Math.min(1.0, metrics.performance),
        quality: metrics.quality,
        oee: metrics.oee,
      },
    });

    return {
      machineId: machine.id,
      machineCode: machine.code,
      window,
      metrics,
    };
  }

  /**
   * Calculates plant-wide OEE using ISO 22400-2 weighted aggregation across all machines.
   */
  async calculatePlantOee(window: 'SHIFT' | 'DAY' = 'SHIFT') {
    const machines = await this.prisma.machine.findMany({
      orderBy: { code: 'asc' },
    });
    const machineInputs: OeeCalculationInput[] = [];
    const machineBreakdown = [];

    for (const machine of machines) {
      const oeeData = await this.calculateMachineOee(machine.id, window);
      machineInputs.push({
        plannedProductionTimeSeconds: oeeData.metrics.breakdown.plannedProductionTimeSeconds,
        operatingTimeSeconds: oeeData.metrics.breakdown.operatingTimeSeconds,
        idealCycleTimeSeconds: oeeData.metrics.breakdown.idealCycleTimeSeconds,
        totalPartsProduced: oeeData.metrics.breakdown.totalPartsProduced,
        goodPartsCount: oeeData.metrics.breakdown.goodPartsCount,
      });
      machineBreakdown.push({
        machineId: machine.id,
        machineCode: machine.code,
        machineName: machine.name,
        metrics: oeeData.metrics,
      });
    }

    const aggregatedMetrics = OeeCalculator.aggregate(machineInputs);

    return {
      window,
      machineCount: machines.length,
      metrics: aggregatedMetrics,
      machineBreakdown,
    };
  }
}
