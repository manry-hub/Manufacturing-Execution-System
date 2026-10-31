import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelemetryGateway } from './telemetry.gateway.js';
import type { Socket, Server } from 'socket.io';

describe('TelemetryGateway', () => {
  let gateway: TelemetryGateway;
  let mockServer: any;
  let mockSocket: any;
  let emittedRooms: Record<string, { event: string; payload: any }[]>;

  beforeEach(() => {
    const mockTelemetryService = {
      telemetryStream$: {
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      },
    };
    gateway = new TelemetryGateway(mockTelemetryService as any);
    emittedRooms = {};

    mockServer = {
      to: vi.fn((room: string) => ({
        emit: vi.fn((event: string, payload: any) => {
          if (!emittedRooms[room]) emittedRooms[room] = [];
          emittedRooms[room].push({ event, payload });
        }),
      })),
      emit: vi.fn(),
    };
    gateway.server = mockServer as unknown as Server;

    mockSocket = {
      id: 'client-1',
      join: vi.fn(),
      leave: vi.fn(),
    };
  });

  describe('Module Room Subscriptions', () => {
    it('should join socket to the correct module room', async () => {
      await gateway.handleSubscribeModule(mockSocket as unknown as Socket, { module: 'packaging' });
      expect(mockSocket.join).toHaveBeenCalledWith('module:packaging');

      await gateway.handleSubscribeModule(mockSocket as unknown as Socket, { module: 'quality' });
      expect(mockSocket.join).toHaveBeenCalledWith('module:quality');
    });

    it('should leave the module room on unsubscribe', async () => {
      await gateway.handleUnsubscribeModule(mockSocket as unknown as Socket, { module: 'maintenance' });
      expect(mockSocket.leave).toHaveBeenCalledWith('module:maintenance');
    });
  });

  describe('Packaging Event Broadcasting', () => {
    it('should broadcast packaging:unit_created to both module room and plant:all', () => {
      const payload = { runId: 'run-1', unit: { id: 'u-1', barcode: 'BC-1' } };
      gateway.broadcastPackagingEvent('packaging:unit_created', payload);

      expect(mockServer.to).toHaveBeenCalledWith('module:packaging');
      expect(mockServer.to).toHaveBeenCalledWith('plant:all');
      expect(emittedRooms['module:packaging']).toContainEqual({
        event: 'packaging:unit_created',
        payload,
      });
      expect(emittedRooms['plant:all']).toContainEqual({
        event: 'packaging:unit_created',
        payload,
      });
    });

    it('should broadcast packaging:reconciled to module:packaging and plant:all', () => {
      const payload = { runId: 'run-1', shotToPackVariance: 0 };
      gateway.broadcastPackagingEvent('packaging:reconciled', payload);

      expect(emittedRooms['module:packaging']).toContainEqual({
        event: 'packaging:reconciled',
        payload,
      });
    });
  });

  describe('Maintenance Event Broadcasting', () => {
    it('should broadcast maintenance:work_order_created to module:maintenance and plant:all', () => {
      const payload = { workOrder: { id: 'wo-1', orderNumber: 'WO-PM-01' }, reason: 'THRESHOLD_EXCEEDED' };
      gateway.broadcastMaintenanceEvent('maintenance:work_order_created', payload);

      expect(emittedRooms['module:maintenance']).toContainEqual({
        event: 'maintenance:work_order_created',
        payload,
      });
      expect(emittedRooms['plant:all']).toContainEqual({
        event: 'maintenance:work_order_created',
        payload,
      });
    });

    it('should broadcast mold:stroke_accumulated to module:maintenance and plant:all', () => {
      const payload = { moldId: 'mold-1', machineId: 'IMM-01', totalShots: 25000 };
      gateway.broadcastMaintenanceEvent('mold:stroke_accumulated', payload);

      expect(emittedRooms['module:maintenance']).toContainEqual({
        event: 'mold:stroke_accumulated',
        payload,
      });
    });
  });

  describe('Quality & Interlock Event Broadcasting', () => {
    it('should broadcast quality:first_piece_status_changed and machine:interlock_state to target machine', () => {
      const payload = { machineId: 'IMM-02', isInterlocked: true, reason: 'Quarantined first piece' };
      gateway.broadcastQualityEvent('machine:interlock_state', payload);

      expect(emittedRooms['module:quality']).toContainEqual({
        event: 'machine:interlock_state',
        payload,
      });
      expect(emittedRooms['plant:all']).toContainEqual({
        event: 'machine:interlock_state',
        payload,
      });
      expect(emittedRooms['machine:IMM-02']).toContainEqual({
        event: 'machine:interlock_state',
        payload,
      });
    });
  });

  describe('Materials Event Broadcasting', () => {
    it('should broadcast materials:hopper_loaded to module:materials and plant:all', () => {
      const payload = { runId: 'run-1', machineId: 'IMM-01', materialLotId: 'lot-1', lotNumber: 'LOT-01', quantityKg: 50, remainingLotQtyKg: 450 };
      gateway.broadcastMaterialsEvent('materials:hopper_loaded', payload);

      expect(emittedRooms['module:materials']).toContainEqual({
        event: 'materials:hopper_loaded',
        payload,
      });
    });
  });

  describe('Scheduling Event Broadcasting', () => {
    it('should broadcast scheduling:timeline_updated to module:scheduling and plant:all', () => {
      const payload = { action: 'RESCHEDULE', orderId: 'ord-1' };
      gateway.broadcastSchedulingEvent('scheduling:timeline_updated', payload);

      expect(emittedRooms['module:scheduling']).toContainEqual({
        event: 'scheduling:timeline_updated',
        payload,
      });
    });
  });
});
