import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService } from './users.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { AuditService } from '../../audit/audit.service.js';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      role: {
        findMany: vi.fn(),
      },
      userRoleAssignment: {
        deleteMany: vi.fn(),
        create: vi.fn(),
        count: vi.fn().mockResolvedValue(2),
      },
      refreshToken: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: vi.fn(async (arg) => (typeof arg === 'function' ? arg(mockPrisma) : Promise.all(arg))),
    };

    mockAudit = {
      record: vi.fn().mockResolvedValue({ id: 1 }),
    };

    service = new UsersService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AuditService,
    );
  });

  describe('findAll', () => {
    it('should return list of mapped users with role names', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u-1',
          username: 'john',
          email: 'john@example.com',
          isActive: true,
          createdAt: new Date('2026-10-01'),
          updatedAt: new Date('2026-10-02'),
          userRoles: [{ role: { name: 'Production Supervisor' } }],
        },
      ]);

      const result = await service.findAll({});
      expect(result.length).toBe(1);
      expect(result[0].username).toBe('john');
      expect(result[0].roles).toEqual(['Production Supervisor']);
      expect(result[0].isActive).toBe(true);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should return user details if found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        username: 'admin',
        email: 'admin@mes.local',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        userRoles: [{ role: { name: 'System Administrator' } }],
      });

      const user = await service.findById('u-1');
      expect(user.id).toBe('u-1');
      expect(user.roles).toContain('System Administrator');
    });
  });

  describe('create', () => {
    it('should throw ConflictException if username or email already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ username: 'existing' });

      await expect(
        service.create({
          username: 'existing',
          email: 'test@example.com',
          password: 'password123',
          roles: ['Machine Operator'],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if roles array is empty', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.create({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123',
          roles: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create user, hash password, assign roles, and record audit log', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.role.findMany.mockResolvedValue([
        { id: 'r-1', name: 'Machine Operator' },
      ]);
      mockPrisma.user.create.mockResolvedValue({
        id: 'u-created',
        username: 'operator2',
        email: 'op2@mes.local',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        userRoles: [{ role: { name: 'Machine Operator' } }],
      });

      const result = await service.create(
        {
          username: 'operator2',
          email: 'op2@mes.local',
          password: 'password123',
          roles: ['Machine Operator'],
          isActive: true,
        },
        'admin-user-id',
      );

      expect(result.id).toBe('u-created');
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: 'u-created',
          userId: 'admin-user-id',
        }),
      );
    });
  });

  describe('resetPassword', () => {
    it('should update passwordHash and record audit log', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1', username: 'john' });
      mockPrisma.user.update.mockResolvedValue({});

      const res = await service.resetPassword('u-1', { newPassword: 'newSecretPassword123' }, 'admin-id');
      expect(res.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PASSWORD_RESET',
          entityType: 'User',
          entityId: 'u-1',
        }),
      );
    });
  });

  describe('toggleActive', () => {
    it('should toggle user active status and record audit log', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'u1@mes.local',
        isActive: true,
        userRoles: [{ role: { name: 'Machine Operator' } }],
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'u-1',
        username: 'u1',
        email: 'u1@mes.local',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        userRoles: [{ role: { name: 'Machine Operator' } }],
      });

      const res = await service.toggleActive('u-1', false, 'admin-id');
      expect(res.isActive).toBe(false);
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_UPDATED',
          entityType: 'User',
          newValues: expect.objectContaining({ isActive: false }),
        }),
      );
    });
  });
});
