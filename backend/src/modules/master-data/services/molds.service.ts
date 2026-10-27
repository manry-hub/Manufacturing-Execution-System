import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class MoldsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const molds = await this.prisma.mold.findMany({
      include: {
        compatibilities: {
          include: {
            product: {
              select: {
                id: true,
                partNumber: true,
                name: true,
                standardCycleTime: true,
              },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return molds.map((mold) => ({
      ...mold,
      totalShots: Number(mold.totalShots),
    }));
  }

  async findOne(id: string) {
    const mold = await this.prisma.mold.findUnique({
      where: { id },
      include: {
        compatibilities: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!mold) {
      throw new NotFoundException(`Mold with ID "${id}" not found`);
    }

    return {
      ...mold,
      totalShots: Number(mold.totalShots),
    };
  }
}
