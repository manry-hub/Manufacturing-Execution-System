import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PpssWebhookService } from './ppss-webhook.service.js';
import type { PrismaService } from '../../../database/prisma.service.js';

describe('PpssWebhookService', () => {
  let service: PpssWebhookService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      integrationWebhookConfig: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    };

    service = new PpssWebhookService(mockPrisma as PrismaService);
  });

  describe('dispatchWebhook', () => {
    it('should return false if no active webhook configuration exists', async () => {
      mockPrisma.integrationWebhookConfig.findUnique.mockResolvedValue(null);

      const dispatched = await service.dispatchWebhook('order.scheduled', { test: true });
      expect(dispatched).toBe(false);
    });

    it('should return false if the event is not in subscribed events list', async () => {
      mockPrisma.integrationWebhookConfig.findUnique.mockResolvedValue({
        systemName: 'PPSS',
        targetUrl: 'http://localhost:5000/webhook',
        secretToken: 'secret123',
        isActive: true,
        events: 'order.scheduled,run.completed',
      });

      const dispatched = await service.dispatchWebhook('unsubscribed.event', { test: true });
      expect(dispatched).toBe(false);
    });

    it('should send signed POST payload when configuration is active and subscribed', async () => {
      mockPrisma.integrationWebhookConfig.findUnique.mockResolvedValue({
        systemName: 'PPSS',
        targetUrl: 'http://localhost:5000/webhook',
        secretToken: 'secret123',
        isActive: true,
        events: 'order.scheduled,run.completed',
      });

      const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      vi.stubGlobal('fetch', mockFetch);

      const dispatched = await service.dispatchWebhook('order.scheduled', {
        orderNumber: 'WO-100',
        machineCode: 'IMM-01',
      });

      expect(dispatched).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-MES-Event': 'order.scheduled',
            'X-MES-Signature': expect.stringContaining('sha256='),
          }),
        }),
      );

      vi.unstubAllGlobals();
    });
  });

  describe('helper dispatchers', () => {
    it('should format order.scheduled payload correctly', async () => {
      const spy = vi.spyOn(service, 'dispatchWebhook').mockResolvedValue(true);

      await service.notifyOrderScheduled({
        orderNumber: 'WO-100',
        externalOrderRef: 'PPSS-PO-100',
        assignedMachineCode: 'IMM-02',
        assignedMoldCode: 'MOLD-001',
        plannedStartTime: new Date('2026-11-01T08:00:00Z'),
        plannedEndTime: new Date('2026-11-01T12:00:00Z'),
      });

      expect(spy).toHaveBeenCalledWith(
        'order.scheduled',
        expect.objectContaining({
          orderNumber: 'WO-100',
          externalOrderRef: 'PPSS-PO-100',
          assignedMachineCode: 'IMM-02',
        }),
      );
    });

    it('should format run.completed payload correctly', async () => {
      const spy = vi.spyOn(service, 'dispatchWebhook').mockResolvedValue(true);

      await service.notifyRunCompleted({
        orderNumber: 'WO-100',
        externalOrderRef: 'PPSS-PO-100',
        machineCode: 'IMM-02',
        totalShots: 2500,
        goodQuantity: 9900,
        scrapQuantity: 100,
      });

      expect(spy).toHaveBeenCalledWith(
        'run.completed',
        expect.objectContaining({
          goodQuantity: 9900,
          scrapQuantity: 100,
        }),
      );
    });
  });
});
