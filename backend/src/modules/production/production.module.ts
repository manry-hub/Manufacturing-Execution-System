import { Module } from '@nestjs/common';
import { OrdersService } from './services/orders.service.js';
import { RunsService } from './services/runs.service.js';
import { ProductionController } from './production.controller.js';
import { TelemetryModule } from '../telemetry/telemetry.module.js';

@Module({
  imports: [TelemetryModule],
  controllers: [ProductionController],
  providers: [OrdersService, RunsService],
  exports: [OrdersService, RunsService],
})
export class ProductionModule {}
