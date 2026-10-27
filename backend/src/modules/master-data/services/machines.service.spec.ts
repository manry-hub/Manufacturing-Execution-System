import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { MachinesService } from './machines.service.js';
import { PrismaService } from '../../../database/prisma.service.js';

describe('MachinesService', () => {
  let machinesService: MachinesService;
  let prismaService: any;

  beforeEach(() => {
    prismaService = {
      machine: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    machinesService = new MachinesService(prismaService as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('should return list of machines', async () => {
      const mockMachines = [
        { id: 'm-1', code: 'IMM-01', name: 'Injection Molding Machine 01' },
        { id: 'm-2', code: 'IMM-02', name: 'Injection Molding Machine 02' },
      ];
      prismaService.machine.findMany.mockResolvedValue(mockMachines);

      const result = await machinesService.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('IMM-01');
      expect(prismaService.machine.findMany).toHaveBeenCalled();
    });

    it('should filter by areaId when provided', async () => {
      prismaService.machine.findMany.mockResolvedValue([]);

      await machinesService.findAll('area-123');

      expect(prismaService.machine.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { areaId: 'area-123' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return machine when found', async () => {
      const mockMachine = {
        id: 'm-1',
        code: 'IMM-01',
        name: 'IMM 01',
        currentState: { state: 'IDLE' },
      };
      prismaService.machine.findUnique.mockResolvedValue(mockMachine);

      const result = await machinesService.findOne('m-1');

      expect(result.id).toBe('m-1');
      expect(result.code).toBe('IMM-01');
    });

    it('should throw NotFoundException when machine does not exist', async () => {
      prismaService.machine.findUnique.mockResolvedValue(null);

      await expect(machinesService.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
