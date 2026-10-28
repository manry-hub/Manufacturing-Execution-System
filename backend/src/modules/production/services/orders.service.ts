import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { CreateProductionOrderDto } from '../dto/create-production-order.dto.js';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductionOrderDto) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${dto.productId}" not found`);
    }

    // Check unique orderNumber
    const existing = await this.prisma.productionOrder.findUnique({
      where: { orderNumber: dto.orderNumber },
    });

    if (existing) {
      throw new BadRequestException(`Order number "${dto.orderNumber}" already exists`);
    }

    return this.prisma.productionOrder.create({
      data: {
        orderNumber: dto.orderNumber,
        productId: dto.productId,
        targetQuantity: dto.targetQuantity,
        status: 'DRAFT',
        plannedStartTime: new Date(dto.plannedStartTime),
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
  }

  async findAll(params?: { status?: string; productId?: string }) {
    return this.prisma.productionOrder.findMany({
      where: {
        status: params?.status,
        productId: params?.productId,
      },
      include: {
        product: true,
        operationSteps: {
          orderBy: { sequence: 'asc' },
        },
        runs: {
          include: {
            machine: { select: { id: true, code: true, name: true } },
            mold: { select: { id: true, code: true, name: true, cavityCount: true } },
          },
        },
      },
      orderBy: { plannedStartTime: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            compatibilities: {
              include: { mold: true },
            },
          },
        },
        runs: {
          include: {
            machine: true,
            mold: true,
          },
        },
        operationSteps: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Production order with ID "${id}" not found`);
    }

    return order;
  }

  async findOrderSteps(orderId: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id: orderId },
      include: {
        operationSteps: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Production order with ID "${orderId}" not found`);
    }

    return order.operationSteps;
  }

  async updateStepProgress(
    orderId: string,
    stepId: string,
    data: {
      status?: string;
      quantityIn?: number;
      quantityPassed?: number;
      quantityScrapped?: number;
    },
  ) {
    const step = await this.prisma.orderOperationStep.findFirst({
      where: {
        id: stepId,
        productionOrderId: orderId,
      },
    });

    if (!step) {
      throw new NotFoundException(`Operation step "${stepId}" not found for order "${orderId}"`);
    }

    const isStarting = data.status === 'IN_PROGRESS' && step.status === 'PENDING';
    const isCompleting = data.status === 'COMPLETED' && step.status !== 'COMPLETED';

    return this.prisma.orderOperationStep.update({
      where: { id: stepId },
      data: {
        status: data.status ?? step.status,
        quantityIn: data.quantityIn !== undefined ? data.quantityIn : step.quantityIn,
        quantityPassed: data.quantityPassed !== undefined ? data.quantityPassed : step.quantityPassed,
        quantityScrapped: data.quantityScrapped !== undefined ? data.quantityScrapped : step.quantityScrapped,
        startedAt: isStarting ? new Date() : step.startedAt,
        completedAt: isCompleting ? new Date() : step.completedAt,
      },
    });
  }

  async release(id: string) {
    const order = await this.findOne(id);

    if (order.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot release order in "${order.status}" status`);
    }

    return this.prisma.productionOrder.update({
      where: { id },
      data: { status: 'RELEASED' },
      include: { product: true },
    });
  }

  async cancel(id: string) {
    const order = await this.findOne(id);

    if (order.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel an already completed order');
    }

    return this.prisma.productionOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
