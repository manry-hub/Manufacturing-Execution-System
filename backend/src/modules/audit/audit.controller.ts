import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RoleEnum } from '../../common/enums/role.enum.js';
import { AuditService } from './audit.service.js';
import {
  AuditPaginatedResponseDto,
  AuditQueryDto,
  AuditStatsDto,
} from './dto/audit-query.dto.js';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(
    RoleEnum.SYSTEM_ADMINISTRATOR,
    RoleEnum.MANAGEMENT_ANALYST,
    RoleEnum.PRODUCTION_SUPERVISOR,
  )
  async getAuditLogs(@Query() query: AuditQueryDto): Promise<AuditPaginatedResponseDto> {
    return this.auditService.getPaginatedLogs(query);
  }

  @Get('stats')
  @Roles(
    RoleEnum.SYSTEM_ADMINISTRATOR,
    RoleEnum.MANAGEMENT_ANALYST,
    RoleEnum.PRODUCTION_SUPERVISOR,
  )
  async getAuditStats(): Promise<AuditStatsDto> {
    return this.auditService.getStats();
  }

  @Get('entities')
  @Roles(
    RoleEnum.SYSTEM_ADMINISTRATOR,
    RoleEnum.MANAGEMENT_ANALYST,
    RoleEnum.PRODUCTION_SUPERVISOR,
  )
  async getDistinctEntityTypes(): Promise<string[]> {
    return this.auditService.getDistinctEntityTypes();
  }

  @Get('actions')
  @Roles(
    RoleEnum.SYSTEM_ADMINISTRATOR,
    RoleEnum.MANAGEMENT_ANALYST,
    RoleEnum.PRODUCTION_SUPERVISOR,
  )
  async getDistinctActions(): Promise<string[]> {
    return this.auditService.getDistinctActions();
  }
}
