import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PackagingService } from './packaging.service.js';
import { NetworkPrinterService, type CartonLabelData } from './services/network-printer.service.js';
import { CreatePackagingUnitDto } from './dto/create-packaging-unit.dto.js';
import { PrintCartonLabelDto, TestPrinterDto } from './dto/print-label.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('packaging')
@UseGuards(JwtAuthGuard)
export class PackagingController {
  constructor(
    private readonly packagingService: PackagingService,
    private readonly printerService: NetworkPrinterService,
  ) {}

  @Post('units')
  async createPackagingUnit(
    @Body() dto: CreatePackagingUnitDto,
    @CurrentUser('userId') packagerId: string,
  ) {
    return this.packagingService.createPackagingUnit(dto, packagerId);
  }

  @Get('units')
  async findAllUnits(
    @Query('runId') runId?: string,
    @Query('palletId') palletId?: string,
  ) {
    return this.packagingService.findAllUnits(runId, palletId);
  }

  @Get('reconcile/run/:runId')
  async reconcileRun(@Param('runId') runId: string) {
    return this.packagingService.reconcileRun(runId);
  }

  @Get('printers')
  getRegisteredPrinters() {
    return this.printerService.getRegisteredPrinters();
  }

  @Post('printers/test')
  async testPrinter(@Body() dto: TestPrinterDto) {
    const isOnline = await this.printerService.pingPrinter(dto.printerIp, dto.printerPort ?? 9100);
    if (!isOnline) {
      return {
        success: false,
        isOnline: false,
        message: `Printer at ${dto.printerIp}:${dto.printerPort ?? 9100} is unreachable`,
      };
    }
    const result = await this.printerService.printTestLabel(dto.printerIp, dto.printerPort ?? 9100);
    return {
      ...result,
      isOnline: true,
    };
  }

  @Get('cartons/:barcode/zpl')
  async getCartonZpl(@Param('barcode') barcode: string) {
    const unit = await this.packagingService.findUnitByBarcode(barcode);
    const labelData: CartonLabelData = {
      barcode: unit.barcode,
      orderNumber: unit.run.productionOrder.orderNumber,
      partNumber: unit.run.productionOrder.product.partNumber,
      productName: unit.run.productionOrder.product.name,
      partCount: unit.partCount,
      palletId: unit.palletId,
      machineCode: unit.run.machine.code,
      moldCode: unit.run.mold.code,
      packagerUsername: unit.packager?.username || 'Operator',
      packedAt: unit.packedAt.toISOString(),
      disposition: 'RELEASED',
    };

    const zpl = this.printerService.generateCartonZpl(labelData);
    return { barcode, zpl };
  }

  @Post('printers/print-carton')
  async printCartonLabel(@Body() dto: PrintCartonLabelDto) {
    const unit = await this.packagingService.findUnitByBarcode(dto.barcode);
    const labelData: CartonLabelData = {
      barcode: unit.barcode,
      orderNumber: unit.run.productionOrder.orderNumber,
      partNumber: unit.run.productionOrder.product.partNumber,
      productName: unit.run.productionOrder.product.name,
      partCount: unit.partCount,
      palletId: unit.palletId,
      machineCode: unit.run.machine.code,
      moldCode: unit.run.mold.code,
      packagerUsername: unit.packager?.username || 'Operator',
      packedAt: unit.packedAt.toISOString(),
      disposition: 'RELEASED',
    };

    const zpl = this.printerService.generateCartonZpl(labelData, dto.copies ?? 1);
    const targetIp = dto.printerIp || '10.20.10.80';
    const targetPort = dto.printerPort || 9100;

    return this.printerService.printRawSocket(targetIp, targetPort, zpl);
  }
}
