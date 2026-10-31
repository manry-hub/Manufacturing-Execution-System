import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import { IntegrationController } from './integration.controller.js';
import { PpssInboundService } from './services/ppss-inbound.service.js';
import { PpssWebhookService } from './services/ppss-webhook.service.js';
import { TelemetryModule } from '../telemetry/telemetry.module.js';

@Module({
  imports: [PrismaModule, TelemetryModule],
  controllers: [IntegrationController],
  providers: [PpssInboundService, PpssWebhookService],
  exports: [PpssInboundService, PpssWebhookService],
})
export class IntegrationModule {}
