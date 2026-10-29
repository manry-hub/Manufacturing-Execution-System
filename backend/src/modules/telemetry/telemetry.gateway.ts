import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { TelemetryIngestionService } from './telemetry.service.js';
import { EventTypeEnum } from './dto/normalized-machine-event.dto.js';
import { Subscription } from 'rxjs';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ws/telemetry',
})
export class TelemetryGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TelemetryGateway.name);

  @WebSocketServer()
  server!: Server;

  private streamSubscription?: Subscription;

  constructor(private readonly telemetryService: TelemetryIngestionService) {}

  afterInit() {
    this.logger.log('Telemetry WebSocket Gateway initialized on namespace /ws/telemetry');

    // Subscribe to the ingestion service event stream to broadcast to WebSocket rooms
    this.streamSubscription = this.telemetryService.telemetryStream$.subscribe({
      next: ({ event, internalMachineId }) => {
        this.broadcastTelemetry(event, internalMachineId);
      },
      error: (err) => {
        this.logger.error('Error in telemetry stream subscription', err);
      },
    });
  }

  async handleConnection(client: Socket) {
    this.logger.debug(`Client connected to telemetry namespace: ${client.id}`);
    // Auto-join plant:all room by default for global shop floor monitoring
    await client.join('plant:all');
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected from telemetry namespace: ${client.id}`);
  }

  @SubscribeMessage('subscribe:machine')
  async handleSubscribeMachine(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { machineId: string },
  ) {
    if (data?.machineId) {
      const room = `machine:${data.machineId}`;
      await client.join(room);
      this.logger.debug(`Client ${client.id} joined room ${room}`);
      return { status: 'SUBSCRIBED', room };
    }
  }

  @SubscribeMessage('unsubscribe:machine')
  async handleUnsubscribeMachine(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { machineId: string },
  ) {
    if (data?.machineId) {
      const room = `machine:${data.machineId}`;
      await client.leave(room);
      this.logger.debug(`Client ${client.id} left room ${room}`);
      return { status: 'UNSUBSCRIBED', room };
    }
  }

  @SubscribeMessage('subscribe:plant')
  async handleSubscribePlant(@ConnectedSocket() client: Socket) {
    await client.join('plant:all');
    return { status: 'SUBSCRIBED', room: 'plant:all' };
  }

  @SubscribeMessage('subscribe:module')
  async handleSubscribeModule(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { module: string },
  ) {
    if (data?.module) {
      const room = `module:${data.module}`;
      await client.join(room);
      this.logger.debug(`Client ${client.id} joined module room ${room}`);
      return { status: 'SUBSCRIBED', room };
    }
  }

  @SubscribeMessage('unsubscribe:module')
  async handleUnsubscribeModule(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { module: string },
  ) {
    if (data?.module) {
      const room = `module:${data.module}`;
      await client.leave(room);
      this.logger.debug(`Client ${client.id} left module room ${room}`);
      return { status: 'UNSUBSCRIBED', room };
    }
  }

  /**
   * Broadcasts packaging unit and reconciliation events.
   */
  public broadcastPackagingEvent(
    event: 'packaging:unit_created' | 'packaging:reconciled',
    payload: any,
  ) {
    if (!this.server) return;
    this.server.to('module:packaging').emit(event, payload);
    this.server.to('plant:all').emit(event, payload);
  }

  /**
   * Broadcasts tooling PM and maintenance work order events.
   */
  public broadcastMaintenanceEvent(
    event:
      | 'maintenance:work_order_created'
      | 'maintenance:work_order_updated'
      | 'mold:stroke_accumulated',
    payload: any,
  ) {
    if (!this.server) return;
    this.server.to('module:maintenance').emit(event, payload);
    this.server.to('plant:all').emit(event, payload);
  }

  /**
   * Broadcasts quality check, first-piece gating, and machine interlock events.
   */
  public broadcastQualityEvent(
    event:
      | 'quality:check_recorded'
      | 'quality:first_piece_status_changed'
      | 'machine:interlock_state',
    payload: any,
  ) {
    if (!this.server) return;
    this.server.to('module:quality').emit(event, payload);
    this.server.to('plant:all').emit(event, payload);
    if (payload?.machineId) {
      this.server.to(`machine:${payload.machineId}`).emit(event, payload);
    }
  }

  /**
   * Broadcasts raw material hopper loading, stock deductions, and depletion alerts.
   */
  public broadcastMaterialsEvent(
    event:
      | 'materials:hopper_loaded'
      | 'materials:hopper_depleted'
      | 'materials:lot_stock_updated'
      | 'materials:lot_quarantined',
    payload: any,
  ) {
    if (!this.server) return;
    this.server.to('module:materials').emit(event, payload);
    this.server.to('plant:all').emit(event, payload);
  }

  /**
   * Broadcasts scheduling dispatches, rescheduling moves, and changeover updates.
   */
  public broadcastSchedulingEvent(
    event:
      | 'scheduling:order_scheduled'
      | 'scheduling:order_rescheduled'
      | 'scheduling:order_unscheduled'
      | 'scheduling:changeover_updated'
      | 'scheduling:timeline_updated',
    payload: any,
  ) {
    if (!this.server) return;
    this.server.to('module:scheduling').emit(event, payload);
    this.server.to('plant:all').emit(event, payload);
  }

  /**
   * Broadcasts telemetry event to subscribed WebSocket rooms.
   */
  public broadcastTelemetry(event: any, internalMachineId: string) {
    if (!this.server) {
      return;
    }

    const payload = {
      eventId: event.eventId,
      machineId: event.machineId,
      internalMachineId,
      eventType: event.eventType,
      normalizedStatus: event.normalizedStatus,
      rawStatus: event.rawStatus,
      sourceTimestamp: event.sourceTimestamp,
      metrics: event.metrics,
      fault: event.fault,
    };

    // 1. Broadcast to global plant room
    this.server.to('plant:all').emit('telemetry:event', payload);

    if (event.eventType === EventTypeEnum.CYCLE_COMPLETED) {
      this.server.to('plant:all').emit('machine:cycle_completed', payload);
    } else if (event.eventType === EventTypeEnum.MACHINE_STATE_CHANGED) {
      this.server.to('plant:all').emit('machine:state_changed', payload);
    } else if (event.eventType === EventTypeEnum.FAULT_STARTED) {
      this.server.to('plant:all').emit('machine:fault_asserted', payload);
    } else if (event.eventType === EventTypeEnum.FAULT_CLEARED) {
      this.server.to('plant:all').emit('machine:fault_cleared', payload);
    }

    // 2. Broadcast to specific machine room
    this.server.to(`machine:${event.machineId}`).emit('telemetry:event', payload);
    if (event.machineId !== internalMachineId) {
      this.server.to(`machine:${internalMachineId}`).emit('telemetry:event', payload);
    }
  }
}
