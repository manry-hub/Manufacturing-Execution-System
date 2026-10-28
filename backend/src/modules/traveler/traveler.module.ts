import { Module } from '@nestjs/common';
import { TravelerService } from './traveler.service.js';
import { TravelerController } from './traveler.controller.js';

@Module({
  controllers: [TravelerController],
  providers: [TravelerService],
  exports: [TravelerService],
})
export class TravelerModule {}
