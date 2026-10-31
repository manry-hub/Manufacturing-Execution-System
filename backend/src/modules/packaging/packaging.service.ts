import { BadRequestException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import crypto from 'node:crypto';
import { PrismaService } from '../../database/prisma.service.js';
import { CreatePackagingUnitDto } from './dto/create-packaging-unit.dto.js';
import { TelemetryGateway } from '../telemetry/telemetry.gateway.js';

@Injectable()
export class PackagingService {
  private readonly logger = new Logger(PackagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly gateway?: TelemetryGateway,
  ) {}

  async createPackagingUnit(dto: CreatePackagingUnitDto, packagerId: string) {
    const run = await this.prisma.productionRun.findUnique({
      where: { id: dto.runId },
      include: {
        productionOrder: {
          include: { product: true },
        },
        machine: true,
        mold: true,
      },
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

    // Dispatch outbound signed HTTP webhook to WMS finished goods intake
    try {
      await this.dispatchWmsWebhook({
        cartonBarcode: unit.barcode,
        orderNumber: run.productionOrder.orderNumber,
        partNumber: (run.productionOrder as any).product?.partNumber ?? 'UNKNOWN',
        quantityPacked: unit.partCount,
        unitOfMeasure: 'PCS',
        machineId: (run as any).machine?.code,
        moldCode: (run as any).mold?.code,
      });
    } catch (webhookErr) {
      this.logger.warn(`Failed to dispatch WMS webhook for unit ${unit.barcode}: ${(webhookErr as Error).message}`);
    }

    return unit;
  }

  /**
   * Dispatches signed HMAC SHA-256 packaging webhook event to WMS
   */
  async dispatchWmsWebhook(data: {
    cartonBarcode: string;
    orderNumber: string;
    partNumber: string;
    quantityPacked: number;
    unitOfMeasure?: string;
    machineId?: string;
    moldCode?: string;
  }): Promise<boolean> {
    const webhookUrl = process.env.WMS_WEBHOOK_URL || 'http://localhost:8000/api/v1/webhooks/mes';
    const webhookSecret = process.env.WMS_WEBHOOK_SECRET || 'test-mes-secret-key';

    const eventId = `EVT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const payload = {
      eventId,
      eventType: 'packaging.unit_created',
      timestamp: new Date().toISOString(),
      data: {
        cartonBarcode: data.cartonBarcode,
        orderNumber: data.orderNumber,
        partNumber: data.partNumber,
        quantityPacked: data.quantityPacked,
        unitOfMeasure: data.unitOfMeasure ?? 'PCS',
        machineId: data.machineId,
        moldCode: data.moldCode,
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MES-Signature': signature,
          'X-MES-Event-Id': eventId,
        },
        body: rawBody,
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.warn(`WMS webhook rejected with status ${response.status}: ${await response.text().catch(() => '')}`);
        return false;
      }

      this.logger.log(`WMS webhook delivered successfully for carton ${data.cartonBarcode} (eventId: ${eventId})`);
      return true;
    } catch (err) {
      this.logger.warn(`WMS webhook delivery error: ${(err as Error).message}`);
      return false;
    }
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

  async findUnitByBarcode(barcode: string) {
    const unit = await this.prisma.packagingUnit.findUnique({
      where: { barcode },
      include: {
        packager: { select: { id: true, username: true } },
        run: {
          include: {
            productionOrder: { include: { product: true } },
            machine: true,
            mold: true,
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException(`Packaging unit with barcode "${barcode}" not found`);
    }

    return unit;
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

    // Shot-to-pack expected good output vs actual molded
    const cavityCount = run.mold?.cavityCount ?? 1;
    const expectedFromShots = Math.max(0, run.totalShots * cavityCount - run.rejectQuantity);

    // Tolerance discrepancy calculation (2% threshold)
    const baseQuantity = run.goodQuantity > 0 ? run.goodQuantity : target;
    const toleranceMargin = Math.max(1, Math.round(baseQuantity * 0.02));
    const isWithinTolerance = Math.abs(variance) <= toleranceMargin;

    let discrepancyStatus: 'BALANCED' | 'DEFICIT' | 'SURPLUS' = 'BALANCED';
    if (!isWithinTolerance && (run.goodQuantity > 0 || totalPacked > 0)) {
      discrepancyStatus = totalPacked < run.goodQuantity ? 'DEFICIT' : 'SURPLUS';
    }

    const variancePercentage =
      run.goodQuantity > 0
        ? Math.round(((run.goodQuantity - totalPacked) / run.goodQuantity) * 10000) / 100
        : 0;

    // Pallet Aggregation Summary
    const palletsMap = new Map<string, { palletId: string; cartonCount: number; totalParts: number }>();
    for (const u of run.packagingUnits) {
      const pid = u.palletId?.trim() || 'UNASSIGNED';
      const existing = palletsMap.get(pid) ?? { palletId: pid, cartonCount: 0, totalParts: 0 };
      existing.cartonCount += 1;
      existing.totalParts += u.partCount;
      palletsMap.set(pid, existing);
    }
    const pallets = Array.from(palletsMap.values());

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
      totalShots: run.totalShots,
      expectedFromShots,
      producedGoodQuantity: run.goodQuantity,
      scrappedQuantity: run.rejectQuantity,
      packedQuantity: totalPacked,
      varianceUnpacked: variance,
      variancePercentage,
      discrepancyStatus,
      discrepancyAlert: !isWithinTolerance && (run.goodQuantity > 0 || totalPacked > 0),
      toleranceMargin,
      completionPercentage: Math.round(completionPercentage * 100) / 100,
      isFullyPacked: totalPacked >= run.goodQuantity && run.goodQuantity > 0,
      packagingUnitsCount: run.packagingUnits.length,
      pallets,
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
