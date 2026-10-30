import { BadRequestException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreatePmScheduleDto } from './dto/create-pm-schedule.dto.js';
import { CreateMaintenanceWorkOrderDto } from './dto/create-work-order.dto.js';
import { UpdateMaintenanceWorkOrderDto } from './dto/update-work-order.dto.js';
import { TelemetryGateway } from '../telemetry/telemetry.gateway.js';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly gateway?: TelemetryGateway,
  ) {}

  async createSchedule(dto: CreatePmScheduleDto) {
    const mold = await this.prisma.mold.findUnique({
      where: { id: dto.moldId },
    });
    if (!mold) {
      throw new NotFoundException(`Mold with ID "${dto.moldId}" not found`);
    }

    return this.prisma.moldPmSchedule.create({
      data: {
        moldId: dto.moldId,
        pmLevel: dto.pmLevel,
        intervalShots: BigInt(dto.intervalShots),
        lastServicedShot: mold.totalShots,
        isActive: true,
      },
      include: { mold: true },
    });
  }

  async getSchedulesByMold(moldId: string) {
    const schedules = await this.prisma.moldPmSchedule.findMany({
      where: { moldId },
      include: { mold: true },
    });

    return schedules.map((s) => ({
      ...s,
      intervalShots: s.intervalShots.toString(),
      lastServicedShot: s.lastServicedShot.toString(),
    }));
  }

  async createWorkOrder(dto: CreateMaintenanceWorkOrderDto) {
    const existing = await this.prisma.maintenanceWorkOrder.findUnique({
      where: { orderNumber: dto.orderNumber },
    });
    if (existing) {
      throw new BadRequestException(`Work order with number "${dto.orderNumber}" already exists`);
    }

    const order = await this.prisma.maintenanceWorkOrder.create({
      data: {
        orderNumber: dto.orderNumber,
        moldId: dto.moldId ?? null,
        machineId: dto.machineId ?? null,
        workType: dto.workType,
        status: 'OPEN',
        assignedTechId: dto.assignedTechId ?? null,
        triggerShots: dto.triggerShots !== undefined ? BigInt(dto.triggerShots) : null,
        checklistPayload: dto.checklistPayload ?? null,
      },
      include: {
        mold: true,
        machine: true,
        assignedTech: { select: { id: true, username: true, email: true } },
      },
    });

    const result = {
      ...order,
      triggerShots: order.triggerShots ? order.triggerShots.toString() : null,
    };

    if (this.gateway) {
      this.gateway.broadcastMaintenanceEvent('maintenance:work_order_created', {
        workOrder: result,
        moldId: order.moldId,
        moldCode: order.mold?.code,
      });
    }

    return result;
  }

  async findAllWorkOrders(filter?: {
    moldId?: string;
    machineId?: string;
    status?: string;
    workType?: string;
  }) {
    const orders = await this.prisma.maintenanceWorkOrder.findMany({
      where: {
        moldId: filter?.moldId || undefined,
        machineId: filter?.machineId || undefined,
        status: filter?.status || undefined,
        workType: filter?.workType || undefined,
      },
      include: {
        mold: true,
        machine: true,
        assignedTech: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => ({
      ...o,
      triggerShots: o.triggerShots ? o.triggerShots.toString() : null,
    }));
  }

  async findOneWorkOrder(id: string) {
    const order = await this.prisma.maintenanceWorkOrder.findUnique({
      where: { id },
      include: {
        mold: true,
        machine: true,
        assignedTech: { select: { id: true, username: true, email: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Maintenance work order with ID "${id}" not found`);
    }

    const result = {
      ...order,
      triggerShots: order.triggerShots ? order.triggerShots.toString() : null,
    };

    if (this.gateway) {
      this.gateway.broadcastMaintenanceEvent('maintenance:work_order_created', {
        workOrder: result,
        moldId: order.moldId,
        moldCode: order.mold?.code,
      });
    }

    return result;
  }

  async updateWorkOrder(id: string, dto: UpdateMaintenanceWorkOrderDto) {
    const existing = await this.prisma.maintenanceWorkOrder.findUnique({
      where: { id },
      include: { mold: true },
    });
    if (!existing) {
      throw new NotFoundException(`Maintenance work order with ID "${id}" not found`);
    }

    const isCompleting = dto.status === 'COMPLETED' && existing.status !== 'COMPLETED';

    const updated = await this.prisma.maintenanceWorkOrder.update({
      where: { id },
      data: {
        status: dto.status ?? existing.status,
        assignedTechId: dto.assignedTechId !== undefined ? dto.assignedTechId : existing.assignedTechId,
        checklistPayload: dto.checklistPayload !== undefined ? dto.checklistPayload : existing.checklistPayload,
        completedAt: isCompleting ? new Date() : existing.completedAt,
      },
      include: {
        mold: true,
        machine: true,
        assignedTech: { select: { id: true, username: true } },
      },
    });

    // If completing a PM shot order, reset lastServicedShot on mold schedules
    if (isCompleting && existing.moldId && existing.workType === 'PREVENTIVE_SHOT' && existing.mold) {
      await this.prisma.moldPmSchedule.updateMany({
        where: { moldId: existing.moldId, isActive: true },
        data: { lastServicedShot: existing.mold.totalShots },
      });
      this.logger.log(
        `Reset lastServicedShot for Mold "${existing.mold.code}" to current shots: ${existing.mold.totalShots.toString()}`,
      );
    }

    return {
      ...updated,
      triggerShots: updated.triggerShots ? updated.triggerShots.toString() : null,
    };
  }

  /**
   * Hook called when mold strokes increment to check preventive maintenance intervals.
   */
  async checkMoldPmThreshold(moldId: string, currentTotalShots: bigint) {
    const schedules = await this.prisma.moldPmSchedule.findMany({
      where: { moldId, isActive: true },
    });

    for (const schedule of schedules) {
      const shotsDelta = currentTotalShots - schedule.lastServicedShot;
      if (shotsDelta >= schedule.intervalShots) {
        // Check if an open/in-progress work order already exists
        const existingOpenWo = await this.prisma.maintenanceWorkOrder.findFirst({
          where: {
            moldId,
            workType: 'PREVENTIVE_SHOT',
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
        });

        if (!existingOpenWo) {
          const orderNumber = `WO-PM-${moldId.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
          const createdWo = await this.prisma.maintenanceWorkOrder.create({
            data: {
              orderNumber,
              moldId,
              workType: 'PREVENTIVE_SHOT',
              status: 'OPEN',
              triggerShots: currentTotalShots,
              checklistPayload: JSON.stringify({
                pmLevel: schedule.pmLevel,
                intervalShots: schedule.intervalShots.toString(),
                shotsAtTrigger: currentTotalShots.toString(),
                reason: `Threshold of ${schedule.intervalShots.toString()} shots reached`,
              }),
            },
            include: {
              mold: true,
              machine: true,
            },
          });
          this.logger.warn(
            `Auto-generated PM Work Order "${orderNumber}" for Mold "${moldId}" at ${currentTotalShots.toString()} shots.`,
          );

          if (this.gateway) {
            this.gateway.broadcastMaintenanceEvent('maintenance:work_order_created', {
              workOrder: {
                ...createdWo,
                triggerShots: currentTotalShots.toString(),
              },
              moldId,
              moldCode: createdWo.mold?.code,
              reason: `Threshold of ${schedule.intervalShots.toString()} shots reached`,
            });
          }
        }
      }
    }
  }
}
