import { Module } from '@nestjs/common';
import { Euromap77MapperService } from './services/euromap77-mapper.service.js';
import { MqttIngestionService } from './services/mqtt-ingestion.service.js';
import { IotGatewayController } from './iot-gateway.controller.js';

@Module({
  controllers: [IotGatewayController],
  providers: [Euromap77MapperService, MqttIngestionService],
  exports: [Euromap77MapperService, MqttIngestionService],
})
export class IotGatewayModule {}
