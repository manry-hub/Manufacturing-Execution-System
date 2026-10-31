import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { StartProductionRunDto } from '../dto/start-production-run.dto.js';
import { RecordScrapDto } from '../dto/record-scrap.dto.js';
import { TelemetryIngestionService } from '../../telemetry/telemetry.service.js';
import { EventTypeEnum } from '../../telemetry/dto/normalized-machine-event.dto.js';
import { MaintenanceService } from '../../maintenance/maintenance.service.js';
import { QualityService } from '../../quality/quality.service.js';
import { TelemetryGateway } from '../../telemetry/telemetry.gateway.js';
import { PpssWebhookService } from '../../integration/services/ppss-webhook.service.js';

@Injectable()
export class RunsService implements OnModuleInit {
  private readonly logger = new Logger(RunsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telemetryService: TelemetryIngestionService,
    private readonly maintenanceService: MaintenanceService,
    private readonly qualityService: QualityService,
    @Optional() private readonly gateway?: TelemetryGateway,
    @Optional() private readonly webhookService?: PpssWebhookService,
  ) {}

  onModuleInit() {
    // Listen to incoming telemetry stream to automatically update active run metrics on cycle completion
    this.telemetryService.telemetryStream$.subscribe({
      next: ({ event, internalMachineId }) => {
        if (event.eventType === EventTypeEnum.CYCLE_COMPLETED) {
          void this.handleCycleCompleted(internalMachineId);
        }
      },
    });
    this.logger.log('RunsService hooked to Telemetry stream for automatic shot accumulation');
  }

  async startRun(dto: StartProductionRunDto) {
    // 1. Verify production order
    const order = await this.prisma.productionOrder.findUnique({
      where: { id: dto.productionOrderId },
      include: { product: true },
    });

    if (!order) {
      throw new NotFoundException(`Production order with ID "${dto.productionOrderId}" not found`);
    }

    if (order.status !== 'RELEASED' && order.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        `Order must be in RELEASED or IN_PROGRESS state to start a run (current: ${order.status})`,
      );
    }

    // 2. Resolve machine
    const machine = await this.prisma.machine.findFirst({
      where: {
        OR: [{ id: dto.machineId }, { code: dto.machineId }],
      },
      include: { currentState: true },
    });

    if (!machine) {
      throw new NotFoundException(`Machine identifier "${dto.machineId}" not found`);
    }

    if (machine.currentState?.activeRunId) {
      throw new BadRequestException(
        `Machine "${machine.code}" already has an active run (Run ID: ${machine.currentState.activeRunId})`,
      );
    }

    // 3. Resolve mold and verify compatibility
    const mold = await this.prisma.mold.findFirst({
      where: {
        OR: [{ id: dto.moldId }, { code: dto.moldId }],
      },
    });

    if (!mold) {
      throw new NotFoundException(`Mold identifier "${dto.moldId}" not found`);
    }

    const compatibility = await this.prisma.moldProductCompatibility.findFirst({
      where: {
        moldId: mold.id,
        productId: order.productId,
      },
    });

    if (!compatibility) {
      throw new BadRequestException(
        `Mold "${mold.code}" is not compatible with Product "${order.product.partNumber}"`,
      );
    }

    // 4. Create Run Transactionally
    const run = await this.prisma.$transaction(async (tx) => {
      const createdRun = await tx.productionRun.create({
        data: {
          productionOrderId: order.id,
          machineId: machine.id,
          moldId: mold.id,
          status: dto.status ?? 'ACTIVE',
          startTime: new Date(),
          totalShots: 0,
          goodQuantity: 0,
          rejectQuantity: 0,
        },
        include: {
          productionOrder: { include: { product: true } },
          machine: true,
          mold: true,
        },
      });

      // Update machine current state
      await tx.machineCurrentState.update({
        where: { machineId: machine.id },
        data: { activeRunId: createdRun.id },
      });

      // Update order to IN_PROGRESS
      if (order.status === 'RELEASED') {
        await tx.productionOrder.update({
          where: { id: order.id },
          data: {
            status: 'IN_PROGRESS',
            actualStartTime: order.actualStartTime ?? new Date(),
          },
        });
      }

      return createdRun;
    });

    this.logger.log(`Started production run ${run.id} on machine ${machine.code} (Order: ${order.orderNumber})`);

    if (this.webhookService) {
      void this.webhookService.notifyRunStarted({
        orderNumber: order.orderNumber,
        externalOrderRef: order.externalOrderRef,
        machineCode: machine.code,
        moldCode: mold.code,
        startTime: run.startTime,
      });
    }

    return run;
  }

  async pauseRun(runId: string) {
    const run = await this.findOne(runId);
    if (run.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot pause run in status "${run.status}"`);
    }

    return this.prisma.productionRun.update({
      where: { id: runId },
      data: { status: 'PAUSED' },
    });
  }

  async resumeRun(runId: string) {
    const run = await this.findOne(runId);
    if (run.status !== 'PAUSED') {
      throw new BadRequestException(`Cannot resume run in status "${run.status}"`);
    }

    return this.prisma.productionRun.update({
      where: { id: runId },
      data: { status: 'ACTIVE' },
    });
  }

  async releaseRunToActive(runId: string) {
    const run = await this.findOne(runId);
    if (run.status === 'ACTIVE') {
      return run;
    }

    if (run.status !== 'SETUP') {
      throw new BadRequestException(
        `Cannot release run in status "${run.status}" to ACTIVE. Only runs in SETUP can be released.`,
      );
    }

    const fpStatus = await this.qualityService.checkFirstPieceReleaseStatus(runId);
    if (!fpStatus.isReleased) {
      throw new BadRequestException(
        'Cannot release run to ACTIVE: First-Piece Quality Approval is required before serial production.',
      );
    }

    const updatedRun = await this.prisma.productionRun.update({
      where: { id: runId },
      data: { status: 'ACTIVE' },
      include: {
        productionOrder: { include: { product: true } },
        machine: true,
        mold: true,
      },
    });

    if (this.gateway) {
      this.gateway.broadcastQualityEvent('machine:interlock_state', {
        machineId: run.machineId,
        isInterlocked: false,
      });
      this.gateway.broadcastProductionEvent('production:run_released', {
        runId: updatedRun.id,
        run: updatedRun,
      });
    }

    this.logger.log(`Released production run ${runId} to ACTIVE on machine ${run.machine?.code ?? run.machineId}`);
    return updatedRun;
  }

  async completeRun(runId: string) {
    const run = await this.findOne(runId);
    if (run.status === 'COMPLETED') {
      throw new BadRequestException('Run is already completed');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const completedRun = await tx.productionRun.update({
        where: { id: runId },
        data: {
          status: 'COMPLETED',
          endTime: new Date(),
        },
        include: {
          productionOrder: true,
          machine: true,
          mold: true,
        },
      });

      // Unbind activeRunId from machine
      await tx.machineCurrentState.updateMany({
        where: { activeRunId: runId },
        data: { activeRunId: null },
      });

      // Check if total produced parts meets order target
      const allOrderRuns = await tx.productionRun.findMany({
        where: { productionOrderId: run.productionOrderId },
      });

      const totalGoodQuantity = allOrderRuns.reduce((acc, r) => acc + (r.id === runId ? completedRun.goodQuantity : r.goodQuantity), 0);

      if (totalGoodQuantity >= run.productionOrder.targetQuantity) {
        await tx.productionOrder.update({
          where: { id: run.productionOrderId },
          data: {
            status: 'COMPLETED',
            actualEndTime: new Date(),
          },
        });
      }

      return completedRun;
    });

    if (this.webhookService) {
      void this.webhookService.notifyRunCompleted({
        orderNumber: run.productionOrder.orderNumber,
        externalOrderRef: run.productionOrder.externalOrderRef,
        machineCode: run.machine.code,
        totalShots: result.totalShots,
        goodQuantity: result.goodQuantity,
        scrapQuantity: result.rejectQuantity,
        actualEndTime: result.endTime,
      });
    }

    return result;
  }

  async recordScrap(runId: string, dto: RecordScrapDto) {
    const run = await this.findOne(runId);

    const newRejectQuantity = run.rejectQuantity + dto.rejectQuantity;
    const totalPartsProduced = run.totalShots * run.mold.cavityCount;
    const newGoodQuantity = Math.max(0, totalPartsProduced - newRejectQuantity);

    return this.prisma.productionRun.update({
      where: { id: runId },
      data: {
        rejectQuantity: newRejectQuantity,
        goodQuantity: newGoodQuantity,
      },
      include: {
        mold: true,
        productionOrder: true,
      },
    });
  }

  async handleCycleCompleted(machineId: string) {
    try {
      const currentState = this.prisma.machineCurrentState?.findUnique
        ? await this.prisma.machineCurrentState.findUnique({
            where: { machineId },
          })
        : null;

      let activeRun = currentState?.activeRunId
        ? await this.prisma.productionRun.findUnique({
            where: { id: currentState.activeRunId },
            include: { mold: true },
          })
        : null;

      if (!activeRun || activeRun.status === 'COMPLETED' || activeRun.status === 'CANCELLED') {
        activeRun = await this.prisma.productionRun.findFirst({
          where: {
            machineId,
            status: { in: ['ACTIVE', 'SETUP'] },
          },
          orderBy: { startTime: 'desc' },
          include: { mold: true },
        });
      }

      if (!activeRun) {
        return;
      }

      await this.prisma.productionRun.update({
        where: { id: activeRun.id },
        data: {
          totalShots: { increment: 1 },
          goodQuantity: { increment: activeRun.mold.cavityCount },
        },
      });

      // Update mold cumulative shots
      const updatedMold = await this.prisma.mold.update({
        where: { id: activeRun.moldId },
        data: {
          totalShots: { increment: 1 },
        },
      });

      // Broadcast mold stroke accumulation and hopper resin depletion
      if (this.gateway) {
        this.gateway.broadcastMaintenanceEvent('mold:stroke_accumulated', {
          moldId: activeRun.moldId,
          machineId,
          totalShots: Number(updatedMold.totalShots),
        });

        const consumedKg = Math.round(activeRun.mold.cavityCount * 0.025 * 1000) / 1000;
        this.gateway.broadcastMaterialsEvent('materials:hopper_depleted', {
          runId: activeRun.id,
          machineId,
          consumedKg,
        });
      }

      // Hook PM schedule threshold evaluation
      await this.maintenanceService.checkMoldPmThreshold(activeRun.moldId, updatedMold.totalShots);
    } catch (error) {
      this.logger.error(`Error handling cycle completion for active run on ${machineId}: ${(error as Error).message}`);
    }
  }

  async findActiveByMachine(machineId: string) {
    return this.prisma.productionRun.findFirst({
      where: {
        machineId,
        status: 'ACTIVE',
      },
      include: {
        productionOrder: { include: { product: true } },
        mold: true,
      },
    });
  }

  async findAll(params?: { machineId?: string; status?: string; productionOrderId?: string }) {
    return this.prisma.productionRun.findMany({
      where: {
        machineId: params?.machineId,
        status: params?.status,
        productionOrderId: params?.productionOrderId,
      },
      include: {
        productionOrder: { select: { orderNumber: true, targetQuantity: true, product: true } },
        machine: { select: { id: true, code: true, name: true } },
        mold: { select: { id: true, code: true, name: true, cavityCount: true } },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async findOne(id: string) {
    const run = await this.prisma.productionRun.findUnique({
      where: { id },
      include: {
        productionOrder: { include: { product: true } },
        machine: true,
        mold: true,
      },
    });

    if (!run) {
      throw new NotFoundException(`Production run with ID "${id}" not found`);
    }

    return run;
  }
}
