import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: any;
  let jwtService: any;
  let auditService: any;

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: vi.fn(),
      },
      refreshToken: {
        create: vi.fn().mockResolvedValue({ id: 'rt-1' }),
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'rt-1' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      serviceAccount: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation((actions) => Promise.all(actions)),
    };

    jwtService = {
      signAsync: vi.fn().mockResolvedValue('mock_jwt_token'),
    };

    auditService = {
      record: vi.fn().mockResolvedValue({ id: 1 }),
    };

    authService = new AuthService(
      prismaService as unknown as PrismaService,
      jwtService as unknown as JwtService,
      auditService as unknown as AuditService,
    );
  });

  describe('validateUser', () => {
    it('should throw UnauthorizedException when user is not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.validateUser('nonexistent', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'u-1',
        username: 'inactive_user',
        isActive: false,
        passwordHash: 'hash',
        userRoles: [],
      });

      await expect(
        authService.validateUser('inactive_user', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      const hashed = await bcrypt.hash('correct_password', 10);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'u-1',
        username: 'valid_user',
        isActive: true,
        passwordHash: hashed,
        userRoles: [],
      });

      await expect(
        authService.validateUser('valid_user', 'wrong_password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return CurrentUserPayload with scoped assignments when credentials match', async () => {
      const rawPassword = 'StrongPassword!123';
      const hashed = await bcrypt.hash(rawPassword, 10);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'u-1',
        username: 'admin',
        email: 'admin@mes.local',
        isActive: true,
        passwordHash: hashed,
        userRoles: [
          {
            role: {
              name: 'System Administrator',
              rolePermissions: [],
            },
            scopeType: 'GLOBAL',
            scopeId: 'GLOBAL',
          },
        ],
      });

      const user = await authService.validateUser('admin', rawPassword);

      expect(user).toBeDefined();
      expect(user.userId).toBe('u-1');
      expect(user.username).toBe('admin');
      expect(user.roles).toContain('System Administrator');
      expect(user.scopes).toHaveLength(1);
    });
  });

  describe('login', () => {
    it('should return access token, refresh token, and user profile on successful authentication', async () => {
      const rawPassword = 'ValidPassword123!';
      const hashed = await bcrypt.hash(rawPassword, 10);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'u-1',
        username: 'admin',
        email: 'admin@mes.local',
        isActive: true,
        passwordHash: hashed,
        userRoles: [
          {
            role: {
              name: 'System Administrator',
              rolePermissions: [],
            },
            scopeType: 'GLOBAL',
            scopeId: 'GLOBAL',
          },
        ],
      });

      const result = await authService.login({
        username: 'admin',
        password: rawPassword,
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBe(900);
      expect(result.user.username).toBe('admin');
      expect(result.user.roles).toContain('System Administrator');
      expect(prismaService.refreshToken.create).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_LOGIN_SUCCESS' }),
      );
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if refresh token is revoked (reuse detection)', async () => {
      const tokenStr = 'some_stolen_token';
      const tokenHash = crypto.createHash('sha256').update(tokenStr).digest('hex');

      prismaService.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-compromised',
        userId: 'u-1',
        tokenHash,
        family: 'family-123',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'u-1', username: 'victim', isActive: true, userRoles: [] },
      });

      await expect(
        authService.refresh({ refreshToken: tokenStr }),
      ).rejects.toThrow(/reuse detected/i);

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { family: 'family-123' },
        data: { isRevoked: true },
      });
    });

    it('should rotate refresh token and issue new access token on valid refresh', async () => {
      const tokenStr = 'valid_token_str';
      const tokenHash = crypto.createHash('sha256').update(tokenStr).digest('hex');

      prismaService.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-valid',
        userId: 'u-1',
        tokenHash,
        family: 'family-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100000),
        user: {
          id: 'u-1',
          username: 'operator',
          isActive: true,
          userRoles: [
            {
              role: { name: 'Machine Operator', rolePermissions: [] },
              scopeType: 'MACHINE',
              scopeId: 'IMM-01',
            },
          ],
        },
      });

      const res = await authService.refresh({ refreshToken: tokenStr });

      expect(res).toBeDefined();
      expect(res.accessToken).toBe('mock_jwt_token');
      expect(res.refreshToken).toBeDefined();
      expect(res.expiresIn).toBe(900);
    });
  });

  describe('authenticateServiceAccount', () => {
    it('should issue 15-minute service JWT for valid client credentials', async () => {
      const secret = 'PpssSecret2026!';
      const hashedSecret = await bcrypt.hash(secret, 10);

      prismaService.serviceAccount.findUnique.mockResolvedValue({
        id: 'sa-1',
        name: 'PPSS',
        clientId: 'service-ppss',
        secretHash: hashedSecret,
        scopeType: 'PLANT',
        scopeId: 'PLANT-01',
        permissions: JSON.stringify(['integration.ppss.order.read', 'integration.ppss.order.write']),
        isActive: true,
      });

      const res = await authService.authenticateServiceAccount({
        clientId: 'service-ppss',
        clientSecret: secret,
      });

      expect(res).toBeDefined();
      expect(res.accessToken).toBe('mock_jwt_token');
      expect(res.tokenType).toBe('Bearer');
      expect(res.expiresIn).toBe(900);
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_SERVICE_SUCCESS' }),
      );
    });

    it('should throw UnauthorizedException for invalid secret', async () => {
      const hashedSecret = await bcrypt.hash('Secret123!', 10);
      prismaService.serviceAccount.findUnique.mockResolvedValue({
        id: 'sa-1',
        clientId: 'service-ppss',
        secretHash: hashedSecret,
        isActive: true,
      });

      await expect(
        authService.authenticateServiceAccount({
          clientId: 'service-ppss',
          clientSecret: 'WrongSecret',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke active tokens for user and log audit trail', async () => {
      const res = await authService.logout(undefined, 'u-1');
      expect(res.success).toBe(true);
      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u-1', isRevoked: false },
        data: { isRevoked: true },
      });
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_LOGOUT' }),
      );
    });
  });
});
