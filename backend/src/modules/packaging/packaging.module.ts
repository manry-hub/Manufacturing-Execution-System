import { Module } from '@nestjs/common';
import { PackagingService } from './packaging.service.js';
import { PackagingController } from './packaging.controller.js';
import { NetworkPrinterService } from './services/network-printer.service.js';

@Module({
  controllers: [PackagingController],
  providers: [PackagingService, NetworkPrinterService],
  exports: [PackagingService, NetworkPrinterService],
})
export class PackagingModule {}
