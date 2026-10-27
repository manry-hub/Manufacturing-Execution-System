import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { OeeService } from './oee.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@Controller('oee')
@UseGuards(JwtAuthGuard)
export class OeeController {
  constructor(private readonly oeeService: OeeService) {}

  @Get('machines/:identifier')
  async getMachineOee(
    @Param('identifier') identifier: string,
    @Query('window') window?: 'RUN' | 'SHIFT' | 'DAY',
  ) {
    return this.oeeService.calculateMachineOee(identifier, window ?? 'SHIFT');
  }

  @Get('plant')
  async getPlantOee(@Query('window') window?: 'SHIFT' | 'DAY') {
    return this.oeeService.calculatePlantOee(window ?? 'SHIFT');
  }

  @Get('runs/:runId')
  async getRunOee(@Param('runId') runId: string) {
    return this.oeeService.calculateRunOee(runId);
  }
}
