import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class AreasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(plantId?: string) {
    return this.prisma.productionArea.findMany({
      where: plantId ? { plantId } : undefined,
      include: {
        plant: {
          select: { code: true, name: true },
        },
        _count: {
          select: { machines: true },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const area = await this.prisma.productionArea.findUnique({
      where: { id },
      include: {
        plant: true,
        machines: {
          include: {
            currentState: true,
          },
        },
      },
    });

    if (!area) {
      throw new NotFoundException(`Production area with ID "${id}" not found`);
    }

    return area;
  }
}
