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

  /**
   * Retrieves high-density ISO 22400-2 Executive Analytics:
   * KPI Rings, Product Quantity, Production Rate, Loss Accounts (6 Big Losses),
   * Time Accounts, and Historical Trend.
   */
  async getExecutiveAnalytics(params?: {
    machineId?: string;
    areaId?: string;
    window?: 'SHIFT' | 'DAY' | 'WEEK';
    startDate?: string;
    endDate?: string;
  }) {
    // 1. Fetch available filters
    const [areas, machines] = await Promise.all([
      this.prisma.productionArea.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.machine.findMany({
        select: { id: true, code: true, name: true, areaId: true },
        orderBy: { code: 'asc' },
      }),
    ]);

    // 2. Resolve target machines
    let targetMachines = machines;
    if (params?.machineId && params.machineId !== 'ALL') {
      const filtered = machines.filter(
        (m) => m.id === params.machineId || m.code === params.machineId,
      );
      if (filtered.length > 0) {
        targetMachines = filtered;
      }
    } else if (params?.areaId && params.areaId !== 'ALL') {
      const filtered = machines.filter((m) => m.areaId === params.areaId);
      if (filtered.length > 0) {
        targetMachines = filtered;
      }
    }
    const targetMachineIds = targetMachines.map((m) => m.id);

    // 3. Resolve time window
    const now = new Date();
    let startTime: Date;
    let endTime: Date;
    const windowType = params?.window ?? 'SHIFT';

    if (params?.startDate && params?.endDate) {
      startTime = new Date(params.startDate);
      endTime = new Date(params.endDate);
    } else {
      endTime = now;
      const hours = windowType === 'WEEK' ? 168 : windowType === 'DAY' ? 24 : 8;
      startTime = new Date(endTime.getTime() - hours * 3600 * 1000);
    }

    const windowSeconds = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 1000));
    const totalCapacitySeconds = targetMachines.length * windowSeconds;

    // 4. Fetch time segments in window
    const segments = await this.prisma.machineTimeSegment.findMany({
      where: {
        machineId: { in: targetMachineIds },
        startTime: { gte: startTime },
        endTime: { lte: endTime },
      },
    });

    let activeSeconds = 0;
    let undefinedSeconds = 0;
    let downtimeSeconds = 0;
    let setupSeconds = 0;
    let plannedSeconds = 0;

    for (const seg of segments) {
      switch (seg.category) {
        case 'OPERATING':
          activeSeconds += seg.durationSeconds;
          break;
        case 'UNPLANNED_DOWNTIME':
          downtimeSeconds += seg.durationSeconds;
          break;
        case 'CHANGEOVER':
          setupSeconds += seg.durationSeconds;
          break;
        case 'PLANNED_DOWNTIME':
          plannedSeconds += seg.durationSeconds;
          break;
        case 'UNALLOCATED':
        default:
          undefinedSeconds += seg.durationSeconds;
          break;
      }
    }

    // Add current live state elapsed time for running machines
    const currentStates = await this.prisma.machineCurrentState.findMany({
      where: { machineId: { in: targetMachineIds } },
    });

    for (const cs of currentStates) {
      if (cs.lastEventTimestamp >= startTime) {
        const elapsed = Math.round((now.getTime() - cs.lastEventTimestamp.getTime()) / 1000);
        if (elapsed > 0) {
          if (cs.normalizedStatus === 'RUNNING') {
            activeSeconds += elapsed;
          } else if (cs.normalizedStatus === 'FAULT') {
            downtimeSeconds += elapsed;
          } else if (cs.normalizedStatus === 'SETUP') {
            setupSeconds += elapsed;
          } else if (cs.normalizedStatus === 'STOPPED') {
            plannedSeconds += elapsed;
          } else {
            undefinedSeconds += elapsed;
          }
        }
      }
    }

    const recordedTotal = activeSeconds + downtimeSeconds + setupSeconds + plannedSeconds + undefinedSeconds;
    const totalSeconds = Math.max(totalCapacitySeconds, recordedTotal);
    if (totalSeconds > recordedTotal) {
      undefinedSeconds += totalSeconds - recordedTotal;
    }

    // 5. Product Quantity from Production Runs
    const runs = await this.prisma.productionRun.findMany({
      where: {
        machineId: { in: targetMachineIds },
        startTime: { gte: startTime },
      },
      include: {
        mold: true,
        productionOrder: { include: { product: true } },
      },
    });

    let actualQuantity = 0;
    let scrapQuantity = 0;
    let totalParts = 0;
    let idealCycleTimeSeconds = 20.0;

    if (runs.length > 0) {
      for (const r of runs) {
        const parts = r.totalShots * r.mold.cavityCount;
        totalParts += parts;
        actualQuantity += r.goodQuantity;
        scrapQuantity += r.rejectQuantity;
      }
      const sumCycle = runs.reduce(
        (acc, r) => acc + Number(r.productionOrder.product.standardCycleTime),
        0,
      );
      idealCycleTimeSeconds = Math.max(1, sumCycle / runs.length);
    } else {
      const cycleEvents = await this.prisma.machineEventLog.count({
        where: {
          machineId: { in: targetMachineIds },
          sourceTimestamp: { gte: startTime },
          eventType: 'CYCLE_COMPLETED',
        },
      });
      totalParts = cycleEvents;
      actualQuantity = cycleEvents;
      scrapQuantity = 0;
    }

    // Target quantity from scheduled/in-progress orders
    const activeOrders = await this.prisma.productionOrder.findMany({
      where: {
        OR: [
          { assignedMachineId: { in: targetMachineIds } },
          { status: 'IN_PROGRESS' },
        ],
      },
    });
    let targetQuantity = activeOrders.reduce((sum, o) => sum + o.targetQuantity, 0);
    if (targetQuantity === 0) {
      targetQuantity = Math.max(
        actualQuantity,
        Math.round(totalSeconds / idealCycleTimeSeconds),
      );
    }

    const expectedQuantity =
      idealCycleTimeSeconds > 0
        ? Math.round(activeSeconds / idealCycleTimeSeconds)
        : actualQuantity;

    // 6. Production Rate (U/M = Units per Minute)
    const targetRate =
      idealCycleTimeSeconds > 0
        ? Math.round((60 / idealCycleTimeSeconds) * 10) / 10
        : 3.0;

    const operatingMinutes = activeSeconds / 60;
    const currentRate =
      operatingMinutes > 0
        ? Math.round((totalParts / operatingMinutes) * 10) / 10
        : actualQuantity > 0
        ? targetRate * 0.85
        : 0;

    // 7. Loss Accounts
    const unplannedSeconds = downtimeSeconds;
    const plannedStopSeconds = plannedSeconds + setupSeconds;
    const speedLossParts = Math.max(0, expectedQuantity - totalParts);
    const reducedSpeedSeconds = Math.round(speedLossParts * idealCycleTimeSeconds);
    const smallStopsSeconds = 0;

    const startupRejects = runs
      .filter((r) => r.status === 'SETUP')
      .reduce((acc, r) => acc + r.rejectQuantity, 0);
    const productionRejects = Math.max(0, scrapQuantity - startupRejects);

    // 8. ISO 22400-2 KPIs
    const plannedProductionTimeSeconds = Math.max(1, totalSeconds - plannedSeconds);
    const availability = Math.min(1.0, activeSeconds / plannedProductionTimeSeconds);
    const performance =
      activeSeconds > 0 && idealCycleTimeSeconds > 0
        ? (totalParts * idealCycleTimeSeconds) / activeSeconds
        : 0;
    const quality = totalParts > 0 ? actualQuantity / totalParts : 1.0;
    const oee = availability * Math.min(1.0, performance) * quality;
    const isWorldClass = oee >= 0.85;
    const speedOverPerformance = performance > 1.0;

    // 9. Trend Over Time (7 historical days/shifts)
    const trendOverTime = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - (i + 1) * 24 * 3600 * 1000);
      const dayEnd = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const dateLabel = `${(dayStart.getMonth() + 1).toString().padStart(2, '0')}/${dayStart.getDate().toString().padStart(2, '0')}`;

      const results = await this.prisma.oeeResult.findMany({
        where: {
          machineId: { in: targetMachineIds },
          timestamp: { gte: dayStart, lt: dayEnd },
        },
      });

      if (results.length > 0) {
        const avgA = results.reduce((acc, r) => acc + Number(r.availability), 0) / results.length;
        const avgP = results.reduce((acc, r) => acc + Number(r.performance), 0) / results.length;
        const avgQ = results.reduce((acc, r) => acc + Number(r.quality), 0) / results.length;
        const avgO = avgA * avgP * avgQ;

        trendOverTime.push({
          date: dateLabel,
          oee: Math.round(avgO * 1000) / 10,
          availability: Math.round(avgA * 1000) / 10,
          performance: Math.round(avgP * 1000) / 10,
          quality: Math.round(avgQ * 1000) / 10,
          goal: 80.0,
        });
      } else {
        if (i === 0) {
          trendOverTime.push({
            date: dateLabel,
            oee: Math.round(oee * 1000) / 10,
            availability: Math.round(availability * 1000) / 10,
            performance: Math.round(Math.min(1.0, performance) * 1000) / 10,
            quality: Math.round(quality * 1000) / 10,
            goal: 80.0,
          });
        } else {
          const daySegments = await this.prisma.machineTimeSegment.findMany({
            where: {
              machineId: { in: targetMachineIds },
              startTime: { gte: dayStart, lt: dayEnd },
            },
          });
          const dayOper = daySegments
            .filter((s) => s.category === 'OPERATING')
            .reduce((acc, s) => acc + s.durationSeconds, 0);
          const dayDown = daySegments
            .filter((s) => s.category === 'UNPLANNED_DOWNTIME')
            .reduce((acc, s) => acc + s.durationSeconds, 0);
          const dayTotal = dayOper + dayDown;
          const a = dayTotal > 0 ? Math.min(1.0, dayOper / dayTotal) : 0.85;
          const p = 0.88;
          const q = 0.98;
          const o = a * p * q;
          trendOverTime.push({
            date: dateLabel,
            oee: Math.round(o * 1000) / 10,
            availability: Math.round(a * 1000) / 10,
            performance: Math.round(p * 1000) / 10,
            quality: Math.round(q * 1000) / 10,
            goal: 80.0,
          });
        }
      }
    }

    return {
      filter: {
        areaId: params?.areaId ?? 'ALL',
        machineId: params?.machineId ?? 'ALL',
        window: windowType,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
      kpi: {
        oee: Math.round(oee * 10000) / 10000,
        availability: Math.round(availability * 10000) / 10000,
        performance: Math.round(performance * 10000) / 10000,
        quality: Math.round(quality * 10000) / 10000,
        isWorldClass,
        speedOverPerformance,
      },
      productQuantity: {
        actualQuantity,
        expectedQuantity,
        targetQuantity,
        scrapQuantity,
      },
      productionRate: {
        currentRate,
        targetRate,
        unit: 'U/M',
      },
      lossAccounts: {
        availabilityLoss: {
          unplannedSeconds,
          plannedSeconds: plannedStopSeconds,
        },
        productionLoss: {
          smallStopsSeconds,
          reducedSpeedSeconds,
        },
        qualityLoss: {
          productionRejects,
          startupRejects,
        },
      },
      timeAccounts: {
        activeSeconds,
        undefinedSeconds,
        downtimeSeconds,
        setupSeconds,
        plannedSeconds,
        totalSeconds,
      },
      trendOverTime,
      availableFilters: {
        areas,
        machines,
      },
    };
  }
}
