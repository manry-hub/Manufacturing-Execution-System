import { Injectable, NotFoundException, BadRequestException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { ScheduleOrderDto } from './dto/schedule-order.dto.js';
import type { RescheduleSlotDto } from './dto/reschedule-slot.dto.js';
import type { UpsertChangeoverDto } from './dto/upsert-changeover.dto.js';
import type { ScheduleQueryDto } from './dto/schedule-query.dto.js';
import { TelemetryGateway } from '../telemetry/telemetry.gateway.js';

export interface TimelineBlockConflict {
  type: 'TONNAGE_MISMATCH' | 'TOOLING_COLLISION' | 'MACHINE_OVERLAP';
  severity: 'WARNING' | 'CRITICAL';
  message: string;
}

export type TimelineBlockType = 'PRODUCTION_ORDER' | 'ACTIVE_RUN' | 'MOLD_CHANGEOVER';

export interface TimelineBlock {
  id: string;
  blockType: TimelineBlockType;
  orderId?: string;
  orderNumber?: string;
  productName?: string;
  moldId?: string;
  moldCode?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  priority?: number;
  targetQuantity?: number;
  producedQuantity?: number;
  progressPercent?: number;
  conflicts?: TimelineBlockConflict[];
}

export interface TimelineMachineRow {
  machineId: string;
  machineCode: string;
  machineName: string;
  clampingTonnage: number;
  currentStatus: string;
  blocks: TimelineBlock[];
}

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly gateway?: TelemetryGateway,
  ) {}

  /**
   * Retrieves full Gantt timeline tracks across all injection molding machines.
   */
  async getTimeline(query?: ScheduleQueryDto): Promise<{
    horizonStart: string;
    horizonEnd: string;
    machines: TimelineMachineRow[];
    summary: {
      totalScheduledOrders: number;
      activeConflictsCount: number;
      totalChangeovers: number;
      scheduledHours: number;
    };
  }> {
    const now = new Date();
    const horizonStart = query?.startDate
      ? new Date(query.startDate)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const horizonEnd = query?.endDate
      ? new Date(query.endDate)
      : new Date(horizonStart.getTime() + 7 * 24 * 3600 * 1000); // 7-day default

    // Fetch machines with their current status
    const machines = await this.prisma.machine.findMany({
      where: query?.areaId ? { areaId: query.areaId } : undefined,
      include: {
        currentState: true,
      },
      orderBy: { code: 'asc' },
    });

    // Fetch scheduled, released, or in-progress orders
    const orders = await this.prisma.productionOrder.findMany({
      where: {
        assignedMachineId: { not: null },
        status: { in: ['SCHEDULED', 'RELEASED', 'IN_PROGRESS'] },
        plannedStartTime: { lte: horizonEnd },
      },
      include: {
        product: true,
        assignedMold: true,
        runs: {
          take: 1,
          orderBy: { startTime: 'desc' },
        },
      },
      orderBy: { plannedStartTime: 'asc' },
    });

    // Fetch mold changeover matrix
    const changeoverRules = await this.prisma.moldChangeover.findMany({
      include: {
        fromMold: true,
        toMold: true,
      },
    });

    const changeoverMap = new Map<string, { setupMinutes: number; purgeMinutes: number }>();
    for (const rule of changeoverRules) {
      changeoverMap.set(`${rule.fromMoldId}_${rule.toMoldId}`, {
        setupMinutes: rule.setupMinutes,
        purgeMinutes: rule.purgeMinutes,
      });
    }

    // Index orders by machine
    const ordersByMachine = new Map<string, typeof orders>();
    for (const order of orders) {
      if (!order.assignedMachineId) continue;
      const list = ordersByMachine.get(order.assignedMachineId) ?? [];
      list.push(order);
      ordersByMachine.set(order.assignedMachineId, list);
    }

    let totalScheduledOrders = 0;
    let activeConflictsCount = 0;
    let totalChangeovers = 0;
    let totalScheduledMinutes = 0;

    const machineRows: TimelineMachineRow[] = machines.map((machine) => {
      const machineOrders = ordersByMachine.get(machine.id) ?? [];
      const blocks: TimelineBlock[] = [];

      for (let i = 0; i < machineOrders.length; i++) {
        const order = machineOrders[i];
        totalScheduledOrders++;

        const start = order.plannedStartTime;
        const end = order.plannedEndTime ?? new Date(start.getTime() + 4 * 3600 * 1000);
        const durationMinutes = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
        totalScheduledMinutes += durationMinutes;

        const conflicts: TimelineBlockConflict[] = [];

        // Check 1: Tonnage mismatch
        const moldReqTonnage = this.resolveMoldRequiredTonnage(order.assignedMold?.code);
        if (machine.clampingTonnage && moldReqTonnage > machine.clampingTonnage) {
          conflicts.push({
            type: 'TONNAGE_MISMATCH',
            severity: 'CRITICAL',
            message: `Tonnage Mismatch: Mold ${order.assignedMold?.code ?? 'Required'} needs ${moldReqTonnage}T clamping force, but ${machine.code} provides only ${machine.clampingTonnage}T.`,
          });
        }

        // Check 2: Tooling collision across other machines
        if (order.assignedMoldId) {
          for (const otherOrder of orders) {
            if (
              otherOrder.id !== order.id &&
              otherOrder.assignedMoldId === order.assignedMoldId &&
              otherOrder.assignedMachineId !== order.assignedMachineId
            ) {
              const otherStart = otherOrder.plannedStartTime;
              const otherEnd = otherOrder.plannedEndTime ?? new Date(otherStart.getTime() + 4 * 3600 * 1000);

              // Overlapping interval check
              if (start < otherEnd && end > otherStart) {
                conflicts.push({
                  type: 'TOOLING_COLLISION',
                  severity: 'CRITICAL',
                  message: `Tooling Collision: Mold ${order.assignedMold?.code} is concurrently allocated to machine on order ${otherOrder.orderNumber}.`,
                });
                break;
              }
            }
          }
        }

        if (conflicts.length > 0) {
          activeConflictsCount += conflicts.length;
        }

        // Insert Changeover Block if adjacent order on same machine had a different mold
        if (i > 0) {
          const prevOrder = machineOrders[i - 1];
          if (
            prevOrder.assignedMoldId &&
            order.assignedMoldId &&
            prevOrder.assignedMoldId !== order.assignedMoldId
          ) {
            const coRule = changeoverMap.get(`${prevOrder.assignedMoldId}_${order.assignedMoldId}`);
            const setupMins = coRule ? coRule.setupMinutes + coRule.purgeMinutes : 45;
            const coStart = prevOrder.plannedEndTime ?? new Date(prevOrder.plannedStartTime.getTime() + 4 * 3600 * 1000);
            const coEnd = new Date(coStart.getTime() + setupMins * 60000);

            blocks.push({
              id: `co-${prevOrder.id}-${order.id}`,
              blockType: 'MOLD_CHANGEOVER',
              startTime: coStart.toISOString(),
              endTime: coEnd.toISOString(),
              durationMinutes: setupMins,
              status: 'CHANGEOVER',
              productName: `Setup: ${prevOrder.assignedMold?.code ?? 'M1'} → ${order.assignedMold?.code ?? 'M2'}`,
            });
            totalChangeovers++;
          }
        }

        const activeRun = order.runs[0];
        const progressPercent =
          order.targetQuantity > 0 && activeRun?.goodQuantity
            ? Math.min(100, Math.round((activeRun.goodQuantity / order.targetQuantity) * 100))
            : 0;

        blocks.push({
          id: order.id,
          blockType: order.status === 'IN_PROGRESS' ? 'ACTIVE_RUN' : 'PRODUCTION_ORDER',
          orderId: order.id,
          orderNumber: order.orderNumber,
          productName: order.product?.name ?? 'Injection Part',
          moldId: order.assignedMoldId ?? undefined,
          moldCode: order.assignedMold?.code ?? undefined,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          durationMinutes,
          status: order.status,
          priority: order.priority,
          targetQuantity: order.targetQuantity,
          producedQuantity: activeRun?.goodQuantity ?? 0,
          progressPercent,
          conflicts: conflicts.length > 0 ? conflicts : undefined,
        });
      }

      return {
        machineId: machine.id,
        machineCode: machine.code,
        machineName: machine.name,
        clampingTonnage: machine.clampingTonnage ?? 150,
        currentStatus: machine.currentState?.normalizedStatus ?? 'IDLE',
        blocks,
      };
    });

    return {
      horizonStart: horizonStart.toISOString(),
      horizonEnd: horizonEnd.toISOString(),
      machines: machineRows,
      summary: {
        totalScheduledOrders,
        activeConflictsCount,
        totalChangeovers,
        scheduledHours: Math.round((totalScheduledMinutes / 60) * 10) / 10,
      },
    };
  }

  /**
   * Retrieves unscheduled backlog orders (status DRAFT or unassigned).
   */
  async getBacklog() {
    return this.prisma.productionOrder.findMany({
      where: {
        OR: [{ status: 'DRAFT' }, { assignedMachineId: null }],
      },
      include: {
        product: true,
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Schedules a production order onto a machine and mold slot.
   */
  async scheduleOrder(orderId: string, dto: ScheduleOrderDto) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id: orderId },
      include: { product: true },
    });

    if (!order) {
      throw new NotFoundException(`Production order with ID ${orderId} not found`);
    }

    const machine = await this.prisma.machine.findUnique({
      where: { id: dto.machineId },
    });
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${dto.machineId} not found`);
    }

    const mold = await this.prisma.mold.findUnique({
      where: { id: dto.moldId },
      include: { compatibilities: true },
    });
    if (!mold) {
      throw new NotFoundException(`Mold with ID ${dto.moldId} not found`);
    }

    const startTime = new Date(dto.plannedStartTime);
    let endTime: Date;

    if (dto.plannedEndTime) {
      endTime = new Date(dto.plannedEndTime);
      if (endTime <= startTime) {
        throw new BadRequestException('Planned end time must be after planned start time');
      }
    } else {
      // Automatic runtime calculation: (targetQty * 1.02 / cavities) * cycleTime
      const compat = mold.compatibilities.find((c) => c.productId === order.productId);
      const cycleTime = compat ? Number(compat.idealCycleTime) : Number(order.product.standardCycleTime ?? 20);
      const cavities = Math.max(1, mold.cavityCount);
      const totalShots = Math.ceil((order.targetQuantity * 1.02) / cavities);
      const durationSeconds = totalShots * cycleTime;
      endTime = new Date(startTime.getTime() + durationSeconds * 1000);
    }

    const updated = await this.prisma.productionOrder.update({
      where: { id: orderId },
      data: {
        assignedMachineId: dto.machineId,
        assignedMoldId: dto.moldId,
        plannedStartTime: startTime,
        plannedEndTime: endTime,
        priority: dto.priority ?? order.priority,
        schedulingNotes: dto.schedulingNotes ?? order.schedulingNotes,
        status: 'SCHEDULED',
      },
      include: {
        product: true,
        assignedMachine: true,
        assignedMold: true,
      },
    });

    this.logger.log(`Scheduled order ${order.orderNumber} on ${machine.code} (${startTime.toISOString()} - ${endTime.toISOString()})`);

    if (this.gateway) {
      this.gateway.broadcastSchedulingEvent('scheduling:order_scheduled', {
        orderId,
        orderNumber: order.orderNumber,
        machineId: dto.machineId,
        machineCode: machine.code,
        moldId: dto.moldId,
        plannedStartTime: startTime.toISOString(),
        plannedEndTime: endTime.toISOString(),
      });
      this.gateway.broadcastSchedulingEvent('scheduling:timeline_updated', {
        action: 'SCHEDULE',
        orderId,
      });
    }

    return updated;
  }

  /**
   * Reschedules an existing scheduled order (moving start time or machine).
   */
  async rescheduleOrder(orderId: string, dto: RescheduleSlotDto) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Production order with ID ${orderId} not found`);
    }

    if (order.status === 'IN_PROGRESS' || order.status === 'COMPLETED') {
      throw new BadRequestException(
        `Cannot reschedule order ${order.orderNumber} because it is already ${order.status}`,
      );
    }

    const newStart = new Date(dto.plannedStartTime);
    const prevStart = order.plannedStartTime;
    const prevEnd = order.plannedEndTime ?? new Date(prevStart.getTime() + 4 * 3600 * 1000);
    const durationMs = prevEnd.getTime() - prevStart.getTime();

    const newEnd = dto.plannedEndTime ? new Date(dto.plannedEndTime) : new Date(newStart.getTime() + durationMs);

    const updated = await this.prisma.productionOrder.update({
      where: { id: orderId },
      data: {
        assignedMachineId: dto.machineId ?? order.assignedMachineId,
        assignedMoldId: dto.moldId ?? order.assignedMoldId,
        plannedStartTime: newStart,
        plannedEndTime: newEnd,
      },
      include: {
        product: true,
        assignedMachine: true,
        assignedMold: true,
      },
    });

    if (this.gateway) {
      this.gateway.broadcastSchedulingEvent('scheduling:order_rescheduled', {
        orderId,
        orderNumber: order.orderNumber,
        machineId: updated.assignedMachineId,
        machineCode: updated.assignedMachine?.code,
        plannedStartTime: newStart.toISOString(),
        plannedEndTime: newEnd.toISOString(),
      });
      this.gateway.broadcastSchedulingEvent('scheduling:timeline_updated', {
        action: 'RESCHEDULE',
        orderId,
      });
    }

    return updated;
  }

  /**
   * Reverts order back to unscheduled backlog DRAFT state.
   */
  async unscheduleOrder(orderId: string) {
    const reverted = await this.prisma.productionOrder.update({
      where: { id: orderId },
      data: {
        assignedMachineId: null,
        assignedMoldId: null,
        status: 'DRAFT',
      },
    });

    if (this.gateway) {
      this.gateway.broadcastSchedulingEvent('scheduling:order_unscheduled', {
        orderId,
        orderNumber: reverted.orderNumber,
      });
      this.gateway.broadcastSchedulingEvent('scheduling:timeline_updated', {
        action: 'UNSCHEDULE',
        orderId,
      });
    }

    return reverted;
  }

  /**
   * Releases scheduled order directly to shop floor.
   */
  async releaseOrder(orderId: string) {
    const released = await this.prisma.productionOrder.update({
      where: { id: orderId },
      data: { status: 'RELEASED' },
    });

    if (this.gateway) {
      this.gateway.broadcastSchedulingEvent('scheduling:timeline_updated', {
        action: 'RELEASE',
        orderId,
      });
    }

    return released;
  }

  /**
   * Retrieves all registered mold changeover transition matrix pairs.
   */
  async getMoldChangeovers() {
    return this.prisma.moldChangeover.findMany({
      include: {
        fromMold: true,
        toMold: true,
      },
      orderBy: [{ fromMold: { code: 'asc' } }, { toMold: { code: 'asc' } }],
    });
  }

  /**
   * Upserts a pairwise changeover rule in the transition matrix.
   */
  async upsertMoldChangeover(dto: UpsertChangeoverDto) {
    const upserted = await this.prisma.moldChangeover.upsert({
      where: {
        uq_mold_changeover: {
          fromMoldId: dto.fromMoldId,
          toMoldId: dto.toMoldId,
        },
      },
      update: {
        setupMinutes: dto.setupMinutes,
        purgeMinutes: dto.purgeMinutes,
      },
      create: dto,
      include: {
        fromMold: true,
        toMold: true,
      },
    });

    if (this.gateway) {
      this.gateway.broadcastSchedulingEvent('scheduling:changeover_updated', {
        changeover: upserted,
      });
      this.gateway.broadcastSchedulingEvent('scheduling:timeline_updated', {
        action: 'CHANGEOVER',
      });
    }

    return upserted;
  }

  /**
   * Helper to estimate minimum required machine clamping tonnage for a mold code.
   */
  private resolveMoldRequiredTonnage(moldCode?: string): number {
    if (!moldCode) return 150;
    if (moldCode.includes('BUMP')) return 500; // Large automotive bumper requires 500T
    if (moldCode.includes('TRIM')) return 150; // Interior door trim panel
    if (moldCode.includes('DUCT')) return 200; // HVAC Air Duct
    return 150;
  }
}
