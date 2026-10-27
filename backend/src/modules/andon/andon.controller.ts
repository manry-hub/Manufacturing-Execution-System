import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AndonService } from './services/andon.service.js';
import { CreateAndonTicketDto, ResolveAndonTicketDto } from './dto/create-andon-ticket.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser, type CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';

@Controller('andon')
@UseGuards(JwtAuthGuard)
export class AndonController {
  constructor(private readonly andonService: AndonService) {}

  @Get('tickets')
  async findAll(
    @Query('machineId') machineId?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.andonService.findAll({ machineId, status, category });
  }

  @Post('tickets')
  async createTicket(
    @Body() dto: CreateAndonTicketDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.andonService.createTicket(dto, user.userId);
  }

  @Get('tickets/:id')
  async findOne(@Param('id') id: string) {
    return this.andonService.findOne(id);
  }

  @Post('tickets/:id/acknowledge')
  @HttpCode(HttpStatus.OK)
  async acknowledge(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.andonService.acknowledgeTicket(id, user.userId);
  }

  @Post('tickets/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolve(
    @Param('id') id: string,
    @Body() dto: ResolveAndonTicketDto,
  ) {
    return this.andonService.resolveTicket(id, dto);
  }

  @Get('analytics/pareto')
  async getPareto() {
    return this.andonService.getParetoAnalytics();
  }

  @Get('analytics/mttr')
  async getMttr() {
    return this.andonService.getMttrAnalytics();
  }
}
