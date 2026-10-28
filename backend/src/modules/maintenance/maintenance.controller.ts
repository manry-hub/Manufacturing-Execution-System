import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MaintenanceService } from './maintenance.service.js';
import { CreatePmScheduleDto } from './dto/create-pm-schedule.dto.js';
import { CreateMaintenanceWorkOrderDto } from './dto/create-work-order.dto.js';
import { UpdateMaintenanceWorkOrderDto } from './dto/update-work-order.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@Controller('maintenance')
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post('schedules')
  async createSchedule(@Body() dto: CreatePmScheduleDto) {
    return this.maintenanceService.createSchedule(dto);
  }

  @Get('schedules/mold/:moldId')
  async getSchedulesByMold(@Param('moldId') moldId: string) {
    return this.maintenanceService.getSchedulesByMold(moldId);
  }

  @Post('work-orders')
  async createWorkOrder(@Body() dto: CreateMaintenanceWorkOrderDto) {
    return this.maintenanceService.createWorkOrder(dto);
  }

  @Get('work-orders')
  async findAllWorkOrders(
    @Query('moldId') moldId?: string,
    @Query('machineId') machineId?: string,
    @Query('status') status?: string,
    @Query('workType') workType?: string,
  ) {
    return this.maintenanceService.findAllWorkOrders({
      moldId,
      machineId,
      status,
      workType,
    });
  }

  @Get('work-orders/:id')
  async findOneWorkOrder(@Param('id') id: string) {
    return this.maintenanceService.findOneWorkOrder(id);
  }

  @Patch('work-orders/:id/status')
  async updateWorkOrder(
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceWorkOrderDto,
  ) {
    return this.maintenanceService.updateWorkOrder(id, dto);
  }
}
