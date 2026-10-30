import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RoleEnum } from '../../common/enums/role.enum.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import {
  CreateUserDto,
  ResetPasswordDto,
  RoleDto,
  UpdateUserDto,
  UserQueryDto,
  UserResponseDto,
} from './dto/user-management.dto.js';
import { UsersService } from './services/users.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(
    RoleEnum.SYSTEM_ADMINISTRATOR,
    RoleEnum.MANAGEMENT_ANALYST,
    RoleEnum.PRODUCTION_SUPERVISOR,
  )
  async findAll(@Query() query: UserQueryDto): Promise<UserResponseDto[]> {
    return this.usersService.findAll(query);
  }

  @Get('roles')
  async getAllRoles(): Promise<RoleDto[]> {
    return this.usersService.getAllRoles();
  }

  @Get(':id')
  @Roles(
    RoleEnum.SYSTEM_ADMINISTRATOR,
    RoleEnum.MANAGEMENT_ANALYST,
    RoleEnum.PRODUCTION_SUPERVISOR,
  )
  async findById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findById(id);
  }

  @Post()
  @Roles(RoleEnum.SYSTEM_ADMINISTRATOR)
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<UserResponseDto> {
    return this.usersService.create(dto, user.userId);
  }

  @Put(':id')
  @Roles(RoleEnum.SYSTEM_ADMINISTRATOR)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto, user.userId);
  }

  @Put(':id/reset-password')
  @Roles(RoleEnum.SYSTEM_ADMINISTRATOR)
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ success: boolean; message: string }> {
    return this.usersService.resetPassword(id, dto, user.userId);
  }

  @Patch(':id/status')
  @Roles(RoleEnum.SYSTEM_ADMINISTRATOR)
  async toggleActive(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<UserResponseDto> {
    return this.usersService.toggleActive(id, isActive, user.userId);
  }
}
