import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import { SpcCalculatorService } from './services/spc-calculator.service.js';
import { FmeaAnalyticsService } from './services/fmea-analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [SpcCalculatorService, FmeaAnalyticsService],
  exports: [SpcCalculatorService, FmeaAnalyticsService],
})
export class AnalyticsModule {}
