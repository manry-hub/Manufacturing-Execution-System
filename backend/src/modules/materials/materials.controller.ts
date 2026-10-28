import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MaterialsService } from './materials.service.js';
import { CreateMaterialDto } from './dto/create-material.dto.js';
import { CreateMaterialLotDto } from './dto/create-material-lot.dto.js';
import { LoadHopperDto } from './dto/load-hopper.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('materials')
@UseGuards(JwtAuthGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post()
  async createMaterial(@Body() dto: CreateMaterialDto) {
    return this.materialsService.createMaterial(dto);
  }

  @Get()
  async findAllMaterials() {
    return this.materialsService.findAllMaterials();
  }

  @Get(':id')
  async findOneMaterial(@Param('id') id: string) {
    return this.materialsService.findOneMaterial(id);
  }

  @Post('lots')
  async createLot(@Body() dto: CreateMaterialLotDto) {
    return this.materialsService.createLot(dto);
  }

  @Get('lots/list')
  async findAllLots(
    @Query('materialId') materialId?: string,
    @Query('status') status?: string,
  ) {
    return this.materialsService.findAllLots(materialId, status);
  }

  @Get('lots/detail/:lotNumber')
  async findLotByNumber(@Param('lotNumber') lotNumber: string) {
    return this.materialsService.findLotByNumber(lotNumber);
  }

  @Post('hopper-load')
  async loadHopper(
    @Body() dto: LoadHopperDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.materialsService.loadHopper(dto, userId);
  }

  @Get('genealogy/run/:runId')
  async getRunGenealogy(@Param('runId') runId: string) {
    return this.materialsService.getRunGenealogy(runId);
  }

  @Get('genealogy/lot/:lotNumber')
  async getLotGenealogy(@Param('lotNumber') lotNumber: string) {
    return this.materialsService.getLotGenealogy(lotNumber);
  }
}
