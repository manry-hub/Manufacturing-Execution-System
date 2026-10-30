import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MachinesService } from './services/machines.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@Controller('machines')
@UseGuards(JwtAuthGuard)
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Get()
  async findAll(@Query('areaId') areaId?: string) {
    return this.machinesService.findAll(areaId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.machinesService.findOne(id);
  }
}
