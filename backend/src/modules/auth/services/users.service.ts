import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../../database/prisma.service.js';
import { AuditService } from '../../audit/audit.service.js';
import {
  CreateUserDto,
  ResetPasswordDto,
  RoleDto,
  UpdateUserDto,
  UserQueryDto,
  UserResponseDto,
} from '../dto/user-management.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: UserQueryDto): Promise<UserResponseDto[]> {
    const { search, role, isActive } = query;

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (role) {
      where.userRoles = {
        some: {
          role: {
            name: role,
          },
        },
      };
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      roles: u.userRoles.map((ur) => ur.role.name),
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.userRoles.map((ur) => ur.role.name),
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async getAllRoles(): Promise<RoleDto[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
    }));
  }

  async create(dto: CreateUserDto, currentUserId?: string): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.username }, { email: dto.email }],
      },
    });

    if (existing) {
      throw new ConflictException(
        existing.username === dto.username
          ? `Username "${dto.username}" is already registered`
          : `Email "${dto.email}" is already registered`,
      );
    }

    if (!dto.roles || dto.roles.length === 0) {
      throw new BadRequestException('At least one role must be assigned to the user');
    }

    // Verify roles exist in DB
    const matchingRoles = await this.prisma.role.findMany({
      where: {
        name: { in: dto.roles },
      },
    });

    if (matchingRoles.length !== dto.roles.length) {
      const foundNames = matchingRoles.map((r) => r.name);
      const missing = dto.roles.filter((r) => !foundNames.includes(r));
      throw new BadRequestException(`Role(s) not found: ${missing.join(', ')}`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        isActive: dto.isActive ?? true,
        userRoles: {
          create: matchingRoles.map((r) => ({
            roleId: r.id,
          })),
        },
      },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    // Record audit trail
    await this.auditService.record({
      userId: currentUserId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: newUser.id,
      oldValues: null,
      newValues: {
        username: newUser.username,
        email: newUser.email,
        roles: dto.roles,
        isActive: newUser.isActive,
      },
    });

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      roles: newUser.userRoles.map((ur) => ur.role.name),
      isActive: newUser.isActive,
      createdAt: newUser.createdAt.toISOString(),
      updatedAt: newUser.updatedAt.toISOString(),
    };
  }

  async update(id: string, dto: UpdateUserDto, currentUserId?: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    if (dto.email && dto.email !== user.email) {
      const emailConflict = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (emailConflict) {
        throw new ConflictException(`Email "${dto.email}" is already in use by another account`);
      }
    }

    const oldRoles = user.userRoles.map((ur) => ur.role.name);
    const oldValues = {
      email: user.email,
      isActive: user.isActive,
      roles: oldRoles,
    };

    // If roles changed, prepare role reassignments
    let matchingRoles: { id: string; name: string }[] | undefined;
    if (dto.roles) {
      if (dto.roles.length === 0) {
        throw new BadRequestException('At least one role must be assigned to the user');
      }
      matchingRoles = await this.prisma.role.findMany({
        where: { name: { in: dto.roles } },
      });
      if (matchingRoles.length !== dto.roles.length) {
        const found = matchingRoles.map((r) => r.name);
        const missing = dto.roles.filter((r) => !found.includes(r));
        throw new BadRequestException(`Role(s) not found: ${missing.join(', ')}`);
      }
    }

    // Prevent removal/disabling of final active System Administrator
    if (dto.isActive === false || (dto.roles && !dto.roles.includes('System Administrator'))) {
      const isAdmin = user.userRoles.some((ur) => ur.role.name === 'System Administrator');
      if (isAdmin) {
        const activeAdminCount = await this.prisma.userRoleAssignment.count({
          where: {
            role: { name: 'System Administrator' },
            user: { isActive: true },
          },
        });
        if (activeAdminCount <= 1) {
          throw new BadRequestException('Operation rejected: Cannot disable or remove the final active System Administrator');
        }
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (matchingRoles) {
        // Clear previous assignments and re-assign
        await tx.userRoleAssignment.deleteMany({
          where: { userId: id },
        });

        for (const role of matchingRoles) {
          await tx.userRoleAssignment.create({
            data: {
              userId: id,
              roleId: role.id,
              scopeType: 'GLOBAL',
              scopeId: 'GLOBAL',
            },
          });
        }
      }

      // If user is deactivated, revoke all active sessions
      if (dto.isActive === false) {
        await tx.refreshToken.updateMany({
          where: { userId: id, isRevoked: false },
          data: { isRevoked: true },
        });
      }

      return tx.user.update({
        where: { id },
        data: {
          email: dto.email ?? undefined,
          isActive: dto.isActive !== undefined ? dto.isActive : undefined,
        },
        include: {
          userRoles: {
            include: { role: true },
          },
        },
      });
    });

    const newRoles = updated.userRoles.map((ur) => ur.role.name);
    const newValues = {
      email: updated.email,
      isActive: updated.isActive,
      roles: newRoles,
    };

    // Record audit log
    await this.auditService.record({
      userId: currentUserId,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: updated.id,
      oldValues,
      newValues,
    });

    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      roles: newRoles,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async resetPassword(
    id: string,
    dto: ResetPasswordDto,
    currentUserId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    await this.auditService.record({
      userId: currentUserId,
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: id,
      oldValues: { resetInitiated: true },
      newValues: { resetCompleted: true },
    });

    return { success: true, message: `Password reset successfully for user "${user.username}"` };
  }

  async toggleActive(
    id: string,
    isActive: boolean,
    currentUserId?: string,
  ): Promise<UserResponseDto> {
    return this.update(id, { isActive }, currentUserId);
  }
}
