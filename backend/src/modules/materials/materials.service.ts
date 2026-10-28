import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateMaterialDto } from './dto/create-material.dto.js';
import { CreateMaterialLotDto } from './dto/create-material-lot.dto.js';
import { LoadHopperDto } from './dto/load-hopper.dto.js';
import { Prisma } from '@prisma/client';
import { TelemetryGateway } from '../telemetry/telemetry.gateway.js';

@Injectable()
export class MaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly gateway?: TelemetryGateway,
  ) {}

  async createMaterial(dto: CreateMaterialDto) {
    const existing = await this.prisma.material.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(`Material with code "${dto.code}" already exists`);
    }

    return this.prisma.material.create({
      data: {
        code: dto.code,
        name: dto.name,
        category: dto.category,
        densityGcm3: dto.densityGcm3 !== undefined ? new Prisma.Decimal(dto.densityGcm3) : null,
      },
    });
  }

  async findAllMaterials() {
    return this.prisma.material.findMany({
      include: {
        _count: {
          select: { lots: true },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findOneMaterial(id: string) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: {
        lots: {
          orderBy: { receivedAt: 'desc' },
        },
      },
    });
    if (!material) {
      throw new NotFoundException(`Material with ID "${id}" not found`);
    }
    return material;
  }

  async createLot(dto: CreateMaterialLotDto) {
    const material = await this.prisma.material.findUnique({
      where: { id: dto.materialId },
    });
    if (!material) {
      throw new NotFoundException(`Material with ID "${dto.materialId}" not found`);
    }

    const existing = await this.prisma.materialLot.findUnique({
      where: { lotNumber: dto.lotNumber },
    });
    if (existing) {
      throw new BadRequestException(`Material lot "${dto.lotNumber}" already exists`);
    }

    return this.prisma.materialLot.create({
      data: {
        materialId: dto.materialId,
        lotNumber: dto.lotNumber,
        supplierLot: dto.supplierLot ?? null,
        initialQtyKg: new Prisma.Decimal(dto.initialQtyKg),
        remainingQtyKg: new Prisma.Decimal(dto.initialQtyKg),
        status: 'AVAILABLE',
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : null,
      },
      include: { material: true },
    });
  }

  async findAllLots(materialId?: string, status?: string) {
    return this.prisma.materialLot.findMany({
      where: {
        materialId: materialId || undefined,
        status: status || undefined,
      },
      include: {
        material: true,
      },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async findLotByNumber(lotNumber: string) {
    const lot = await this.prisma.materialLot.findUnique({
      where: { lotNumber },
      include: {
        material: true,
        consumptions: {
          include: {
            run: {
              include: {
                productionOrder: { include: { product: true } },
                machine: true,
              },
            },
            loadedBy: { select: { id: true, username: true, email: true } },
          },
          orderBy: { loadedAt: 'desc' },
        },
      },
    });

    if (!lot) {
      throw new NotFoundException(`Material lot "${lotNumber}" not found`);
    }
    return lot;
  }

  async loadHopper(dto: LoadHopperDto, userId: string) {
    const run = await this.prisma.productionRun.findUnique({
      where: { id: dto.runId },
    });
    if (!run) {
      throw new NotFoundException(`Production run with ID "${dto.runId}" not found`);
    }

    const lot = await this.prisma.materialLot.findUnique({
      where: { id: dto.materialLotId },
    });
    if (!lot) {
      throw new NotFoundException(`Material lot with ID "${dto.materialLotId}" not found`);
    }

    if (lot.status !== 'AVAILABLE') {
      throw new BadRequestException(`Material lot "${lot.lotNumber}" is in "${lot.status}" state and cannot be loaded`);
    }

    const loadQty = new Prisma.Decimal(dto.quantityKg);
    if (lot.remainingQtyKg.lessThan(loadQty)) {
      throw new BadRequestException(
        `Insufficient quantity in lot "${lot.lotNumber}". Available: ${lot.remainingQtyKg.toString()} kg, requested: ${loadQty.toString()} kg`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const consumption = await tx.runMaterialConsumption.create({
        data: {
          runId: dto.runId,
          materialLotId: dto.materialLotId,
          loadedById: userId,
          quantityKg: loadQty,
        },
        include: {
          materialLot: { include: { material: true } },
          loadedBy: { select: { id: true, username: true } },
        },
      });

      const newRemaining = lot.remainingQtyKg.minus(loadQty);
      const newStatus = newRemaining.equals(0) ? 'CONSUMED' : 'AVAILABLE';

      await tx.materialLot.update({
        where: { id: dto.materialLotId },
        data: {
          remainingQtyKg: newRemaining,
          status: newStatus,
        },
      });

      if (this.gateway) {
        this.gateway.broadcastMaterialsEvent('materials:hopper_loaded', {
          runId: dto.runId,
          machineId: run.machineId,
          materialLotId: dto.materialLotId,
          lotNumber: lot.lotNumber,
          quantityKg: Number(dto.quantityKg),
          remainingLotQtyKg: newRemaining.toNumber(),
        });

        this.gateway.broadcastMaterialsEvent('materials:lot_stock_updated', {
          lotId: dto.materialLotId,
          lotNumber: lot.lotNumber,
          remainingQtyKg: newRemaining.toNumber(),
          status: newStatus,
        });
      }

      return consumption;
    });
  }

  async getRunGenealogy(runId: string) {
    const run = await this.prisma.productionRun.findUnique({
      where: { id: runId },
      include: {
        productionOrder: { include: { product: true } },
        machine: true,
        mold: true,
        consumptions: {
          include: {
            materialLot: {
              include: {
                material: true,
              },
            },
            loadedBy: { select: { id: true, username: true, email: true } },
          },
          orderBy: { loadedAt: 'asc' },
        },
        packagingUnits: {
          include: {
            packager: { select: { id: true, username: true } },
          },
        },
      },
    });

    if (!run) {
      throw new NotFoundException(`Production run with ID "${runId}" not found`);
    }

    return {
      runId: run.id,
      orderNumber: run.productionOrder.orderNumber,
      product: {
        partNumber: run.productionOrder.product.partNumber,
        name: run.productionOrder.product.name,
      },
      machine: {
        code: run.machine.code,
        name: run.machine.name,
      },
      mold: {
        code: run.mold.code,
        cavities: run.mold.cavityCount,
      },
      runStatus: run.status,
      totalShots: run.totalShots,
      goodQuantity: run.goodQuantity,
      rejectQuantity: run.rejectQuantity,
      rawMaterialsConsumed: run.consumptions.map((c) => ({
        consumptionId: c.id,
        materialCode: c.materialLot.material.code,
        materialName: c.materialLot.material.name,
        category: c.materialLot.material.category,
        lotNumber: c.materialLot.lotNumber,
        supplierLot: c.materialLot.supplierLot,
        quantityKg: c.quantityKg.toNumber(),
        loadedAt: c.loadedAt,
        loadedBy: c.loadedBy.username,
      })),
      packagingUnits: run.packagingUnits.map((p) => ({
        barcode: p.barcode,
        partCount: p.partCount,
        palletId: p.palletId,
        packedAt: p.packedAt,
        packager: p.packager.username,
      })),
    };
  }

  async getLotGenealogy(lotNumber: string) {
    const lot = await this.findLotByNumber(lotNumber);

    return {
      lotNumber: lot.lotNumber,
      supplierLot: lot.supplierLot,
      status: lot.status,
      initialQtyKg: lot.initialQtyKg.toNumber(),
      remainingQtyKg: lot.remainingQtyKg.toNumber(),
      material: {
        code: lot.material.code,
        name: lot.material.name,
        category: lot.material.category,
      },
      producedRuns: lot.consumptions.map((c) => ({
        runId: c.run.id,
        orderNumber: c.run.productionOrder.orderNumber,
        partNumber: c.run.productionOrder.product.partNumber,
        productName: c.run.productionOrder.product.name,
        machineCode: c.run.machine.code,
        quantityConsumedKg: c.quantityKg.toNumber(),
        consumedAt: c.loadedAt,
        runStatus: c.run.status,
        producedGoodQty: c.run.goodQuantity,
      })),
    };
  }
}
