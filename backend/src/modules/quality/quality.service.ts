import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateInspectionPlanDto } from './dto/create-inspection-plan.dto.js';
import { RecordQualityCheckDto } from './dto/record-quality-check.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class QualityService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlan(dto: CreateInspectionPlanDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${dto.productId}" not found`);
    }

    return this.prisma.inspectionPlan.create({
      data: {
        productId: dto.productId,
        name: dto.name,
        version: dto.version ?? 1,
        isActive: dto.isActive ?? true,
        items: {
          create: dto.items.map((item) => ({
            sequence: item.sequence,
            parameterName: item.parameterName,
            measurementType: item.measurementType,
            targetValue: item.targetValue !== undefined ? new Prisma.Decimal(item.targetValue) : null,
            upperTolerance: item.upperTolerance !== undefined ? new Prisma.Decimal(item.upperTolerance) : null,
            lowerTolerance: item.lowerTolerance !== undefined ? new Prisma.Decimal(item.lowerTolerance) : null,
            inspectionStage: item.inspectionStage ?? 'PATROL',
          })),
        },
      },
      include: {
        items: {
          orderBy: { sequence: 'asc' },
        },
        product: true,
      },
    });
  }

  async findAllPlans(productId?: string) {
    return this.prisma.inspectionPlan.findMany({
      where: {
        productId: productId || undefined,
      },
      include: {
        product: true,
        items: {
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPlanById(id: string) {
    const plan = await this.prisma.inspectionPlan.findUnique({
      where: { id },
      include: {
        product: true,
        items: {
          orderBy: { sequence: 'asc' },
        },
      },
    });
    if (!plan) {
      throw new NotFoundException(`Inspection plan with ID "${id}" not found`);
    }
    return plan;
  }

  async findActivePlanForProduct(productId: string) {
    return this.prisma.inspectionPlan.findFirst({
      where: {
        productId,
        isActive: true,
      },
      include: {
        items: {
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { version: 'desc' },
    });
  }

  async recordQualityCheck(dto: RecordQualityCheckDto, inspectorId: string) {
    const run = await this.prisma.productionRun.findUnique({
      where: { id: dto.runId },
      include: {
        productionOrder: true,
      },
    });
    if (!run) {
      throw new NotFoundException(`Production run with ID "${dto.runId}" not found`);
    }

    // Verify all plan items exist
    const planItemIds = dto.samples.map((s) => s.planItemId);
    const planItems = await this.prisma.inspectionPlanItem.findMany({
      where: { id: { in: planItemIds } },
    });

    if (planItems.length !== planItemIds.length) {
      throw new BadRequestException('One or more inspection plan item IDs are invalid');
    }

    const planItemMap = new Map(planItems.map((item) => [item.id, item]));

    // Evaluate samples
    let allPassed = true;
    const evaluatedSamples = dto.samples.map((s) => {
      const planItem = planItemMap.get(s.planItemId)!;
      let samplePassed = s.isPassed ?? true;

      if (planItem.measurementType === 'VARIABLE') {
        if (s.measuredValue === undefined || s.measuredValue === null) {
          throw new BadRequestException(
            `Measured value is required for variable parameter "${planItem.parameterName}"`,
          );
        }

        const measured = new Prisma.Decimal(s.measuredValue);
        let withinTol = true;
        if (planItem.lowerTolerance !== null && measured.lessThan(planItem.lowerTolerance)) {
          withinTol = false;
        }
        if (planItem.upperTolerance !== null && measured.greaterThan(planItem.upperTolerance)) {
          withinTol = false;
        }
        samplePassed = withinTol;
      }

      if (!samplePassed) {
        allPassed = false;
      }

      return {
        planItemId: s.planItemId,
        measuredValue: s.measuredValue !== undefined ? new Prisma.Decimal(s.measuredValue) : null,
        isPassed: samplePassed,
      };
    });

    // Auto disposition if not provided
    const disposition = dto.disposition ?? (allPassed ? 'RELEASED' : 'QUARANTINE');

    return this.prisma.qualityCheck.create({
      data: {
        runId: dto.runId,
        inspectorId,
        checkType: dto.checkType,
        disposition,
        notes: dto.notes ?? null,
        samples: {
          create: evaluatedSamples,
        },
      },
      include: {
        samples: {
          include: {
            planItem: true,
          },
        },
        inspector: { select: { id: true, username: true, email: true } },
      },
    });
  }

  async getRunChecks(runId: string) {
    return this.prisma.qualityCheck.findMany({
      where: { runId },
      include: {
        samples: {
          include: { planItem: true },
        },
        inspector: { select: { id: true, username: true } },
      },
      orderBy: { checkedAt: 'desc' },
    });
  }

  async checkFirstPieceReleaseStatus(runId: string) {
    const releasedFirstPiece = await this.prisma.qualityCheck.findFirst({
      where: {
        runId,
        checkType: 'FIRST_PIECE',
        disposition: 'RELEASED',
      },
      include: {
        inspector: { select: { id: true, username: true } },
      },
    });

    return {
      runId,
      isReleased: !!releasedFirstPiece,
      firstPieceCheck: releasedFirstPiece ?? null,
    };
  }
}
