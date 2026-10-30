import { Module } from '@nestjs/common';
import { Euromap77MapperService } from './services/euromap77-mapper.service.js';
import { MqttIngestionService } from './services/mqtt-ingestion.service.js';
import { ModbusTcpGatewayService } from './services/modbus-tcp-gateway.service.js';
import { IngestSourceSelectorService } from './services/ingest-source-selector.service.js';
import { OpcUaClientDaemonService } from './services/opcua-client-daemon.service.js';
import { IotGatewayController } from './iot-gateway.controller.js';
import { TelemetryModule } from '../telemetry/telemetry.module.js';

@Module({
  imports: [TelemetryModule],
  controllers: [IotGatewayController],
  providers: [
    Euromap77MapperService,
    MqttIngestionService,
    ModbusTcpGatewayService,
    IngestSourceSelectorService,
    OpcUaClientDaemonService,
  ],
  exports: [
    Euromap77MapperService,
    MqttIngestionService,
    ModbusTcpGatewayService,
    IngestSourceSelectorService,
    OpcUaClientDaemonService,
  ],
})
export class IotGatewayModule {}
