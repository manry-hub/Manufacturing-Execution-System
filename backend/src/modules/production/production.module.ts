import { Module } from '@nestjs/common';
import { OrdersService } from './services/orders.service.js';
import { RunsService } from './services/runs.service.js';
import { ProductionController } from './production.controller.js';
import { TelemetryModule } from '../telemetry/telemetry.module.js';
import { MaintenanceModule } from '../maintenance/maintenance.module.js';
import { QualityModule } from '../quality/quality.module.js';
import { IntegrationModule } from '../integration/integration.module.js';

@Module({
  imports: [TelemetryModule, MaintenanceModule, QualityModule, IntegrationModule],
  controllers: [ProductionController],
  providers: [OrdersService, RunsService],
  exports: [OrdersService, RunsService],
})
export class ProductionModule {}
