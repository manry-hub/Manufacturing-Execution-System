import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AreasService } from './services/areas.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@Controller('areas')
@UseGuards(JwtAuthGuard)
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Get()
  async findAll(@Query('plantId') plantId?: string) {
    return this.areasService.findAll(plantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.areasService.findOne(id);
  }
}
