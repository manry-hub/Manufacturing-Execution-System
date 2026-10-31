import {
  Injectable,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { ClientCredentialsDto } from './dto/client-credentials.dto.js';
import { CurrentUserPayload, ScopedAssignment } from '../../common/decorators/current-user.decorator.js';
import { CANONICAL_PERMISSIONS } from '../../common/constants/permissions.constant.js';
import { RoleEnum } from '../../common/enums/role.enum.js';

interface FailedAttemptTracker {
  count: number;
  blockedUntil?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly loginAttempts = new Map<string, FailedAttemptTracker>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  private checkRateLimit(key: string): void {
    const record = this.loginAttempts.get(key);
    if (!record) return;

    if (record.blockedUntil && Date.now() < record.blockedUntil) {
      const waitMinutes = Math.ceil((record.blockedUntil - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Too many failed attempts. Account temporarily throttled. Please try again in ${waitMinutes} minute(s).`,
      );
    }
  }

  private recordFailedAttempt(key: string): void {
    const now = Date.now();
    const record = this.loginAttempts.get(key) || { count: 0 };
    record.count += 1;

    // After 5 failed attempts, throttle for 5 minutes
    if (record.count >= 5) {
      record.blockedUntil = now + 5 * 60 * 1000;
      this.logger.warn(`Rate limit triggered for key ${key}. Throttled for 5 minutes.`);
    }

    this.loginAttempts.set(key, record);
  }

  private clearFailedAttempts(key: string): void {
    this.loginAttempts.delete(key);
  }

  async validateUser(
    username: string,
    pass: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<CurrentUserPayload> {
    const rateLimitKey = `${username}:${ipAddress || 'unknown'}`;
    this.checkRateLimit(rateLimitKey);

    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      this.recordFailedAttempt(rateLimitKey);
      await this.auditService.record({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        entityId: username,
        actor: username,
        status: 'FAILED',
        newValues: { reason: 'User not found or inactive' },
        ipAddress,
        userAgent,
      });
      // Generic error per AUTHENTICATION.md
      throw new UnauthorizedException('Invalid credentials or account inactive');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      this.recordFailedAttempt(rateLimitKey);
      await this.auditService.record({
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        actor: username,
        status: 'FAILED',
        newValues: { reason: 'Password mismatch' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials or account inactive');
    }

    this.clearFailedAttempts(rateLimitKey);

    const roles: string[] = [];
    const permissionSet = new Set<string>();
    const scopes: ScopedAssignment[] = [];

    const isSystemAdmin = user.userRoles.some(
      (ur) => ur.role.name === RoleEnum.SYSTEM_ADMINISTRATOR || ur.role.name === 'System Administrator',
    );

    for (const ur of user.userRoles) {
      roles.push(ur.role.name);
      scopes.push({
        role: ur.role.name,
        scopeType: (ur.scopeType as any) || 'GLOBAL',
        scopeId: ur.scopeId || 'GLOBAL',
      });

      if (ur.role.rolePermissions) {
        for (const rp of ur.role.rolePermissions) {
          if (rp.permission?.key) {
            permissionSet.add(rp.permission.key);
          }
        }
      }
    }

    // System Administrator globally possesses every permission
    if (isSystemAdmin) {
      for (const p of CANONICAL_PERMISSIONS) {
        permissionSet.add(p.key);
      }
    }

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      roles,
      permissions: Array.from(permissionSet),
      scopes,
      principalType: 'HUMAN',
    };
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.validateUser(loginDto.username, loginDto.password, ipAddress, userAgent);

    const payload = {
      sub: user.userId,
      username: user.username,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      scopes: user.scopes,
      principalType: 'HUMAN',
    };

    // 15-minute Access Token
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });

    // Generate secure opaque refresh token
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const family = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId: user.userId,
        tokenHash,
        family,
        expiresAt,
      },
    });

    await this.auditService.record({
      userId: user.userId,
      action: 'AUTH_LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.userId,
      actor: user.username,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 900, // 15 minutes
      user: {
        id: user.userId,
        username: user.username,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions,
        scopes: user.scopes,
      },
    };
  }

  async refresh(dto: RefreshTokenDto, ipAddress?: string, userAgent?: string) {
    if (!dto.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse detection: If token was already revoked, someone is replaying a stolen token!
    if (tokenRecord.isRevoked) {
      await this.prisma.refreshToken.updateMany({
        where: { family: tokenRecord.family },
        data: { isRevoked: true },
      });

      await this.auditService.record({
        userId: tokenRecord.userId,
        action: 'AUTH_TOKEN_REUSE_DETECTED',
        entityType: 'RefreshToken',
        entityId: tokenRecord.id,
        actor: tokenRecord.user?.username || tokenRecord.userId,
        status: 'REVOKED',
        newValues: { family: tokenRecord.family },
        ipAddress,
        userAgent,
      });

      throw new UnauthorizedException('Compromised session: Token reuse detected. All sessions revoked.');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!tokenRecord.user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Rotate: Revoke the current token and issue a successor within the same family
    const nextRawToken = crypto.randomBytes(40).toString('hex');
    const nextTokenHash = crypto.createHash('sha256').update(nextRawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          isRevoked: true,
          replacedBy: nextTokenHash,
        },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: tokenRecord.userId,
          tokenHash: nextTokenHash,
          family: tokenRecord.family,
          expiresAt,
        },
      }),
    ]);

    const user = tokenRecord.user;
    const roles: string[] = [];
    const permissionSet = new Set<string>();
    const scopes: ScopedAssignment[] = [];

    const isSystemAdmin = user.userRoles.some(
      (ur) => ur.role.name === RoleEnum.SYSTEM_ADMINISTRATOR || ur.role.name === 'System Administrator',
    );

    for (const ur of user.userRoles) {
      roles.push(ur.role.name);
      scopes.push({
        role: ur.role.name,
        scopeType: (ur.scopeType as any) || 'GLOBAL',
        scopeId: ur.scopeId || 'GLOBAL',
      });

      if (ur.role.rolePermissions) {
        for (const rp of ur.role.rolePermissions) {
          if (rp.permission?.key) {
            permissionSet.add(rp.permission.key);
          }
        }
      }
    }

    if (isSystemAdmin) {
      for (const p of CANONICAL_PERMISSIONS) {
        permissionSet.add(p.key);
      }
    }

    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles,
      permissions: Array.from(permissionSet),
      scopes,
      principalType: 'HUMAN',
    };

    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });

    await this.auditService.record({
      userId: user.id,
      action: 'AUTH_TOKEN_REFRESH',
      entityType: 'RefreshToken',
      entityId: tokenRecord.id,
      actor: user.username,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken: nextRawToken,
      expiresIn: 900,
    };
  }

  async logout(dto?: RefreshTokenDto, userId?: string, ipAddress?: string, userAgent?: string) {
    if (dto?.refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { isRevoked: true },
      });
    } else if (userId) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    if (userId) {
      await this.auditService.record({
        userId,
        action: 'AUTH_LOGOUT',
        entityType: 'User',
        entityId: userId,
        actor: userId,
        status: 'SUCCESS',
        ipAddress,
        userAgent,
      });
    }

    return {
      success: true,
      message: 'Successfully logged out',
    };
  }

  async authenticateServiceAccount(
    dto: ClientCredentialsDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const serviceAccount = await this.prisma.serviceAccount.findUnique({
      where: { clientId: dto.clientId },
    });

    if (!serviceAccount || !serviceAccount.isActive) {
      await this.auditService.record({
        principalType: 'SERVICE',
        action: 'AUTH_SERVICE_FAILED',
        entityType: 'ServiceAccount',
        entityId: dto.clientId,
        actor: dto.clientId,
        status: 'FAILED',
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid client credentials or inactive service account');
    }

    const isMatch = await bcrypt.compare(dto.clientSecret, serviceAccount.secretHash);
    if (!isMatch) {
      await this.auditService.record({
        principalType: 'SERVICE',
        action: 'AUTH_SERVICE_FAILED',
        entityType: 'ServiceAccount',
        entityId: serviceAccount.id,
        actor: dto.clientId,
        status: 'FAILED',
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid client credentials');
    }

    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = JSON.parse(serviceAccount.permissions);
    } catch {
      parsedPermissions = serviceAccount.permissions.split(';').map((p) => p.trim());
    }

    const payload = {
      sub: serviceAccount.id,
      username: serviceAccount.name,
      roles: ['Service Account'],
      permissions: parsedPermissions,
      scopes: [
        {
          role: 'Service Account',
          scopeType: serviceAccount.scopeType as any,
          scopeId: serviceAccount.scopeId,
        },
      ],
      principalType: 'SERVICE',
    };

    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });

    await this.auditService.record({
      principalType: 'SERVICE',
      action: 'AUTH_SERVICE_SUCCESS',
      entityType: 'ServiceAccount',
      entityId: serviceAccount.id,
      actor: serviceAccount.clientId,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      scope: serviceAccount.scopeType,
    };
  }
}
