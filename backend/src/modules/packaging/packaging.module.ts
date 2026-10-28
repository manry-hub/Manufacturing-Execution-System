import { Module } from '@nestjs/common';
import { PackagingService } from './packaging.service.js';
import { PackagingController } from './packaging.controller.js';

@Module({
  controllers: [PackagingController],
  providers: [PackagingService],
  exports: [PackagingService],
})
export class PackagingModule {}
