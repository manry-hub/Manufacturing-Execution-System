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

@Controller('production')
@UseGuards(JwtAuthGuard)
export class ProductionController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly runsService: RunsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Production Orders Endpoints
  // ---------------------------------------------------------------------------

  @Post('orders')
  async createOrder(@Body() dto: CreateProductionOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get('orders')
  async findAllOrders(
    @Query('status') status?: string,
    @Query('productId') productId?: string,
  ) {
    return this.ordersService.findAll({ status, productId });
  }

  @Get('orders/:id')
  async findOneOrder(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch('orders/:id/release')
  async releaseOrder(@Param('id') id: string) {
    return this.ordersService.release(id);
  }

  @Patch('orders/:id/cancel')
  async cancelOrder(@Param('id') id: string) {
    return this.ordersService.cancel(id);
  }

  // ---------------------------------------------------------------------------
  // Production Runs Endpoints
  // ---------------------------------------------------------------------------

  @Post('runs/start')
  async startRun(@Body() dto: StartProductionRunDto) {
    return this.runsService.startRun(dto);
  }

  @Get('runs')
  async findAllRuns(
    @Query('machineId') machineId?: string,
    @Query('status') status?: string,
    @Query('productionOrderId') productionOrderId?: string,
  ) {
    return this.runsService.findAll({ machineId, status, productionOrderId });
  }

  @Get('runs/active/:machineId')
  async findActiveRun(@Param('machineId') machineId: string) {
    return this.runsService.findActiveByMachine(machineId);
  }

  @Get('runs/:id')
  async findOneRun(@Param('id') id: string) {
    return this.runsService.findOne(id);
  }

  @Post('runs/:id/pause')
  @HttpCode(HttpStatus.OK)
  async pauseRun(@Param('id') id: string) {
    return this.runsService.pauseRun(id);
  }

  @Post('runs/:id/resume')
  @HttpCode(HttpStatus.OK)
  async resumeRun(@Param('id') id: string) {
    return this.runsService.resumeRun(id);
  }

  @Post('runs/:id/complete')
  @HttpCode(HttpStatus.OK)
  async completeRun(@Param('id') id: string) {
    return this.runsService.completeRun(id);
  }

  @Post('runs/:id/scrap')
  @HttpCode(HttpStatus.OK)
  async recordScrap(
    @Param('id') id: string,
    @Body() dto: RecordScrapDto,
  ) {
    return this.runsService.recordScrap(id, dto);
  }
}
