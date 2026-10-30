import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class PlantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.plant.findMany({
      include: {
        _count: {
          select: { productionAreas: true },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const plant = await this.prisma.plant.findUnique({
      where: { id },
      include: {
        productionAreas: {
          include: {
            _count: {
              select: { machines: true },
            },
          },
        },
      },
    });

    if (!plant) {
      throw new NotFoundException(`Plant with ID "${id}" not found`);
    }

    return plant;
  }

  async create(data: { code: string; name: string; timezone?: string }) {
    return this.prisma.plant.create({
      data: {
        code: data.code,
        name: data.name,
        timezone: data.timezone ?? 'UTC',
      },
    });
  }
}
