import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MoldsService } from './services/molds.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@Controller('molds')
@UseGuards(JwtAuthGuard)
export class MoldsController {
  constructor(private readonly moldsService: MoldsService) {}

  @Get()
  async findAll() {
    return this.moldsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.moldsService.findOne(id);
  }
}
