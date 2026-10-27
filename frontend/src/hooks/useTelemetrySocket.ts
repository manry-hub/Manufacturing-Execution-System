import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { TelemetryEventPayload } from '../types/machine.js';

interface UseTelemetrySocketOptions {
  onEvent?: (event: TelemetryEventPayload) => void;
  onCycleCompleted?: (event: TelemetryEventPayload) => void;
  onStateChanged?: (event: TelemetryEventPayload) => void;
  onFaultAsserted?: (event: TelemetryEventPayload) => void;
  onFaultCleared?: (event: TelemetryEventPayload) => void;
}

export function useTelemetrySocket(options: UseTelemetrySocketOptions = {}) {
  const [connected, setConnected] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(12);
  const [lastEvent, setLastEvent] = useState<TelemetryEventPayload | null>(null);
  const socketRef = useRef<Socket | null>(null);

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

    // Periodic ping to compute live latency indicator
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        const start = Date.now();
        // Lightweight round-trip check
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
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:machine', { machineId });
    }
  }, []);

  const unsubscribeMachine = useCallback((machineId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe:machine', { machineId });
    }
  }, []);

  return {
    connected,
    latencyMs,
    lastEvent,
    subscribeMachine,
    unsubscribeMachine,
  };
}
