import { Module } from '@nestjs/common';
import { SimulatorService } from './simulator.service.js';
import { SimulatorController } from './simulator.controller.js';
import { TelemetryModule } from '../telemetry/telemetry.module.js';

@Module({
  imports: [TelemetryModule],
  controllers: [SimulatorController],
  providers: [SimulatorService],
  exports: [SimulatorService],
})
export class SimulatorModule {}
