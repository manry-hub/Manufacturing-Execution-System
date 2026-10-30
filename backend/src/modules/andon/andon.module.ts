import { Module } from '@nestjs/common';
import { AndonService } from './services/andon.service.js';
import { AndonController } from './andon.controller.js';
import { TelemetryModule } from '../telemetry/telemetry.module.js';

@Module({
  imports: [TelemetryModule],
  controllers: [AndonController],
  providers: [AndonService],
  exports: [AndonService],
})
export class AndonModule {}
