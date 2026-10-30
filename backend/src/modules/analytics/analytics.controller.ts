import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { SpcCalculatorService } from './services/spc-calculator.service.js';
import { FmeaAnalyticsService } from './services/fmea-analytics.service.js';
import {
  CycleTimeDistributionResponseDto,
  CycleTimeQueryDto,
  FmeaQueryDto,
  FmeaResponseDto,
  SpcQueryDto,
  SpcResponseDto,
} from './dto/analytics.dto.js';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly spcService: SpcCalculatorService,
    private readonly fmeaService: FmeaAnalyticsService,
  ) {}

  @Get('spc')
  async getSpc(@Query() query: SpcQueryDto): Promise<SpcResponseDto> {
    return this.spcService.calculateSpc(query);
  }

  @Get('fmea')
  async getFmea(@Query() query: FmeaQueryDto): Promise<FmeaResponseDto> {
    return this.fmeaService.getFmeaAnalysis(query);
  }

  @Get('cycle-time-distribution')
  async getCycleTimeDistribution(
    @Query() query: CycleTimeQueryDto,
  ): Promise<CycleTimeDistributionResponseDto> {
    return this.fmeaService.getCycleTimeDistribution(query);
  }
}
