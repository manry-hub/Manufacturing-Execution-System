import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TravelerService } from './traveler.service.js';
import { SignoffTravelerDto } from './dto/signoff-traveler.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@Controller('traveler')
@UseGuards(JwtAuthGuard)
export class TravelerController {
  constructor(private readonly travelerService: TravelerService) {}

  @Get('runs')
  async getTravelerRuns() {
    return this.travelerService.getTravelerRuns();
  }

  @Get(':runId')
  async getDigitalTraveler(@Param('runId') runId: string) {
    return this.travelerService.getDigitalTraveler(runId);
  }

  @Post(':runId/signoff')
  async signoffTraveler(
    @Param('runId') runId: string,
    @Body() dto: SignoffTravelerDto,
  ) {
    return this.travelerService.signoffTraveler(runId, dto);
  }

  @Get(':runId/coc')
  async getCertificateOfConformance(@Param('runId') runId: string) {
    return this.travelerService.getCertificateOfConformance(runId);
  }
}
