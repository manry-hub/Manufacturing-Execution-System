import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { TelemetryEventPayload } from '../types/machine.js';
import type { PackagingUnit, RunReconciliation } from '../types/packaging.js';
import type { MaintenanceWorkOrder } from '../types/maintenance.js';
import type { QualityCheck, FirstPieceReleaseStatus } from '../types/quality.js';
import type { MoldChangeoverRule } from '../types/scheduling.js';
import type { ProductionRun } from '../types/production.js';

export interface UseTelemetrySocketOptions {
  onEvent?: (event: TelemetryEventPayload) => void;
  onCycleCompleted?: (event: TelemetryEventPayload) => void;
  onStateChanged?: (event: TelemetryEventPayload) => void;
  onFaultAsserted?: (event: TelemetryEventPayload) => void;
  onFaultCleared?: (event: TelemetryEventPayload) => void;

  // Packaging Events
  onPackagingUnitCreated?: (data: { runId: string; unit: PackagingUnit; orderNumber?: string }) => void;
  onPackagingReconciled?: (data: RunReconciliation) => void;

  // Maintenance Events
  onMaintenanceWoCreated?: (data: { workOrder: MaintenanceWorkOrder; moldId?: string; moldCode?: string; reason?: string }) => void;
  onMaintenanceWoUpdated?: (data: { workOrder: MaintenanceWorkOrder; moldId?: string; isCompleted?: boolean }) => void;
  onMoldStrokeAccumulated?: (data: { moldId: string; machineId: string; totalShots: number }) => void;

  // Quality & Interlock Events
  onQualityCheckRecorded?: (data: { runId: string; check: QualityCheck; disposition: string }) => void;
  onFirstPieceStatusChanged?: (data: FirstPieceReleaseStatus & { runId?: string }) => void;
  onMachineInterlockState?: (data: { machineId: string; isInterlocked: boolean; reason?: string }) => void;

  // Production Run Events
  onProductionRunReleased?: (data: { runId: string; run: ProductionRun }) => void;

  // Material Events
  onHopperLoaded?: (data: {
    runId: string;
    machineId: string;
    materialLotId: string;
    lotNumber: string;
    quantityKg: number;
    remainingLotQtyKg: number;
  }) => void;
  onHopperDepleted?: (data: { runId: string; machineId: string; consumedKg: number }) => void;
  onLotStockUpdated?: (data: { lotId: string; lotNumber: string; remainingQtyKg: number; status: string }) => void;

  // Scheduling Events
  onSchedulingUpdated?: (data: { action?: string; orderId?: string; changeover?: MoldChangeoverRule }) => void;
}

export function useTelemetrySocket(options: UseTelemetrySocketOptions = {}) {
  const [connected, setConnected] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(12);
  const [lastEvent, setLastEvent] = useState<TelemetryEventPayload | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const subscribedMachinesRef = useRef<Set<string>>(new Set());
  const subscribedModulesRef = useRef<Set<string>>(new Set());

  // Keep latest callbacks in refs to prevent unnecessary socket re-attaching
  const callbacksRef = useRef(options);
  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  useEffect(() => {
    // Socket.IO client connects to /ws/telemetry namespace
    const socketUrl =
      typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:3000/ws/telemetry'
        : '/ws/telemetry';

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Automatically subscribe to plant:all room
      socket.emit('subscribe:plant');
      // Resubscribe any machines and modules previously requested
      subscribedMachinesRef.current.forEach((machineId) => {
        socket.emit('subscribe:machine', { machineId });
      });
      subscribedModulesRef.current.forEach((module) => {
        socket.emit('subscribe:module', { module });
      });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket telemetry connection warning:', err.message);
      setConnected(false);
    });

    socket.on('telemetry:event', (payload: TelemetryEventPayload) => {
      setLastEvent(payload);
      callbacksRef.current.onEvent?.(payload);
    });

    socket.on('machine:cycle_completed', (payload: TelemetryEventPayload) => {
      callbacksRef.current.onCycleCompleted?.(payload);
    });

    socket.on('machine:state_changed', (payload: TelemetryEventPayload) => {
      callbacksRef.current.onStateChanged?.(payload);
    });

    socket.on('machine:fault_asserted', (payload: TelemetryEventPayload) => {
      callbacksRef.current.onFaultAsserted?.(payload);
    });

    socket.on('machine:fault_cleared', (payload: TelemetryEventPayload) => {
      callbacksRef.current.onFaultCleared?.(payload);
    });

    // Domain Module Real-Time Listeners
    socket.on('packaging:unit_created', (payload) => {
      callbacksRef.current.onPackagingUnitCreated?.(payload);
    });
    socket.on('packaging:reconciled', (payload) => {
      callbacksRef.current.onPackagingReconciled?.(payload);
    });

    socket.on('maintenance:work_order_created', (payload) => {
      callbacksRef.current.onMaintenanceWoCreated?.(payload);
    });
    socket.on('maintenance:work_order_updated', (payload) => {
      callbacksRef.current.onMaintenanceWoUpdated?.(payload);
    });
    socket.on('mold:stroke_accumulated', (payload) => {
      callbacksRef.current.onMoldStrokeAccumulated?.(payload);
    });

    socket.on('quality:check_recorded', (payload) => {
      callbacksRef.current.onQualityCheckRecorded?.(payload);
    });
    socket.on('quality:first_piece_status_changed', (payload) => {
      callbacksRef.current.onFirstPieceStatusChanged?.(payload);
    });
    socket.on('machine:interlock_state', (payload) => {
      callbacksRef.current.onMachineInterlockState?.(payload);
    });
    socket.on('production:run_released', (payload) => {
      callbacksRef.current.onProductionRunReleased?.(payload);
    });

    socket.on('materials:hopper_loaded', (payload) => {
      callbacksRef.current.onHopperLoaded?.(payload);
    });
    socket.on('materials:hopper_depleted', (payload) => {
      callbacksRef.current.onHopperDepleted?.(payload);
    });
    socket.on('materials:lot_stock_updated', (payload) => {
      callbacksRef.current.onLotStockUpdated?.(payload);
    });

    socket.on('scheduling:timeline_updated', (payload) => {
      callbacksRef.current.onSchedulingUpdated?.(payload);
    });
    socket.on('scheduling:order_scheduled', (payload) => {
      callbacksRef.current.onSchedulingUpdated?.({ action: 'SCHEDULE', ...payload });
    });
    socket.on('scheduling:order_rescheduled', (payload) => {
      callbacksRef.current.onSchedulingUpdated?.({ action: 'RESCHEDULE', ...payload });
    });
    socket.on('scheduling:order_unscheduled', (payload) => {
      callbacksRef.current.onSchedulingUpdated?.({ action: 'UNSCHEDULE', ...payload });
    });
    socket.on('scheduling:changeover_updated', (payload) => {
      callbacksRef.current.onSchedulingUpdated?.({ action: 'CHANGEOVER', ...payload });
    });

    // Periodic ping to compute live latency indicator
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        const start = Date.now();
        socket.emit('ping', () => {
          setLatencyMs(Date.now() - start);
        });
      }
    }, 10000);

    return () => {
      clearInterval(pingInterval);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const subscribeMachine = useCallback((machineId: string) => {
    subscribedMachinesRef.current.add(machineId);
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:machine', { machineId });
    }
  }, []);

  const unsubscribeMachine = useCallback((machineId: string) => {
    subscribedMachinesRef.current.delete(machineId);
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe:machine', { machineId });
    }
  }, []);

  const subscribeModule = useCallback((module: string) => {
    subscribedModulesRef.current.add(module);
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:module', { module });
    }
  }, []);

  const unsubscribeModule = useCallback((module: string) => {
    subscribedModulesRef.current.delete(module);
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe:module', { module });
    }
  }, []);

  return {
    connected,
    latencyMs,
    lastEvent,
    subscribeMachine,
    unsubscribeMachine,
    subscribeModule,
    unsubscribeModule,
  };
}
