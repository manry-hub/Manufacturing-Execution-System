import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import { IntegrationController } from './integration.controller.js';
import { PpssInboundService } from './services/ppss-inbound.service.js';
import { PpssWebhookService } from './services/ppss-webhook.service.js';
import { PlmInboundService } from './services/plm-inbound.service.js';
import { QmsInboundService } from './services/qms-inbound.service.js';
import { TelemetryModule } from '../telemetry/telemetry.module.js';

@Module({
  imports: [PrismaModule, TelemetryModule],
  controllers: [IntegrationController],
  providers: [
    PpssInboundService,
    PpssWebhookService,
    PlmInboundService,
    QmsInboundService,
  ],
  exports: [
    PpssInboundService,
    PpssWebhookService,
    PlmInboundService,
    QmsInboundService,
  ],
})
export class IntegrationModule {}
