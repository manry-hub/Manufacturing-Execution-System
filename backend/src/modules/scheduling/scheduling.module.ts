import { Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service.js';
import { SchedulingController } from './scheduling.controller.js';
import { PrismaModule } from '../../database/prisma.module.js';
import { IntegrationModule } from '../integration/integration.module.js';

@Module({
  imports: [PrismaModule, IntegrationModule],
  controllers: [SchedulingController],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
