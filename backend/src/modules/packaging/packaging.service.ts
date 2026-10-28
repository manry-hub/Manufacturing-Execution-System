import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreatePackagingUnitDto } from './dto/create-packaging-unit.dto.js';
import { TelemetryGateway } from '../telemetry/telemetry.gateway.js';

@Injectable()
export class PackagingService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly gateway?: TelemetryGateway,
  ) {}

  async createPackagingUnit(dto: CreatePackagingUnitDto, packagerId: string) {
    const run = await this.prisma.productionRun.findUnique({
      where: { id: dto.runId },
      include: { productionOrder: true },
    });

    if (!run) {
      throw new NotFoundException(`Production run with ID "${dto.runId}" not found`);
    }

    const barcode = dto.barcode?.trim()
      ? dto.barcode.trim()
      : `PKG-${run.productionOrder.orderNumber.replace(/[^a-zA-Z0-9]/g, '').slice(-6)}-${Date.now().toString(36).toUpperCase()}`;

    const existingBarcode = await this.prisma.packagingUnit.findUnique({
      where: { barcode },
    });
    if (existingBarcode) {
      throw new BadRequestException(`Packaging barcode "${barcode}" already exists`);
    }

    const unit = await this.prisma.$transaction(async (tx) => {
      // 1. Create packaging unit
      const created = await tx.packagingUnit.create({
        data: {
          runId: dto.runId,
          barcode,
          partCount: dto.partCount,
          packagerId,
          palletId: dto.palletId ?? null,
        },
        include: {
          packager: { select: { id: true, username: true } },
          run: {
            select: {
              id: true,
              productionOrderId: true,
            },
          },
        },
      });

      // 2. Increment packedQuantity on ProductionOrder
      await tx.productionOrder.update({
        where: { id: run.productionOrderId },
        data: {
          packedQuantity: { increment: dto.partCount },
        },
      });

      // 3. Update OrderOperationStep for PACKAGING if present
      const packagingStep = await tx.orderOperationStep.findFirst({
        where: {
          productionOrderId: run.productionOrderId,
          operationName: 'PACKAGING',
        },
      });

      if (packagingStep) {
        await tx.orderOperationStep.update({
          where: { id: packagingStep.id },
          data: {
            quantityPassed: { increment: dto.partCount },
            status: 'IN_PROGRESS',
          },
        });
      }

      return created;
    });

    // Broadcast live packaging events to subscribers
    if (this.gateway) {
      this.gateway.broadcastPackagingEvent('packaging:unit_created', {
        runId: dto.runId,
        unit,
        orderNumber: run.productionOrder.orderNumber,
      });

      try {
        const reconciliation = await this.reconcileRun(dto.runId);
        this.gateway.broadcastPackagingEvent('packaging:reconciled', reconciliation);
      } catch {
        // non-fatal reconciliation calculation catch
      }
    }

    return unit;
  }

  async findAllUnits(runId?: string, palletId?: string) {
    return this.prisma.packagingUnit.findMany({
      where: {
        runId: runId || undefined,
        palletId: palletId || undefined,
      },
      include: {
        packager: { select: { id: true, username: true } },
        run: {
          include: {
            productionOrder: { include: { product: true } },
            machine: true,
          },
        },
      },
      orderBy: { packedAt: 'desc' },
    });
  }

  async reconcileRun(runId: string) {
    const run = await this.prisma.productionRun.findUnique({
      where: { id: runId },
      include: {
        productionOrder: { include: { product: true } },
        machine: true,
        mold: true,
        packagingUnits: true,
      },
    });

    if (!run) {
      throw new NotFoundException(`Production run with ID "${runId}" not found`);
    }

    const totalPacked = run.packagingUnits.reduce((acc, u) => acc + u.partCount, 0);
    const variance = run.goodQuantity - totalPacked;
    const target = run.productionOrder.targetQuantity;
    const completionPercentage = target > 0 ? (totalPacked / target) * 100 : 0;

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
      targetQuantity: target,
      producedGoodQuantity: run.goodQuantity,
      scrappedQuantity: run.rejectQuantity,
      packedQuantity: totalPacked,
      varianceUnpacked: variance,
      completionPercentage: Math.round(completionPercentage * 100) / 100,
      isFullyPacked: totalPacked >= run.goodQuantity && run.goodQuantity > 0,
      packagingUnitsCount: run.packagingUnits.length,
      packagingUnits: run.packagingUnits.map((u) => ({
        id: u.id,
        barcode: u.barcode,
        partCount: u.partCount,
        palletId: u.palletId,
        packedAt: u.packedAt,
      })),
    };
  }
}
