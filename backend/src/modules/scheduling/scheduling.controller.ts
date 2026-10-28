import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SchedulingService } from './scheduling.service.js';
import { ScheduleOrderDto } from './dto/schedule-order.dto.js';
import { RescheduleSlotDto } from './dto/reschedule-slot.dto.js';
import { UpsertChangeoverDto } from './dto/upsert-changeover.dto.js';
import { ScheduleQueryDto } from './dto/schedule-query.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@Controller('scheduling')
@UseGuards(JwtAuthGuard)
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get('timeline')
  async getTimeline(@Query() query: ScheduleQueryDto) {
    return this.schedulingService.getTimeline(query);
  }

  @Get('backlog')
  async getBacklog() {
    return this.schedulingService.getBacklog();
  }

  @Post('orders/:id/schedule')
  async scheduleOrder(
    @Param('id') id: string,
    @Body() dto: ScheduleOrderDto,
  ) {
    return this.schedulingService.scheduleOrder(id, dto);
  }

  @Patch('orders/:id/reschedule')
  async rescheduleOrder(
    @Param('id') id: string,
    @Body() dto: RescheduleSlotDto,
  ) {
    return this.schedulingService.rescheduleOrder(id, dto);
  }

  @Post('orders/:id/unschedule')
  async unscheduleOrder(@Param('id') id: string) {
    return this.schedulingService.unscheduleOrder(id);
  }

  @Post('orders/:id/release')
  async releaseOrder(@Param('id') id: string) {
    return this.schedulingService.releaseOrder(id);
  }

  @Get('changeovers')
  async getMoldChangeovers() {
    return this.schedulingService.getMoldChangeovers();
  }

  @Put('changeovers')
  async upsertMoldChangeover(@Body() dto: UpsertChangeoverDto) {
    return this.schedulingService.upsertMoldChangeover(dto);
  }
}
