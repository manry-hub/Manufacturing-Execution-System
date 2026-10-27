import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AndonService } from './andon.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { TelemetryIngestionService } from '../../telemetry/telemetry.service.js';
import { TelemetryGateway } from '../../telemetry/telemetry.gateway.js';
import { BadRequestException } from '@nestjs/common';
import { Subject } from 'rxjs';

describe('AndonService', () => {
  let service: AndonService;
  let mockPrisma: any;
  let mockTelemetryService: any;
  let mockTelemetryGateway: any;
  let telemetryStream$: Subject<any>;

  beforeEach(() => {
    telemetryStream$ = new Subject();
    mockTelemetryService = {
      telemetryStream$,
    };

    mockTelemetryGateway = {
      server: {
        to: vi.fn().mockReturnValue({
          emit: vi.fn(),
        }),
      },
    };

    mockPrisma = {
      andonTicket: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn().mockResolvedValue(10),
      },
      machine: {
        findFirst: vi.fn(),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue({ id: 'admin-user-id', username: 'admin' }),
      },
      machineTimeSegment: {
        findMany: vi.fn(),
      },
    };

    service = new AndonService(
      mockPrisma as unknown as PrismaService,
      mockTelemetryService as unknown as TelemetryIngestionService,
      mockTelemetryGateway as unknown as TelemetryGateway,
    );
  });

  describe('handleAutomatedFault', () => {
    it('should create an open Andon ticket when fault alarm is triggered', async () => {
      mockPrisma.andonTicket.findFirst.mockResolvedValue(null);
      mockPrisma.andonTicket.create.mockResolvedValue({
        id: 'ticket-1',
        ticketNumber: 'ANDON-20261028-0011',
        machine: { id: 'm-10', code: 'IMM-10', name: 'Demag 250T' },
        reportedBy: { id: 'admin-user-id', username: 'admin' },
      });

      await service.handleAutomatedFault(
        {
          fault: {
            faultCode: 'UNP-HYD-JAM',
            faultDescription: 'Hydraulic pressure collapse',
          },
          sourceTimestamp: new Date().toISOString(),
        },
        'm-10',
      );

      expect(mockPrisma.andonTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            machineId: 'm-10',
            category: 'MAINTENANCE',
            status: 'OPEN',
            reportedById: 'admin-user-id',
          }),
        }),
      );
    });

    it('should not create a second ticket if an open ticket already exists on that machine', async () => {
      mockPrisma.andonTicket.findFirst.mockResolvedValue({
        id: 'existing-ticket',
        status: 'OPEN',
      });

      await service.handleAutomatedFault({}, 'm-10');

      expect(mockPrisma.andonTicket.create).not.toHaveBeenCalled();
    });
  });

  describe('acknowledgeTicket', () => {
    it('should transition ticket from OPEN to ACKNOWLEDGED with response time', async () => {
      mockPrisma.andonTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        status: 'OPEN',
        machine: { id: 'm-1', code: 'IMM-01' },
      });
      mockPrisma.andonTicket.update.mockResolvedValue({
        id: 'ticket-1',
        status: 'ACKNOWLEDGED',
        assignedToId: 'tech-1',
      });

      const updated = await service.acknowledgeTicket('ticket-1', 'tech-1');

      expect(updated.status).toBe('ACKNOWLEDGED');
      expect(mockPrisma.andonTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACKNOWLEDGED',
            assignedToId: 'tech-1',
          }),
        }),
      );
    });

    it('should throw BadRequestException if ticket is already ACKNOWLEDGED or RESOLVED', async () => {
      mockPrisma.andonTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        status: 'ACKNOWLEDGED',
        machine: { id: 'm-1' },
      });

      await expect(service.acknowledgeTicket('ticket-1', 'tech-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resolveTicket', () => {
    it('should transition ticket to RESOLVED with root cause and corrective action', async () => {
      mockPrisma.andonTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        status: 'ACKNOWLEDGED',
        machine: { id: 'm-1' },
      });
      mockPrisma.andonTicket.update.mockResolvedValue({
        id: 'ticket-1',
        status: 'RESOLVED',
        confirmedRootCause: 'Hydraulic seal leakage',
        correctiveAction: 'Replaced O-ring and replenished fluid',
      });

      const resolved = await service.resolveTicket('ticket-1', {
        confirmedRootCause: 'Hydraulic seal leakage',
        correctiveAction: 'Replaced O-ring and replenished fluid',
      });

      expect(resolved.status).toBe('RESOLVED');
      expect(mockPrisma.andonTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'RESOLVED',
            confirmedRootCause: 'Hydraulic seal leakage',
            correctiveAction: 'Replaced O-ring and replenished fluid',
          }),
        }),
      );
    });
  });

  describe('getMttrAnalytics', () => {
    it('should calculate average response and resolution time in minutes', async () => {
      const reportTime = new Date('2026-10-28T08:00:00Z');
      const responseTime = new Date('2026-10-28T08:05:00Z'); // 5 min response
      const resolutionTime = new Date('2026-10-28T08:25:00Z'); // 20 min resolution

      mockPrisma.andonTicket.findMany.mockResolvedValue([
        { reportTime, responseTime, resolutionTime },
      ]);

      const analytics = await service.getMttrAnalytics();

      expect(analytics.totalTicketsEvaluated).toBe(1);
      expect(analytics.averageResponseTimeMinutes).toBe(5);
      expect(analytics.averageResolutionTimeMinutes).toBe(20);
    });
  });

  describe('getParetoAnalytics', () => {
    it('should calculate ranked downtime Pareto distribution', async () => {
      mockPrisma.machineTimeSegment.findMany.mockResolvedValue([
        {
          durationSeconds: 1200,
          category: 'UNPLANNED_DOWNTIME',
          downtimeReason: { code: 'UNP-HYD-JAM', category: 'HYDRAULIC_FAULT' },
        },
        {
          durationSeconds: 800,
          category: 'UNPLANNED_DOWNTIME',
          downtimeReason: { code: 'UNP-HEAT-FAULT', category: 'HEATER_FAILURE' },
        },
      ]);

      const pareto = await service.getParetoAnalytics();

      expect(pareto.totalDowntimeSeconds).toBe(2000);
      expect(pareto.items).toHaveLength(2);
      expect(pareto.items[0].reasonCode).toBe('UNP-HYD-JAM');
      expect(pareto.items[0].percentage).toBe(60); // 1200 / 2000 = 60%
      expect(pareto.items[0].cumulativePercentage).toBe(60);
      expect(pareto.items[1].reasonCode).toBe('UNP-HEAT-FAULT');
      expect(pareto.items[1].percentage).toBe(40); // 800 / 2000 = 40%
      expect(pareto.items[1].cumulativePercentage).toBe(100);
    });
  });
});
