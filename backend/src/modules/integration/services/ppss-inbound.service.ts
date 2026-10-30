import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import type { InboundProductionOrderDto } from '../dto/inbound-production-order.dto.js';
import type { UpdateInboundOrderDto } from '../dto/update-inbound-order.dto.js';
import { TelemetryGateway } from '../../telemetry/telemetry.gateway.js';

@Injectable()
export class PpssInboundService {
  private readonly logger = new Logger(PpssInboundService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly gateway?: TelemetryGateway,
  ) {}

  /**
   * Ingests a new planned production order from PPSS into MES Backlog.
   */
  async ingestOrder(dto: InboundProductionOrderDto) {
    // 1. Verify product exists by partNumber
    const product = await this.prisma.product.findUnique({
      where: { partNumber: dto.productPartNumber },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with part number "${dto.productPartNumber}" not found in MES catalog`,
      );
    }

    // 2. Check for duplicate externalOrderRef
    const existingRef = await this.prisma.productionOrder.findUnique({
      where: { externalOrderRef: dto.externalOrderRef },
    });

    if (existingRef) {
      throw new BadRequestException(
        `Order with external reference "${dto.externalOrderRef}" already exists (Order: ${existingRef.orderNumber})`,
      );
    }

    // 3. Check for duplicate orderNumber
    const existingNumber = await this.prisma.productionOrder.findUnique({
      where: { orderNumber: dto.orderNumber },
    });

    if (existingNumber) {
      throw new BadRequestException(
        `Production order number "${dto.orderNumber}" already exists in MES`,
      );
    }

    const plannedStart = dto.plannedStartTime ? new Date(dto.plannedStartTime) : new Date();
    const dueDate = new Date(dto.dueDate);

    // 4. Create ProductionOrder in DRAFT backlog state with default 3-stage operation steps
    const order = await this.prisma.productionOrder.create({
      data: {
        orderNumber: dto.orderNumber,
        externalOrderRef: dto.externalOrderRef,
        productId: product.id,
        targetQuantity: dto.targetQuantity,
        status: 'DRAFT',
        plannedStartTime: plannedStart,
        dueDate,
        priority: dto.priority ?? 3,
        suggestedMachineCode: dto.suggestedMachineCode,
        externalSyncStatus: 'SYNCED_FROM_PPSS',
        schedulingNotes: dto.notes,
        operationSteps: {
          create: [
            {
              sequence: 1,
              operationName: 'MOLDING',
              stationType: 'INJECTION_MACHINE',
              status: 'PENDING',
              quantityIn: dto.targetQuantity,
            },
            {
              sequence: 2,
              operationName: 'SECONDARY_FINISHING',
              stationType: 'MANUAL_WORKBENCH',
              status: 'PENDING',
              quantityIn: 0,
            },
            {
              sequence: 3,
              operationName: 'PACKAGING',
              stationType: 'PACKAGING_STATION',
              status: 'PENDING',
              quantityIn: 0,
            },
          ],
        },
      },
      include: {
        product: true,
        operationSteps: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    this.logger.log(
      `Ingested order from PPSS: ${order.orderNumber} (Ref: ${dto.externalOrderRef}, Part: ${dto.productPartNumber}, Qty: ${dto.targetQuantity})`,
    );

    if (this.gateway) {
      this.gateway.broadcastSchedulingEvent('scheduling:timeline_updated', {
        action: 'INBOUND_ORDER_INGESTED',
        orderId: order.id,
      });
    }

    return order;
  }

  /**
   * Updates an existing inbound order if it has not yet transitioned to execution.
   */
  async updateOrder(externalRef: string, dto: UpdateInboundOrderDto) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { externalOrderRef: externalRef },
    });

    if (!order) {
      throw new NotFoundException(
        `Production order with external reference "${externalRef}" not found`,
      );
    }

    // Dual-Authority Immutability Guard: Do not allow PPSS to mutate active or completed runs
    if (
      order.status === 'RELEASED' ||
      order.status === 'IN_PROGRESS' ||
      order.status === 'COMPLETED'
    ) {
      throw new BadRequestException(
        `Cannot mutate order "${order.orderNumber}" because it is already in "${order.status}" status on the shop floor. Modifications must be coordinated through the MES supervisor.`,
      );
    }

    const updated = await this.prisma.productionOrder.update({
      where: { externalOrderRef: externalRef },
      data: {
        targetQuantity: dto.targetQuantity ?? order.targetQuantity,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : order.dueDate,
        plannedStartTime: dto.plannedStartTime
          ? new Date(dto.plannedStartTime)
          : order.plannedStartTime,
        priority: dto.priority ?? order.priority,
        suggestedMachineCode: dto.suggestedMachineCode ?? order.suggestedMachineCode,
        schedulingNotes: dto.notes ?? order.schedulingNotes,
      },
      include: {
        product: true,
      },
    });

    // If target quantity changed, update step 1 quantityIn
    if (dto.targetQuantity && dto.targetQuantity !== order.targetQuantity) {
      const step1 = await this.prisma.orderOperationStep.findFirst({
        where: { productionOrderId: order.id, sequence: 1 },
      });
      if (step1) {
        await this.prisma.orderOperationStep.update({
          where: { id: step1.id },
          data: { quantityIn: dto.targetQuantity },
        });
      }
    }

    this.logger.log(
      `Updated order from PPSS: ${order.orderNumber} (Ref: ${externalRef})`,
    );

    if (this.gateway) {
      this.gateway.broadcastSchedulingEvent('scheduling:timeline_updated', {
        action: 'INBOUND_ORDER_UPDATED',
        orderId: order.id,
      });
    }

    return updated;
  }

  /**
   * Cancels an order requested by PPSS if not yet active on the machine.
   */
  async cancelOrder(externalRef: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { externalOrderRef: externalRef },
    });

    if (!order) {
      throw new NotFoundException(
        `Production order with external reference "${externalRef}" not found`,
      );
    }

    if (order.status === 'IN_PROGRESS' || order.status === 'COMPLETED') {
      throw new BadRequestException(
        `Cannot cancel order "${order.orderNumber}" because it is already "${order.status}" in production.`,
      );
    }

    const cancelled = await this.prisma.productionOrder.update({
      where: { externalOrderRef: externalRef },
      data: {
        status: 'CANCELLED',
        assignedMachineId: null,
        assignedMoldId: null,
      },
    });

    this.logger.log(`Cancelled order from PPSS: ${order.orderNumber} (Ref: ${externalRef})`);

    if (this.gateway) {
      this.gateway.broadcastSchedulingEvent('scheduling:timeline_updated', {
        action: 'INBOUND_ORDER_CANCELLED',
        orderId: order.id,
      });
    }

    return cancelled;
  }

  /**
   * Exports factory physical capabilities to PPSS for synchronized planning constraints.
   */
  async getPlantCapabilities() {
    const machines = await this.prisma.machine.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        clampingTonnage: true,
        area: {
          select: {
            code: true,
            name: true,
          },
        },
        currentState: {
          select: {
            normalizedStatus: true,
            connectionStatus: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const molds = await this.prisma.mold.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        cavityCount: true,
        status: true,
        compatibilities: {
          select: {
            productId: true,
            idealCycleTime: true,
            product: {
              select: {
                partNumber: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const changeovers = await this.prisma.moldChangeover.findMany({
      select: {
        fromMold: { select: { code: true } },
        toMold: { select: { code: true } },
        setupMinutes: true,
        purgeMinutes: true,
      },
      orderBy: [{ fromMold: { code: 'asc' } }, { toMold: { code: 'asc' } }],
    });

    return {
      exportedAt: new Date().toISOString(),
      machineCount: machines.length,
      moldCount: molds.length,
      machines,
      molds,
      changeoverMatrix: changeovers,
    };
  }
}
