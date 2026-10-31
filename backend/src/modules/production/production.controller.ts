import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './services/orders.service.js';
import { RunsService } from './services/runs.service.js';
import { CreateProductionOrderDto } from './dto/create-production-order.dto.js';
import { StartProductionRunDto } from './dto/start-production-run.dto.js';
import { RecordScrapDto } from './dto/record-scrap.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { ScopeGuard } from '../../common/guards/scope.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { RequireScope } from '../../common/decorators/scope.decorator.js';
import { ScopeTypeEnum } from '../../common/enums/scope-type.enum.js';

@Controller('production')
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
export class ProductionController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly runsService: RunsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Production Orders Endpoints
  // ---------------------------------------------------------------------------

  @Post('orders')
  @RequirePermissions('production.order.read')
  async createOrder(@Body() dto: CreateProductionOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get('orders')
  @RequirePermissions('production.order.read')
  async findAllOrders(
    @Query('status') status?: string,
    @Query('productId') productId?: string,
  ) {
    return this.ordersService.findAll({ status, productId });
  }

  @Get('orders/:id')
  @RequirePermissions('production.order.read')
  async findOneOrder(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch('orders/:id/release')
  @RequirePermissions('production.order.read')
  async releaseOrder(@Param('id') id: string) {
    return this.ordersService.release(id);
  }

  @Patch('orders/:id/cancel')
  @RequirePermissions('production.order.read')
  async cancelOrder(@Param('id') id: string) {
    return this.ordersService.cancel(id);
  }

  @Get('orders/:id/steps')
  @RequirePermissions('production.order.read')
  async findOrderSteps(@Param('id') id: string) {
    return this.ordersService.findOrderSteps(id);
  }

  @Patch('orders/:id/steps/:stepId')
  @RequirePermissions('production.order.read')
  async updateStepProgress(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body()
    body: {
      status?: string;
      quantityIn?: number;
      quantityPassed?: number;
      quantityScrapped?: number;
    },
  ) {
    return this.ordersService.updateStepProgress(id, stepId, body);
  }

  // ---------------------------------------------------------------------------
  // Production Runs Endpoints
  // ---------------------------------------------------------------------------

  @Post('runs/start')
  @RequirePermissions('production.run.start_stop')
  @RequireScope(ScopeTypeEnum.MACHINE, 'machineId')
  async startRun(@Body() dto: StartProductionRunDto) {
    return this.runsService.startRun(dto);
  }

  @Get('runs')
  @RequirePermissions('production.order.read')
  async findAllRuns(
    @Query('machineId') machineId?: string,
    @Query('status') status?: string,
    @Query('productionOrderId') productionOrderId?: string,
  ) {
    return this.runsService.findAll({ machineId, status, productionOrderId });
  }

  @Get('runs/active/:machineId')
  @RequirePermissions('production.order.read')
  async findActiveRun(@Param('machineId') machineId: string) {
    return this.runsService.findActiveByMachine(machineId);
  }

  @Get('runs/:id')
  @RequirePermissions('production.order.read')
  async findOneRun(@Param('id') id: string) {
    return this.runsService.findOne(id);
  }

  @Post('runs/:id/pause')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('production.run.start_stop')
  async pauseRun(@Param('id') id: string) {
    return this.runsService.pauseRun(id);
  }

  @Post('runs/:id/resume')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('production.run.start_stop')
  async resumeRun(@Param('id') id: string) {
    return this.runsService.resumeRun(id);
  }

  @Post('runs/:id/release-to-active')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('production.run.start_stop')
  async releaseRunToActive(@Param('id') id: string) {
    return this.runsService.releaseRunToActive(id);
  }

  @Post('runs/:id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('production.run.start_stop')
  async completeRun(@Param('id') id: string) {
    return this.runsService.completeRun(id);
  }

  @Post('runs/:id/scrap')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('production.scrap.record')
  async recordScrap(
    @Param('id') id: string,
    @Body() dto: RecordScrapDto,
  ) {
    return this.runsService.recordScrap(id, dto);
  }
}
