import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { CreateAndonTicketDto, ResolveAndonTicketDto } from '../dto/create-andon-ticket.dto.js';
import { TelemetryIngestionService } from '../../telemetry/telemetry.service.js';
import { EventTypeEnum } from '../../telemetry/dto/normalized-machine-event.dto.js';
import { TelemetryGateway } from '../../telemetry/telemetry.gateway.js';

export interface ParetoItem {
  reasonCode: string;
  category: string;
  occurrenceCount: number;
  totalDurationSeconds: number;
  percentage: number;
  cumulativePercentage: number;
}

@Injectable()
export class AndonService implements OnModuleInit {
  private readonly logger = new Logger(AndonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telemetryService: TelemetryIngestionService,
    private readonly telemetryGateway: TelemetryGateway,
  ) {}

  onModuleInit() {
    // Listen to telemetry stream for automatic fault escalation
    this.telemetryService.telemetryStream$.subscribe({
      next: ({ event, internalMachineId }) => {
        if (event.eventType === EventTypeEnum.FAULT_STARTED) {
          void this.handleAutomatedFault(event, internalMachineId);
        }
      },
    });
    this.logger.log('AndonService hooked to Telemetry stream for automated fault ticket generation');
  }

  private async generateTicketNumber(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.andonTicket.count();
    const seq = String(count + 1).padStart(4, '0');
    return `ANDON-${today}-${seq}`;
  }

  private async resolveSystemUserId(): Promise<string> {
    const admin = await this.prisma.user.findFirst({
      where: { username: 'admin' },
      select: { id: true },
    });

    if (admin) {
      return admin.id;
    }

    const anyUser = await this.prisma.user.findFirst({ select: { id: true } });
    if (!anyUser) {
      throw new Error('No user found in database for system ticket reporting');
    }
    return anyUser.id;
  }

  /**
   * Automated ticket generation on machine trip alarm.
   */
  async handleAutomatedFault(event: any, machineId: string) {
    try {
      // Check if an OPEN or ACKNOWLEDGED ticket already exists for this machine
      const existingTicket = await this.prisma.andonTicket.findFirst({
        where: {
          machineId,
          status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        },
      });

      if (existingTicket) {
        this.logger.debug(`Open Andon ticket ${existingTicket.ticketNumber} already exists for machine ${machineId}`);
        return;
      }

      const systemUserId = await this.resolveSystemUserId();
      const ticketNumber = await this.generateTicketNumber();
      const faultCode = event.fault?.faultCode ?? 'UNKNOWN_FAULT';
      const faultDesc = event.fault?.faultDescription ?? 'Automated equipment alarm trip';

      const ticket = await this.prisma.andonTicket.create({
        data: {
          ticketNumber,
          machineId,
          category: 'MAINTENANCE',
          status: 'OPEN',
          reportedById: systemUserId,
          reportTime: new Date(event.sourceTimestamp ?? Date.now()),
          confirmedRootCause: `Automated fault: ${faultCode} - ${faultDesc}`,
        },
        include: {
          machine: { select: { id: true, code: true, name: true } },
          reportedBy: { select: { id: true, username: true } },
        },
      });

      this.logger.warn(`AUTOMATED ANDON TICKET CREATED: ${ticket.ticketNumber} on ${ticket.machine.code} (${faultCode})`);

      // Broadcast to WebSocket clients
      this.telemetryGateway.server?.to('plant:all').emit('andon:created', ticket);
      this.telemetryGateway.server?.to(`machine:${ticket.machine.code}`).emit('andon:created', ticket);
    } catch (error) {
      this.logger.error(`Error in automated Andon dispatch: ${(error as Error).message}`);
    }
  }

  /**
   * Manual operator ticket creation.
   */
  async createTicket(dto: CreateAndonTicketDto, reportedById: string) {
    const machine = await this.prisma.machine.findFirst({
      where: {
        OR: [{ id: dto.machineId }, { code: dto.machineId }],
      },
    });

    if (!machine) {
      throw new NotFoundException(`Machine identifier "${dto.machineId}" not found`);
    }

    const ticketNumber = await this.generateTicketNumber();

    const ticket = await this.prisma.andonTicket.create({
      data: {
        ticketNumber,
        machineId: machine.id,
        category: dto.category,
        status: 'OPEN',
        reportedById,
        reportTime: new Date(),
        confirmedRootCause: dto.description ?? (dto.faultCode ? `Reported code: ${dto.faultCode}` : null),
      },
      include: {
        machine: { select: { id: true, code: true, name: true } },
        reportedBy: { select: { id: true, username: true } },
      },
    });

    // Broadcast to WebSocket clients
    this.telemetryGateway.server?.to('plant:all').emit('andon:created', ticket);
    this.telemetryGateway.server?.to(`machine:${machine.code}`).emit('andon:created', ticket);

    return ticket;
  }

  async acknowledgeTicket(ticketId: string, technicianId: string) {
    const ticket = await this.prisma.andonTicket.findUnique({
      where: { id: ticketId },
      include: { machine: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Andon ticket with ID "${ticketId}" not found`);
    }

    if (ticket.status !== 'OPEN') {
      throw new BadRequestException(`Cannot acknowledge ticket in status "${ticket.status}"`);
    }

    const updated = await this.prisma.andonTicket.update({
      where: { id: ticketId },
      data: {
        status: 'ACKNOWLEDGED',
        assignedToId: technicianId,
        responseTime: new Date(),
      },
      include: {
        machine: { select: { id: true, code: true, name: true } },
        reportedBy: { select: { id: true, username: true } },
        assignedTo: { select: { id: true, username: true } },
      },
    });

    this.telemetryGateway.server?.to('plant:all').emit('andon:status_changed', updated);
    return updated;
  }

  async resolveTicket(ticketId: string, dto: ResolveAndonTicketDto) {
    const ticket = await this.prisma.andonTicket.findUnique({
      where: { id: ticketId },
      include: { machine: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Andon ticket with ID "${ticketId}" not found`);
    }

    if (ticket.status === 'RESOLVED') {
      throw new BadRequestException('Ticket is already resolved');
    }

    const updated = await this.prisma.andonTicket.update({
      where: { id: ticketId },
      data: {
        status: 'RESOLVED',
        resolutionTime: new Date(),
        confirmedRootCause: dto.confirmedRootCause,
        correctiveAction: dto.correctiveAction,
      },
      include: {
        machine: { select: { id: true, code: true, name: true } },
        reportedBy: { select: { id: true, username: true } },
        assignedTo: { select: { id: true, username: true } },
      },
    });

    this.telemetryGateway.server?.to('plant:all').emit('andon:status_changed', updated);
    return updated;
  }

  async findAll(params?: { machineId?: string; status?: string; category?: string }) {
    return this.prisma.andonTicket.findMany({
      where: {
        machineId: params?.machineId,
        status: params?.status,
        category: params?.category,
      },
      include: {
        machine: { select: { id: true, code: true, name: true } },
        reportedBy: { select: { id: true, username: true } },
        assignedTo: { select: { id: true, username: true } },
      },
      orderBy: { reportTime: 'desc' },
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.andonTicket.findUnique({
      where: { id },
      include: {
        machine: true,
        reportedBy: true,
        assignedTo: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Andon ticket with ID "${id}" not found`);
    }

    return ticket;
  }

  /**
   * Computes MTTR Response & Resolution metrics.
   */
  async getMttrAnalytics() {
    const resolvedTickets = await this.prisma.andonTicket.findMany({
      where: {
        status: 'RESOLVED',
        responseTime: { not: null },
        resolutionTime: { not: null },
      },
    });

    if (resolvedTickets.length === 0) {
      return {
        totalTicketsEvaluated: 0,
        averageResponseTimeMinutes: 0,
        averageResolutionTimeMinutes: 0,
      };
    }

    let totalResponseMs = 0;
    let totalResolveMs = 0;

    for (const t of resolvedTickets) {
      const respTime = t.responseTime!.getTime() - t.reportTime.getTime();
      const resTime = t.resolutionTime!.getTime() - t.responseTime!.getTime();
      totalResponseMs += Math.max(0, respTime);
      totalResolveMs += Math.max(0, resTime);
    }

    return {
      totalTicketsEvaluated: resolvedTickets.length,
      averageResponseTimeMinutes: Math.round((totalResponseMs / resolvedTickets.length / 60000) * 10) / 10,
      averageResolutionTimeMinutes: Math.round((totalResolveMs / resolvedTickets.length / 60000) * 10) / 10,
    };
  }

  /**
   * Computes Pareto analysis of downtime occurrences by reason code and category.
   */
  async getParetoAnalytics(): Promise<{ totalDowntimeSeconds: number; items: ParetoItem[] }> {
    const segments = await this.prisma.machineTimeSegment.findMany({
      where: {
        category: { in: ['UNPLANNED_DOWNTIME', 'PLANNED_DOWNTIME'] },
      },
      include: {
        downtimeReason: true,
      },
    });

    if (segments.length === 0) {
      return { totalDowntimeSeconds: 0, items: [] };
    }

    const groupMap = new Map<string, { category: string; count: number; totalDuration: number }>();
    let totalDowntimeSeconds = 0;

    for (const seg of segments) {
      const key = seg.downtimeReason?.code ?? 'UNSPECIFIED';
      const category = seg.downtimeReason?.category ?? seg.category;
      totalDowntimeSeconds += seg.durationSeconds;

      const curr = groupMap.get(key) ?? { category, count: 0, totalDuration: 0 };
      curr.count += 1;
      curr.totalDuration += seg.durationSeconds;
      groupMap.set(key, curr);
    }

    // Sort descending by total duration
    const sorted = Array.from(groupMap.entries())
      .map(([reasonCode, data]) => ({
        reasonCode,
        category: data.category,
        occurrenceCount: data.count,
        totalDurationSeconds: data.totalDuration,
      }))
      .sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds);

    let runningCumulative = 0;
    const items: ParetoItem[] = sorted.map((item) => {
      const percentage = totalDowntimeSeconds > 0
        ? Math.round((item.totalDurationSeconds / totalDowntimeSeconds) * 1000) / 10
        : 0;
      runningCumulative += percentage;

      return {
        ...item,
        percentage,
        cumulativePercentage: Math.min(100, Math.round(runningCumulative * 10) / 10),
      };
    });

    return {
      totalDowntimeSeconds,
      items,
    };
  }
}
