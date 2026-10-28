import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QualityService } from './quality.service.js';
import { CreateInspectionPlanDto } from './dto/create-inspection-plan.dto.js';
import { RecordQualityCheckDto } from './dto/record-quality-check.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('quality')
@UseGuards(JwtAuthGuard)
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Post('plans')
  async createPlan(@Body() dto: CreateInspectionPlanDto) {
    return this.qualityService.createPlan(dto);
  }

  @Get('plans')
  async findAllPlans(@Query('productId') productId?: string) {
    return this.qualityService.findAllPlans(productId);
  }

  @Get('plans/:id')
  async findPlanById(@Param('id') id: string) {
    return this.qualityService.findPlanById(id);
  }

  @Get('plans/product/:productId/active')
  async findActivePlanForProduct(@Param('productId') productId: string) {
    return this.qualityService.findActivePlanForProduct(productId);
  }

  @Post('checks')
  async recordQualityCheck(
    @Body() dto: RecordQualityCheckDto,
    @CurrentUser('userId') inspectorId: string,
  ) {
    return this.qualityService.recordQualityCheck(dto, inspectorId);
  }

  @Get('checks/run/:runId')
  async getRunChecks(@Param('runId') runId: string) {
    return this.qualityService.getRunChecks(runId);
  }

  @Get('runs/:runId/first-piece-status')
  async checkFirstPieceReleaseStatus(@Param('runId') runId: string) {
    return this.qualityService.checkFirstPieceReleaseStatus(runId);
  }
}
