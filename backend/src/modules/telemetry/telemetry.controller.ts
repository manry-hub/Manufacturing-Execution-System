import { Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { TelemetryIngestionService } from './telemetry.service.js';
import { NormalizedMachineEventDto } from './dto/normalized-machine-event.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryIngestionService) {}

  @Post('events')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async ingestEvent(@Body() event: NormalizedMachineEventDto) {
    return this.telemetryService.ingestEvent(event);
  }

  @Post('events/batch')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async ingestBatch(@Body() events: NormalizedMachineEventDto[]) {
    return this.telemetryService.ingestBatch(events);
  }

  @Get('machines/:identifier/latest')
  @UseGuards(JwtAuthGuard)
  async getMachineSnapshot(@Param('identifier') identifier: string) {
    return this.telemetryService.getMachineSnapshot(identifier);
  }
}
