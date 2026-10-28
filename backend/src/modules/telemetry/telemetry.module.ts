import { Global, Module } from '@nestjs/common';
import { TelemetryIngestionService } from './telemetry.service.js';
import { TelemetryController } from './telemetry.controller.js';
import { TelemetryGateway } from './telemetry.gateway.js';

@Global()
@Module({
  controllers: [TelemetryController],
  providers: [TelemetryIngestionService, TelemetryGateway],
  exports: [TelemetryIngestionService, TelemetryGateway],
})
export class TelemetryModule {}
