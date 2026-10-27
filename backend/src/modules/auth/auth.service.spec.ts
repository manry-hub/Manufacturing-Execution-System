import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../../database/prisma.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: any;
  let jwtService: any;

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: vi.fn(),
      },
    };

    jwtService = {
      signAsync: vi.fn().mockResolvedValue('mock_jwt_token'),
    };

    authService = new AuthService(
      prismaService as unknown as PrismaService,
      jwtService as unknown as JwtService,
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

    it('should return CurrentUserPayload when credentials match', async () => {
      const rawPassword = 'StrongPassword!123';
      const hashed = await bcrypt.hash(rawPassword, 10);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'u-1',
        username: 'admin',
        email: 'admin@mes.local',
        isActive: true,
        passwordHash: hashed,
        userRoles: [
          { role: { name: 'System Administrator' } },
        ],
      });

      const user = await authService.validateUser('admin', rawPassword);

      expect(user).toBeDefined();
      expect(user.userId).toBe('u-1');
      expect(user.username).toBe('admin');
      expect(user.roles).toContain('System Administrator');
    });
  });

  describe('login', () => {
    it('should return access token and user profile on successful authentication', async () => {
      const rawPassword = 'ValidPassword123!';
      const hashed = await bcrypt.hash(rawPassword, 10);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'u-1',
        username: 'admin',
        email: 'admin@mes.local',
        isActive: true,
        passwordHash: hashed,
        userRoles: [
          { role: { name: 'System Administrator' } },
        ],
      });

      const result = await authService.login({
        username: 'admin',
        password: rawPassword,
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.user.username).toBe('admin');
      expect(result.user.roles).toContain('System Administrator');
    });
  });
});
