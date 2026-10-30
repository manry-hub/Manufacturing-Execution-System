import { Module } from '@nestjs/common';
import { QualityService } from './quality.service.js';
import { QualityController } from './quality.controller.js';

@Module({
  controllers: [QualityController],
  providers: [QualityService],
  exports: [QualityService],
})
export class QualityModule {}
