import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateInspectionPlanDto } from './dto/create-inspection-plan.dto.js';
import { RecordQualityCheckDto } from './dto/record-quality-check.dto.js';
import { Prisma } from '@prisma/client';
import { TelemetryGateway } from '../telemetry/telemetry.gateway.js';

@Injectable()
export class QualityService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly gateway?: TelemetryGateway,
  ) {}

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

    const qualityCheck = await this.prisma.qualityCheck.create({
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

    if (this.gateway) {
      // 1. Broadcast check recorded
      this.gateway.broadcastQualityEvent('quality:check_recorded', {
        runId: dto.runId,
        check: qualityCheck,
        disposition,
      });

      // 2. If first piece check, broadcast status and interlock state
      if (dto.checkType === 'FIRST_PIECE') {
        const fpStatus = await this.checkFirstPieceReleaseStatus(dto.runId);
        this.gateway.broadcastQualityEvent('quality:first_piece_status_changed', fpStatus);

        if (disposition === 'QUARANTINE') {
          this.gateway.broadcastQualityEvent('machine:interlock_state', {
            machineId: run.machineId,
            isInterlocked: true,
            reason: 'First-Piece Inspection Out-of-Tolerance: QUARANTINE',
          });
        } else if (disposition === 'RELEASED') {
          this.gateway.broadcastQualityEvent('machine:interlock_state', {
            machineId: run.machineId,
            isInterlocked: false,
          });
        }
      }
    }

    return qualityCheck;
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

  async calculateCpk(params?: { productId?: string; planItemId?: string; runId?: string }) {
    // 1. Fetch relevant variable plan items
    const planItemsWhere: Prisma.InspectionPlanItemWhereInput = {
      measurementType: 'VARIABLE',
    };

    if (params?.planItemId) {
      planItemsWhere.id = params.planItemId;
    }
    if (params?.productId) {
      planItemsWhere.plan = {
        productId: params.productId,
      };
    }

    const planItems = await this.prisma.inspectionPlanItem.findMany({
      where: planItemsWhere,
      include: {
        plan: {
          include: {
            product: {
              select: { id: true, partNumber: true, name: true },
            },
          },
        },
      },
      orderBy: { sequence: 'asc' },
    });

    if (planItems.length === 0) {
      return {
        runId: params?.runId,
        productId: params?.productId,
        metrics: [],
        overallStatus: 'INSUFFICIENT_DATA' as const,
      };
    }

    // 2. Fetch quality check samples for these plan items
    const samplesWhere: Prisma.QualityCheckSampleWhereInput = {
      planItemId: { in: planItems.map((p) => p.id) },
      measuredValue: { not: null },
    };

    if (params?.runId) {
      samplesWhere.qualityCheck = {
        runId: params.runId,
      };
    }

    const samples = await this.prisma.qualityCheckSample.findMany({
      where: samplesWhere,
      include: {
        qualityCheck: {
          select: { id: true, runId: true, checkedAt: true, checkType: true, disposition: true },
        },
      },
      orderBy: { qualityCheck: { checkedAt: 'asc' } },
    });

    // 3. Group samples by planItemId
    const samplesByItem = new Map<string, Array<{ measuredValue: number; timestamp: Date }>>();
    for (const s of samples) {
      if (s.measuredValue !== null) {
        const arr = samplesByItem.get(s.planItemId) ?? [];
        arr.push({
          measuredValue: Number(s.measuredValue),
          timestamp: s.qualityCheck.checkedAt,
        });
        samplesByItem.set(s.planItemId, arr);
      }
    }

    // 4. Calculate CPK metrics for each item
    const metrics = planItems.map((item) => {
      const itemSamples = samplesByItem.get(item.id) ?? [];
      const values = itemSamples.map((s) => s.measuredValue);
      const n = values.length;

      const targetVal = item.targetValue !== null ? Number(item.targetValue) : null;
      const usl = item.upperTolerance !== null ? Number(item.upperTolerance) : null;
      const lsl = item.lowerTolerance !== null ? Number(item.lowerTolerance) : null;

      if (n < 2) {
        return {
          planItemId: item.id,
          parameterName: item.parameterName,
          targetValue: targetVal,
          upperTolerance: usl,
          lowerTolerance: lsl,
          sampleCount: n,
          mean: n === 1 ? values[0] : (targetVal ?? 0),
          standardDeviation: 0,
          cp: null,
          cpu: null,
          cpl: null,
          cpk: null,
          status: 'INSUFFICIENT_DATA' as const,
          sampleValues: values,
        };
      }

      const sum = values.reduce((acc, val) => acc + val, 0);
      const mean = sum / n;

      const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1);
      const stdDev = Math.sqrt(variance);

      let cp: number | null = null;
      let cpu: number | null = null;
      let cpl: number | null = null;
      let cpk: number | null = null;
      let status: 'CAPABLE' | 'MARGINAL' | 'INCAPABLE' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';

      if (stdDev === 0) {
        const isWithinLimits =
          (usl === null || mean <= usl) && (lsl === null || mean >= lsl);
        if (isWithinLimits) {
          cp = 99.99;
          cpk = 99.99;
          status = 'CAPABLE';
        } else {
          cp = 0;
          cpk = 0;
          status = 'INCAPABLE';
        }
      } else {
        if (usl !== null && lsl !== null) {
          cp = (usl - lsl) / (6 * stdDev);
        }
        if (usl !== null) {
          cpu = (usl - mean) / (3 * stdDev);
        }
        if (lsl !== null) {
          cpl = (mean - lsl) / (3 * stdDev);
        }

        if (cpu !== null && cpl !== null) {
          cpk = Math.min(cpu, cpl);
        } else if (cpu !== null) {
          cpk = cpu;
        } else if (cpl !== null) {
          cpk = cpl;
        }

        if (cpk !== null) {
          if (cpk >= 1.33) {
            status = 'CAPABLE';
          } else if (cpk >= 1.0) {
            status = 'MARGINAL';
          } else {
            status = 'INCAPABLE';
          }
        }
      }

      return {
        planItemId: item.id,
        parameterName: item.parameterName,
        targetValue: targetVal,
        upperTolerance: usl,
        lowerTolerance: lsl,
        sampleCount: n,
        mean: Math.round(mean * 1000) / 1000,
        standardDeviation: Math.round(stdDev * 1000) / 1000,
        cp: cp !== null ? Math.round(cp * 100) / 100 : null,
        cpu: cpu !== null ? Math.round(cpu * 100) / 100 : null,
        cpl: cpl !== null ? Math.round(cpl * 100) / 100 : null,
        cpk: cpk !== null ? Math.round(cpk * 100) / 100 : null,
        status,
        sampleValues: values,
      };
    });

    let overallStatus: 'CAPABLE' | 'MARGINAL' | 'INCAPABLE' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
    const validMetrics = metrics.filter((m) => m.status !== 'INSUFFICIENT_DATA');
    if (validMetrics.length > 0) {
      if (validMetrics.some((m) => m.status === 'INCAPABLE')) {
        overallStatus = 'INCAPABLE';
      } else if (validMetrics.some((m) => m.status === 'MARGINAL')) {
        overallStatus = 'MARGINAL';
      } else {
        overallStatus = 'CAPABLE';
      }
    }

    return {
      runId: params?.runId,
      productId: params?.productId,
      metrics,
      overallStatus,
    };
  }
}
