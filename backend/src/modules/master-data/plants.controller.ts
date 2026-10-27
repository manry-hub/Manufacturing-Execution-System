import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PlantsService } from './services/plants.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RoleEnum } from '../../common/enums/role.enum.js';
import { CreatePlantDto } from './dto/create-plant.dto.js';

@Controller('plants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  @Get()
  async findAll() {
    return this.plantsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.plantsService.findOne(id);
  }

  @Post()
  @Roles(RoleEnum.SYSTEM_ADMINISTRATOR)
  async create(@Body() createPlantDto: CreatePlantDto) {
    return this.plantsService.create(createPlantDto);
  }
}
