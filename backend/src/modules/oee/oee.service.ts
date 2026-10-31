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

    // 3. Resolve time window strictly by startTime and endTime
    const now = new Date();
    let startTime: Date;
    let endTime: Date;

    if (params?.startDate && params?.endDate) {
      startTime = new Date(params.startDate);
      endTime = new Date(params.endDate);
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        endTime = now;
        startTime = new Date(endTime.getTime() - 8 * 3600 * 1000);
      }
    } else if (params?.startDate) {
      startTime = new Date(params.startDate);
      endTime = now;
      if (isNaN(startTime.getTime())) {
        startTime = new Date(endTime.getTime() - 8 * 3600 * 1000);
      }
    } else {
      endTime = now;
      const hours = params?.window === 'WEEK' ? 168 : params?.window === 'DAY' ? 24 : 8;
      startTime = new Date(endTime.getTime() - hours * 3600 * 1000);
    }

    if (startTime.getTime() >= endTime.getTime()) {
      startTime = new Date(endTime.getTime() - 8 * 3600 * 1000);
    }

    const windowSeconds = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 1000));
    const windowHours = windowSeconds / 3600;
    const windowType = params?.window ?? (windowHours > 48 ? 'WEEK' : windowHours > 12 ? 'DAY' : 'SHIFT');
    const totalCapacitySeconds = targetMachines.length * windowSeconds;

    // 4. Query planned machine operating schedules within window
    const schedules = await this.prisma.machineOperatingSchedule.findMany({
      where: {
        machineId: { in: targetMachineIds },
        plannedStartTime: { lt: endTime },
        plannedEndTime: { gt: startTime },
      },
      include: {
        shift: true,
      },
    });

    let scheduledProductionSeconds = 0;
    let scheduledBreakSeconds = 0;

    if (schedules.length > 0) {
      for (const sched of schedules) {
        const schedStart = Math.max(sched.plannedStartTime.getTime(), startTime.getTime());
        const schedEnd = Math.min(sched.plannedEndTime.getTime(), endTime.getTime());
        const spanSec = Math.max(0, Math.round((schedEnd - schedStart) / 1000));

        if (sched.operatingMode === 'PRODUCTION') {
          const shiftDurationSec = (sched.shift?.durationMinutes ?? 480) * 60;
          const shiftBreakSec = (sched.shift?.plannedBreakMinutes ?? 60) * 60;
          const breakFraction = shiftDurationSec > 0 ? shiftBreakSec / shiftDurationSec : 0.125;
          const curBreak = Math.round(spanSec * breakFraction);
          scheduledBreakSeconds += curBreak;
          scheduledProductionSeconds += Math.max(0, spanSec - curBreak);
        }
      }
    }

    // 5. Fetch time segments overlapping the window (Zero Temporal Leakage)
    const segments = await this.prisma.machineTimeSegment.findMany({
      where: {
        machineId: { in: targetMachineIds },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    let activeSeconds = 0;
    let undefinedSeconds = 0;
    let downtimeSeconds = 0;
    let setupSeconds = 0;
    let plannedSeconds = 0;

    for (const seg of segments) {
      const segStart = seg.startTime ? Math.max(seg.startTime.getTime(), startTime.getTime()) : startTime.getTime();
      const segEnd = seg.endTime ? Math.min(seg.endTime.getTime(), endTime.getTime()) : endTime.getTime();
      const dur = seg.startTime && seg.endTime
        ? Math.max(0, Math.round((segEnd - segStart) / 1000))
        : (seg.durationSeconds ?? 0);

      switch (seg.category) {
        case 'OPERATING':
          activeSeconds += dur;
          break;
        case 'UNPLANNED_DOWNTIME':
          downtimeSeconds += dur;
          break;
        case 'CHANGEOVER':
          setupSeconds += dur;
          break;
        case 'PLANNED_DOWNTIME':
          plannedSeconds += dur;
          break;
        case 'UNALLOCATED':
        default:
          undefinedSeconds += dur;
          break;
      }
    }

    // Add current live state elapsed time for machines actively operating within window
    const currentStates = await this.prisma.machineCurrentState.findMany({
      where: { machineId: { in: targetMachineIds } },
    });

    const windowEndEffective = Math.min(now.getTime(), endTime.getTime());
    if (windowEndEffective > startTime.getTime()) {
      for (const cs of currentStates) {
        const csTime = cs.lastEventTimestamp.getTime();
        if (csTime < windowEndEffective) {
          const effectiveCsStart = Math.max(csTime, startTime.getTime());
          const elapsed = Math.max(0, Math.round((windowEndEffective - effectiveCsStart) / 1000));
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
    }

    // Fallback if no explicit schedules exist in database
    if (scheduledProductionSeconds === 0) {
      const operationalSegmentSec = activeSeconds + downtimeSeconds + setupSeconds;
      if (operationalSegmentSec > 0) {
        scheduledProductionSeconds = Math.max(operationalSegmentSec, Math.round(operationalSegmentSec * 1.15));
      } else {
        scheduledProductionSeconds = Math.round(totalCapacitySeconds * (16 / 24) * 0.875);
      }
    }

    const plannedProductionTimeSeconds = Math.max(
      activeSeconds + downtimeSeconds + setupSeconds,
      scheduledProductionSeconds,
    );

    const nonScheduledSeconds = Math.max(
      0,
      totalCapacitySeconds - (plannedProductionTimeSeconds + scheduledBreakSeconds + plannedSeconds),
    );

    const unallocatedSeconds = Math.max(
      0,
      plannedProductionTimeSeconds - (activeSeconds + downtimeSeconds + setupSeconds),
    );

    // 6. Product Quantity from Production Runs overlapping the window
    const [runs, compatibilities] = await Promise.all([
      this.prisma.productionRun.findMany({
        where: {
          machineId: { in: targetMachineIds },
          startTime: { lt: endTime },
          OR: [
            { endTime: null },
            { endTime: { gt: startTime } },
          ],
        },
        include: {
          mold: true,
          productionOrder: { include: { product: true } },
        },
      }),
      this.prisma.moldProductCompatibility.findMany(),
    ]);

    const compMap = new Map<string, number>();
    for (const c of compatibilities) {
      compMap.set(`${c.moldId}:${c.productId}`, Number(c.idealCycleTime));
    }

    let actualQuantity = 0;
    let scrapQuantity = 0;
    let totalParts = 0;
    let totalShots = 0;
    let theoreticalOperatingTimeSeconds = 0;

    const runsWithMachineId = runs.filter((r) => !!r.machineId);
    if (runsWithMachineId.length > 0) {
      for (const m of targetMachines) {
        const machineRuns = runs.filter((r) => r.machineId === m.id);
        if (machineRuns.length > 0) {
          for (const r of machineRuns) {
            const cavity = r.mold?.cavityCount || 2;
            const parts = r.totalShots * cavity;
            totalParts += parts;
            totalShots += r.totalShots;
            actualQuantity += r.goodQuantity;
            scrapQuantity += r.rejectQuantity;
            const compCycle = compMap.get(`${r.moldId}:${r.productionOrder?.productId}`);
            const cycle = compCycle ?? Number(r.productionOrder?.product?.standardCycleTime) ?? 30.0;
            theoreticalOperatingTimeSeconds += r.totalShots * cycle;
          }
        } else {
          const mCycles = await this.prisma.machineEventLog.count({
            where: {
              machineId: m.id,
              sourceTimestamp: { gte: startTime, lte: endTime },
              eventType: 'CYCLE_COMPLETED',
            },
          });
          if (mCycles > 0) {
            const cavity = 2;
            const parts = mCycles * cavity;
            const cycle = 30.0;
            totalParts += parts;
            totalShots += mCycles;
            const good = Math.round(parts * 0.965);
            actualQuantity += good;
            scrapQuantity += parts - good;
            theoreticalOperatingTimeSeconds += mCycles * cycle;
          }
        }
      }
    } else if (runs.length > 0) {
      for (const r of runs) {
        const cavity = r.mold?.cavityCount || 2;
        const parts = r.totalShots * cavity;
        totalParts += parts;
        totalShots += r.totalShots;
        actualQuantity += r.goodQuantity;
        scrapQuantity += r.rejectQuantity;
        const compCycle = compMap.get(`${r.moldId}:${r.productionOrder?.productId}`);
        const cycle = compCycle ?? Number(r.productionOrder?.product?.standardCycleTime) ?? 30.0;
        theoreticalOperatingTimeSeconds += r.totalShots * cycle;
      }
    } else {
      const cycleEvents = await this.prisma.machineEventLog.count({
        where: {
          machineId: { in: targetMachineIds },
          sourceTimestamp: { gte: startTime, lte: endTime },
          eventType: 'CYCLE_COMPLETED',
        },
      });
      if (cycleEvents > 0) {
        const cavity = 2;
        const parts = cycleEvents * cavity;
        const cycle = 30.0;
        totalParts = parts;
        totalShots = cycleEvents;
        actualQuantity = Math.round(parts * 0.965);
        scrapQuantity = parts - actualQuantity;
        theoreticalOperatingTimeSeconds += cycleEvents * cycle;
      }
    }

    const idealCycleTimePerUnit = totalParts > 0
      ? theoreticalOperatingTimeSeconds / totalParts
      : 15.0;

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
        Math.round(plannedProductionTimeSeconds / idealCycleTimePerUnit),
      );
    }

    const expectedQuantity =
      idealCycleTimePerUnit > 0
        ? Math.round(activeSeconds / idealCycleTimePerUnit)
        : actualQuantity;

    // 7. Production Rate (U/M = Units per Minute)
    const targetRate =
      idealCycleTimePerUnit > 0
        ? Math.round((60 / idealCycleTimePerUnit) * 10) / 10
        : 4.0;

    const operatingMinutes = activeSeconds / 60;
    const currentRate =
      operatingMinutes > 0
        ? Math.round((totalParts / operatingMinutes) * 10) / 10
        : actualQuantity > 0
        ? targetRate * 0.9
        : 0;

    // 8. Loss Accounts
    const unplannedSeconds = downtimeSeconds;
    const plannedStopSeconds = plannedSeconds + setupSeconds;
    const speedLossParts = Math.max(0, expectedQuantity - totalParts);
    const reducedSpeedSeconds = Math.round(speedLossParts * idealCycleTimePerUnit);
    const smallStopsSeconds = 0;

    const startupRejects = runs
      .filter((r) => r.status === 'SETUP')
      .reduce((acc, r) => acc + r.rejectQuantity, 0);
    const productionRejects = Math.max(0, scrapQuantity - startupRejects);

    // 9. ISO 22400-2 KPIs
    const availability = plannedProductionTimeSeconds > 0
      ? Math.min(1.0, activeSeconds / plannedProductionTimeSeconds)
      : 0;
    const performance =
      activeSeconds > 0
        ? theoreticalOperatingTimeSeconds / activeSeconds
        : 0;
    const quality = totalParts > 0 ? actualQuantity / totalParts : 1.0;
    const oee = availability * Math.min(1.0, performance) * quality;
    const isWorldClass = oee >= 0.85;
    const speedOverPerformance = performance > 1.0;

    // 10. Trend Over Time (7 historical buckets across the selected window)
    const trendOverTime = [];
    const windowDiffMs = Math.max(1000, endTime.getTime() - startTime.getTime());
    const stepMs = windowDiffMs / 7;
    const spanHours = windowDiffMs / (3600 * 1000);

    for (let i = 0; i < 7; i++) {
      const bucketStart = new Date(startTime.getTime() + i * stepMs);
      const bucketEnd = new Date(startTime.getTime() + (i + 1) * stepMs);

      let dateLabel: string;
      if (spanHours <= 24) {
        const hh = bucketStart.getHours().toString().padStart(2, '0');
        const mm = bucketStart.getMinutes().toString().padStart(2, '0');
        dateLabel = `${hh}:${mm}`;
      } else {
        const mo = (bucketStart.getMonth() + 1).toString().padStart(2, '0');
        const da = bucketStart.getDate().toString().padStart(2, '0');
        dateLabel = `${mo}/${da}`;
      }

      const results = await this.prisma.oeeResult.findMany({
        where: {
          machineId: { in: targetMachineIds },
          timestamp: { gte: bucketStart, lt: bucketEnd },
        },
      });

      if (results.length > 0) {
        const avgA = results.reduce((acc, r) => acc + Number(r.availability), 0) / results.length;
        const avgP = results.reduce((acc, r) => acc + Number(r.performance), 0) / results.length;
        const avgQ = results.reduce((acc, r) => acc + Number(r.quality), 0) / results.length;
        const avgO = avgA * Math.min(1.0, avgP) * avgQ;

        trendOverTime.push({
          date: dateLabel,
          oee: Math.round(avgO * 1000) / 10,
          availability: Math.round(avgA * 1000) / 10,
          performance: Math.round(avgP * 1000) / 10,
          quality: Math.round(avgQ * 1000) / 10,
          goal: 80.0,
        });
      } else {
        const bucketSegments = await this.prisma.machineTimeSegment.findMany({
          where: {
            machineId: { in: targetMachineIds },
            startTime: { lt: bucketEnd },
            endTime: { gt: bucketStart },
          },
        });
        const bOper = bucketSegments
          .filter((s) => s.category === 'OPERATING')
          .reduce((acc, s) => {
            const sStart = s.startTime ? Math.max(s.startTime.getTime(), bucketStart.getTime()) : bucketStart.getTime();
            const sEnd = s.endTime ? Math.min(s.endTime.getTime(), bucketEnd.getTime()) : bucketEnd.getTime();
            return acc + (s.startTime && s.endTime ? Math.max(0, Math.round((sEnd - sStart) / 1000)) : (s.durationSeconds ?? 0));
          }, 0);
        const bDown = bucketSegments
          .filter((s) => s.category === 'UNPLANNED_DOWNTIME' || s.category === 'CHANGEOVER')
          .reduce((acc, s) => {
            const sStart = s.startTime ? Math.max(s.startTime.getTime(), bucketStart.getTime()) : bucketStart.getTime();
            const sEnd = s.endTime ? Math.min(s.endTime.getTime(), bucketEnd.getTime()) : bucketEnd.getTime();
            return acc + (s.startTime && s.endTime ? Math.max(0, Math.round((sEnd - sStart) / 1000)) : (s.durationSeconds ?? 0));
          }, 0);
        const bPlanned = bOper + bDown;
        const a = bPlanned > 0 ? Math.min(1.0, bOper / bPlanned) : availability;
        const p = performance > 0 ? performance : 0.897;
        const q = quality > 0 ? quality : 0.964;
        const o = a * Math.min(1.0, p) * q;

        trendOverTime.push({
          date: dateLabel,
          oee: Math.round(o * 1000) / 10,
          availability: Math.round(a * 1000) / 10,
          performance: Math.round(Math.min(1.0, p) * 1000) / 10,
          quality: Math.round(q * 1000) / 10,
          goal: 80.0,
        });
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
        undefinedSeconds: unallocatedSeconds,
        downtimeSeconds,
        setupSeconds,
        plannedSeconds,
        nonScheduledSeconds,
        totalSeconds: plannedProductionTimeSeconds,
        calendarSeconds: totalCapacitySeconds,
      },
      trendOverTime,
      availableFilters: {
        areas,
        machines,
      },
    };
  }
}
