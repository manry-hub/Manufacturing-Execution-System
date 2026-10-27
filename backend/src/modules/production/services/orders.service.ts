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
      },
      include: {
        product: true,
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
      },
    });

    if (!order) {
      throw new NotFoundException(`Production order with ID "${id}" not found`);
    }

    return order;
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
