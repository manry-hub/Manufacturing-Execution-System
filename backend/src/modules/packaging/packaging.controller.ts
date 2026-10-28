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
import { CreatePackagingUnitDto } from './dto/create-packaging-unit.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('packaging')
@UseGuards(JwtAuthGuard)
export class PackagingController {
  constructor(private readonly packagingService: PackagingService) {}

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
}
