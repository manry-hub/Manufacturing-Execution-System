import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SimulatorService } from './simulator.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import {
  SetSimulatorSpeedDto,
  ResetSimulatorDto,
  TriggerScenarioDto,
} from './dto/simulator-control.dto.js';

@Controller('simulator')
@UseGuards(JwtAuthGuard)
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) {}

  @Get('status')
  getStatus() {
    return this.simulatorService.getStatus();
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  start() {
    this.simulatorService.start();
    return { status: 'STARTED', message: 'Simulator tick loop started' };
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  stop() {
    this.simulatorService.stop();
    return { status: 'STOPPED', message: 'Simulator tick loop paused' };
  }

  @Post('speed')
  @HttpCode(HttpStatus.OK)
  setSpeed(@Body() dto: SetSimulatorSpeedDto) {
    this.simulatorService.setSpeed(dto.speedMultiplier);
    return { status: 'UPDATED', speedMultiplier: dto.speedMultiplier };
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  reset(@Body() dto: ResetSimulatorDto) {
    this.simulatorService.reset(dto.seed);
    return { status: 'RESET', message: 'Simulator reset to baseline' };
  }

  @Post('scenarios/trigger')
  @HttpCode(HttpStatus.OK)
  async triggerScenario(@Body() dto: TriggerScenarioDto) {
    return this.simulatorService.triggerScenario(dto);
  }
}
