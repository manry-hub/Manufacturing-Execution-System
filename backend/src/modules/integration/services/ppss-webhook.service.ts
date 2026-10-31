import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { PrismaService } from '../../../database/prisma.service.js';
import type { WebhookConfigDto } from '../dto/webhook-config.dto.js';

export interface MesWebhookEnvelope<T> {
  eventId: string;
  eventType: string;
  timestamp: string;
  data: T;
}

@Injectable()
export class PpssWebhookService {
  private readonly logger = new Logger(PpssWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves current PPSS webhook configuration.
   */
  async getConfig() {
    return this.prisma.integrationWebhookConfig.findUnique({
      where: { systemName: 'PPSS' },
    });
  }

  /**
   * Upserts PPSS webhook endpoint and secret token.
   */
  async upsertConfig(dto: WebhookConfigDto) {
    return this.prisma.integrationWebhookConfig.upsert({
      where: { systemName: 'PPSS' },
      update: {
        targetUrl: dto.targetUrl,
        secretToken: dto.secretToken,
        isActive: dto.isActive ?? true,
        events: dto.events ?? 'order.scheduled,order.released,run.started,run.progress,run.completed,machine.down',
      },
      create: {
        systemName: 'PPSS',
        targetUrl: dto.targetUrl,
        secretToken: dto.secretToken,
        isActive: dto.isActive ?? true,
        events: dto.events ?? 'order.scheduled,order.released,run.started,run.progress,run.completed,machine.down',
      },
    });
  }

  /**
   * Emits a signed outbound webhook payload to the configured PPSS server.
   */
  async dispatchWebhook<T>(eventType: string, data: T): Promise<boolean> {
    try {
      const config = await this.getConfig();
      if (!config || !config.isActive) {
        return false;
      }

      // Check if event is subscribed
      const subscribed = config.events.split(',').map((e) => e.trim());
      if (!subscribed.includes(eventType) && !subscribed.includes('*')) {
        return false;
      }

      const eventId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const payload: MesWebhookEnvelope<T> = {
        eventId,
        eventType,
        timestamp,
        data,
      };

      const payloadString = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', config.secretToken)
        .update(payloadString)
        .digest('hex');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        const response = await fetch(config.targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-MES-Event': eventType,
            'X-MES-Delivery': eventId,
            'X-MES-Signature': `sha256=${signature}`,
          },
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          this.logger.warn(
            `Webhook dispatch for "${eventType}" (${eventId}) failed with HTTP ${response.status}`,
          );
          return false;
        }

        this.logger.debug(`Webhook dispatch for "${eventType}" (${eventId}) succeeded`);
        return true;
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to deliver webhook "${eventType}" to ${config.targetUrl}: ${errMsg}`);
        return false;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error in dispatchWebhook: ${errMsg}`);
      return false;
    }
  }

  /**
   * Helper: Dispatch event when order is scheduled onto a machine track.
   */
  async notifyOrderScheduled(order: {
    orderNumber: string;
    externalOrderRef?: string | null;
    assignedMachineCode?: string;
    assignedMoldCode?: string;
    plannedStartTime: Date | string;
    plannedEndTime?: Date | string | null;
  }) {
    return this.dispatchWebhook('order.scheduled', {
      orderNumber: order.orderNumber,
      externalOrderRef: order.externalOrderRef,
      assignedMachineCode: order.assignedMachineCode,
      assignedMoldCode: order.assignedMoldCode,
      plannedStartTime: new Date(order.plannedStartTime).toISOString(),
      plannedEndTime: order.plannedEndTime ? new Date(order.plannedEndTime).toISOString() : null,
    });
  }

  /**
   * Helper: Dispatch event when order is released to shop floor.
   */
  async notifyOrderReleased(order: {
    orderNumber: string;
    externalOrderRef?: string | null;
  }) {
    return this.dispatchWebhook('order.released', {
      orderNumber: order.orderNumber,
      externalOrderRef: order.externalOrderRef,
      releasedAt: new Date().toISOString(),
    });
  }

  /**
   * Helper: Dispatch event when run transitions to active execution.
   */
  async notifyRunStarted(run: {
    orderNumber: string;
    externalOrderRef?: string | null;
    machineCode: string;
    moldCode?: string;
    startTime: Date | string;
  }) {
    return this.dispatchWebhook('run.started', {
      orderNumber: run.orderNumber,
      externalOrderRef: run.externalOrderRef,
      machineCode: run.machineCode,
      moldCode: run.moldCode,
      actualStartTime: new Date(run.startTime).toISOString(),
    });
  }

  /**
   * Helper: Dispatch event for run progress updates.
   */
  async notifyRunProgress(progress: {
    orderNumber: string;
    externalOrderRef?: string | null;
    machineCode: string;
    totalShots: number;
    goodQuantity: number;
    scrapQuantity: number;
    progressPercent: number;
  }) {
    return this.dispatchWebhook('run.progress', {
      ...progress,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Helper: Dispatch event when run is completed and output reconciled.
   */
  async notifyRunCompleted(run: {
    orderNumber: string;
    externalOrderRef?: string | null;
    machineCode: string;
    totalShots: number;
    goodQuantity: number;
    scrapQuantity: number;
    actualEndTime?: Date | string | null;
  }) {
    return this.dispatchWebhook('run.completed', {
      orderNumber: run.orderNumber,
      externalOrderRef: run.externalOrderRef,
      machineCode: run.machineCode,
      totalShots: run.totalShots,
      goodQuantity: run.goodQuantity,
      scrapQuantity: run.scrapQuantity,
      actualEndTime: run.actualEndTime ? new Date(run.actualEndTime).toISOString() : new Date().toISOString(),
    });
  }

  /**
   * Helper: Dispatch event when a machine goes down / fault.
   */
  async notifyMachineDown(machineCode: string, faultCode?: string) {
    return this.dispatchWebhook('machine.down', {
      machineCode,
      faultCode: faultCode ?? 'UNKNOWN_FAULT',
      downtimeStartedAt: new Date().toISOString(),
    });
  }
}
