import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class MachinesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(areaId?: string) {
    return this.prisma.machine.findMany({
      where: areaId ? { areaId } : undefined,
      include: {
        area: {
          select: {
            id: true,
            code: true,
            name: true,
            plant: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        currentState: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        area: {
          include: {
            plant: true,
          },
        },
        currentState: true,
        productionRuns: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            productionOrder: {
              include: {
                product: true,
              },
            },
            mold: true,
          },
          take: 1,
        },
      },
    });

    if (!machine) {
      throw new NotFoundException(`Machine with ID "${id}" not found`);
    }

    return machine;
  }

  async findByCode(code: string) {
    const machine = await this.prisma.machine.findUnique({
      where: { code },
      include: {
        area: true,
        currentState: true,
      },
    });

    if (!machine) {
      throw new NotFoundException(`Machine with code "${code}" not found`);
    }

    return machine;
  }
}
