import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IamService } from './iam.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { CreateScopeNodeDto } from './dto/create-scope-node.dto.js';
import { UpdateScopeNodeDto } from './dto/update-scope-node.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { CreateRoleAssignmentDto } from './dto/create-role-assignment.dto.js';
import { CheckPermissionDto } from './dto/check-permission.dto.js';
import { RoleAssignmentQueryDto } from './dto/iam-query.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditQueryDto } from '../audit/dto/audit-query.dto.js';

@Controller('iam')
@UseGuards(JwtAuthGuard)
export class IamController {
  constructor(
    private readonly iamService: IamService,
    private readonly auditService: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // Permissions Catalog (Developer Governed - Read Only)
  // ---------------------------------------------------------------------------

  @Get('permissions')
  async getPermissions() {
    return this.iamService.getPermissions();
  }

  // ---------------------------------------------------------------------------
  // Roles Management
  // ---------------------------------------------------------------------------

  @Get('roles')
  async getRoles() {
    return this.iamService.getRoles();
  }

  @Get('roles/:id')
  async getRole(@Param('id') id: string) {
    return this.iamService.getRole(id);
  }

  @Post('roles')
  async createRole(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: any,
  ) {
    const actorId = user?.userId || user?.id || 'system';
    return this.iamService.createRole(dto, actorId);
  }

  @Post('roles/:id/preview')
  @HttpCode(HttpStatus.OK)
  async previewRoleUpdate(
    @Param('id') id: string,
    @Body() body: { permissionIds?: string[] },
  ) {
    return this.iamService.previewRoleUpdateImpact(id, body.permissionIds);
  }

  @Put('roles/:id')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: any,
  ) {
    const actorId = user?.userId || user?.id || 'system';
    return this.iamService.updateRole(id, dto, actorId);
  }

  @Delete('roles/:id')
  async deleteRole(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const actorId = user?.userId || user?.id || 'system';
    return this.iamService.deleteRole(id, actorId);
  }

  // ---------------------------------------------------------------------------
  // Scope Nodes Tree Management
  // ---------------------------------------------------------------------------

  @Get('scope-nodes/tree')
  async getScopeTree(@Query('includeInactive') includeInactive?: string) {
    return this.iamService.getScopeTree(includeInactive === 'true');
  }

  @Get('scope-nodes/:id')
  async getScopeNode(@Param('id') id: string) {
    return this.iamService.getScopeNode(id);
  }

  @Post('scope-nodes')
  async createScopeNode(
    @Body() dto: CreateScopeNodeDto,
    @CurrentUser() user: any,
  ) {
    const actorId = user?.userId || user?.id || 'system';
    return this.iamService.createScopeNode(dto, actorId);
  }

  @Put('scope-nodes/:id')
  async updateScopeNode(
    @Param('id') id: string,
    @Body() dto: UpdateScopeNodeDto,
    @CurrentUser() user: any,
  ) {
    const actorId = user?.userId || user?.id || 'system';
    return this.iamService.updateScopeNode(id, dto, actorId);
  }

  @Delete('scope-nodes/:id')
  async deactivateScopeNode(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const actorId = user?.userId || user?.id || 'system';
    return this.iamService.deactivateScopeNode(id, actorId);
  }

  // ---------------------------------------------------------------------------
  // Role Assignments Management
  // ---------------------------------------------------------------------------

  @Get('assignments')
  async getAssignments(@Query() query: RoleAssignmentQueryDto) {
    return this.iamService.getAssignments(query);
  }

  @Post('assignments')
  async createAssignment(
    @Body() dto: CreateRoleAssignmentDto,
    @CurrentUser() user: any,
  ) {
    const actorId = user?.userId || user?.id || 'system';
    return this.iamService.createAssignment(dto, actorId);
  }

  @Delete('assignments/:id')
  async revokeAssignment(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const actorId = user?.userId || user?.id || 'system';
    return this.iamService.revokeAssignment(id, actorId);
  }

  // ---------------------------------------------------------------------------
  // Inspection & Debug Tools: Effective Access & can() Check
  // ---------------------------------------------------------------------------

  @Get('users/:id/effective-access')
  async getEffectiveAccess(
    @Param('id') userId: string,
    @Query('node_id') nodeId: string,
  ) {
    return this.iamService.getEffectiveAccess(userId, nodeId);
  }

  @Post('check')
  @HttpCode(HttpStatus.OK)
  async checkPermission(@Body() dto: CheckPermissionDto) {
    return this.iamService.can(dto.userId, dto.permission, dto.nodeId);
  }

  // ---------------------------------------------------------------------------
  // Audit Trail
  // ---------------------------------------------------------------------------

  @Get('audit-log')
  async getAuditLog(@Query() query: AuditQueryDto) {
    return this.auditService.getPaginatedLogs(query);
  }
}
