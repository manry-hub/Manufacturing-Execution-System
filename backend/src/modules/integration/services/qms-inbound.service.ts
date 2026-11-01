import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { QmsQcReleaseDto } from '../dto/qms-qc-release.dto.js';
import { TelemetryGateway } from '../../telemetry/telemetry.gateway.js';

@Injectable()
export class QmsInboundService {
  private readonly logger = new Logger(QmsInboundService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly gateway?: TelemetryGateway,
  ) {}

  /**
   * Process First-Piece QC inspection disposition from external QMS.
   */
  async processQcRelease(dto: QmsQcReleaseDto) {
    this.logger.log(
      `Processing QMS QC release for run "${dto.runId}" with disposition "${dto.disposition}" (Inspector: ${dto.inspectorBadge})`,
    );

    // 1. Resolve Production Run
    const run = await this.prisma.productionRun.findUnique({
      where: { id: dto.runId },
      include: {
        machine: true,
        productionOrder: { include: { product: true } },
      },
    });

    if (!run) {
      throw new NotFoundException(`Production run with ID "${dto.runId}" not found`);
    }

    if (run.status === 'COMPLETED') {
      throw new BadRequestException(`Cannot process QC release for completed run "${run.id}"`);
    }

    // 2. Resolve or find inspector user in MES for attribution
    let inspector = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.inspectorBadge },
          { email: `${dto.inspectorBadge.toLowerCase()}@qms.local` },
        ],
      },
    });

    if (!inspector) {
      // Find default system administrator or quality user for fallback attribution
      inspector = await this.prisma.user.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    const inspectorId = inspector?.id;
    if (!inspectorId) {
      throw new BadRequestException('No active system user available to record QC check attribution');
    }

    // 3. Create QualityCheck in transaction and update run status
    const result = await this.prisma.$transaction(async (tx) => {
      const qc = await tx.qualityCheck.create({
        data: {
          runId: run.id,
          inspectorId,
          checkType: 'FIRST_PIECE',
          disposition: dto.disposition,
          notes: dto.notes ? `[QMS:${dto.inspectorBadge}] ${dto.notes}` : `[QMS:${dto.inspectorBadge}] First-Piece disposition: ${dto.disposition}`,
          checkedAt: new Date(),
        },
      });

      let updatedRunStatus = run.status;
      if (dto.disposition === 'RELEASED') {
        // Unlock run to ACTIVE if it was in SETUP / QC_HOLD
        if (run.status === 'SETUP') {
          await tx.productionRun.update({
            where: { id: run.id },
            data: { status: 'ACTIVE' },
          });
          updatedRunStatus = 'ACTIVE';
        }
      } else {
        // Enforce hold status if rejected
        if (run.status !== 'SETUP') {
          await tx.productionRun.update({
            where: { id: run.id },
            data: { status: 'SETUP' },
          });
          updatedRunStatus = 'SETUP';
        }
      }

      return { qc, updatedRunStatus };
    });

    // 4. Broadcast Websocket events & Interlock states
    if (this.gateway) {
      const isApproved = dto.disposition === 'RELEASED';

      this.gateway.broadcastQualityEvent('quality:first_piece_status_changed', {
        runId: run.id,
        isReleased: isApproved,
        disposition: dto.disposition,
        inspectorBadge: dto.inspectorBadge,
        checkedAt: result.qc.checkedAt,
      });

      this.gateway.broadcastQualityEvent('machine:interlock_state', {
        machineId: run.machineId,
        isInterlocked: !isApproved,
        reason: isApproved
          ? 'First-Piece QC Approved by QMS'
          : `First-Piece QC Rejected by QMS: ${dto.notes ?? 'Out of tolerance'}`,
      });
    }

    this.logger.log(
      `Successfully processed QMS QC disposition: ${dto.disposition} for run ${run.id}. Run status: ${result.updatedRunStatus}`,
    );

    return {
      success: true,
      checkId: result.qc.id,
      runId: run.id,
      disposition: dto.disposition,
      runStatus: result.updatedRunStatus,
      isInterlocked: dto.disposition !== 'RELEASED',
      processedAt: result.qc.checkedAt,
    };
  }
}
