import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { MqttIngestionService } from './services/mqtt-ingestion.service.js';

@Controller('api/v1/iot-gateway')
export class IotGatewayController {
  constructor(private readonly mqttIngestion: MqttIngestionService) {}

  @Get('status')
  getStatus() {
    return this.mqttIngestion.getStatus();
  }

  @Get('packets')
  getRecentPackets(
    @Query('machineCode') machineCode?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.mqttIngestion.getRecentPackets(machineCode, parsedLimit);
  }

  @UseGuards(JwtAuthGuard)
  @Post('test-publish')
  async publishTestPacket(
    @Body() body: { topic: string; payload: Record<string, any> },
  ) {
    const topic = body.topic || 'factory/plant-1/IMM-01/euromap77';
    return this.mqttIngestion.publishTestPacket(topic, body.payload || {});
  }

  @UseGuards(JwtAuthGuard)
  @Post('simulate-euromap77')
  async simulateEuromap77(
    @Body()
    body: {
      machineCode?: string;
      cycleTime?: number;
      injectionTime?: number;
      cushion?: number;
      peakInjectionPressure?: number;
      clampingForce?: number;
      barrelTemperatures?: number[];
      machineStatus?: string;
    },
  ) {
    const machineCode = body.machineCode || 'IMM-01';
    const topic = `factory/plant-1/${machineCode}/euromap77`;

    const payload = {
      timestamp: new Date().toISOString(),
      machineCode,
      protocol: 'EUROMAP_77',
      version: '1.0',
      cyclicParameters: {
        cycleTime: body.cycleTime ?? 22.4,
        injectionTime: body.injectionTime ?? 3.8,
        cushion: body.cushion ?? 4.25,
        peakInjectionPressure: body.peakInjectionPressure ?? 136.2,
      },
      clampingUnit: {
        clampingForce: body.clampingForce ?? 1470.0,
        mouldStatus: 'CLOSED',
      },
      heatingZones: {
        zoneTemperatures: body.barrelTemperatures ?? [205.1, 215.4, 228.2, 230.0],
        nozzleTemperature: 232.0,
      },
      production: {
        totalParts: 1420,
        goodParts: 1390,
        badParts: 30,
      },
      machineStatus: body.machineStatus ?? 'RUNNING',
      activeFault: null,
    };

    return this.mqttIngestion.publishTestPacket(topic, payload);
  }
}
