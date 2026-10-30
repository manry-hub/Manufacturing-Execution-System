import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.js';
import { useTelemetrySocket } from '../hooks/useTelemetrySocket.js';
import { api } from '../services/api.js';
import type { Machine, TelemetryEventPayload } from '../types/machine.js';
import type { ProductionOrder, ProductionRun } from '../types/production.js';
import type { AndonTicket, AndonCategory } from '../types/andon.js';

export interface ShopfloorContextValue {
  machines: Machine[];
  orders: ProductionOrder[];
  runs: ProductionRun[];
  tickets: AndonTicket[];
  simulatorStatus: {
    isRunning: boolean;
    speedMultiplier: number;
  };
  isLoading: boolean;
  fetchError: string | null;
  connected: boolean;
  latencyMs: number;
  openTickets: AndonTicket[];
  selectedMachineForAndon: Machine | null;
  setSelectedMachineForAndon: (m: Machine | null) => void;
  refreshData: () => Promise<void>;
  // Simulator handlers
  handleStartSimulator: () => Promise<void>;
  handleStopSimulator: () => Promise<void>;
  handleSetSimulatorSpeed: (speed: number) => Promise<void>;
  handleResetSimulator: () => Promise<void>;
  handleTriggerScenario: (dto: {
    machineCode: string;
    scenario: 'NORMAL' | 'SLOW_CYCLE' | 'HEATER_FAULT' | 'ESTOP' | 'DISCONNECT';
    customCycleTimeSeconds?: number;
    faultCode?: string;
  }) => Promise<void>;
  // Production handlers
  handleCreateOrder: (dto: {
    orderNumber: string;
    productId: string;
    targetQuantity: number;
    plannedStartTime: string;
  }) => Promise<void>;
  handleReleaseOrder: (id: string) => Promise<void>;
  handlePauseRun: (id: string) => Promise<void>;
  handleCompleteRun: (id: string) => Promise<void>;
  handleRecordScrap: (
    runId: string,
    dto: { quantity: number; defectCode: string; notes?: string },
  ) => Promise<void>;
  // Andon handlers
  handleAcknowledgeAndon: (id: string) => Promise<void>;
  handleResolveAndon: (
    id: string,
    dto: { downtimeClassification: string; correctiveAction?: string },
  ) => Promise<void>;
  handleSubmitAndon: (dto: {
    machineId: string;
    category: AndonCategory;
    description: string;
    priority?: string;
  }) => Promise<void>;
}

const ShopfloorContext = createContext<ShopfloorContextValue | undefined>(undefined);

export const ShopfloorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [runs, setRuns] = useState<ProductionRun[]>([]);
  const [tickets, setTickets] = useState<AndonTicket[]>([]);
  const [selectedMachineForAndon, setSelectedMachineForAndon] = useState<Machine | null>(null);
  const [simulatorStatus, setSimulatorStatus] = useState<{
    isRunning: boolean;
    speedMultiplier: number;
  }>({ isRunning: false, speedMultiplier: 1 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Load shop floor initial dataset
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [machinesData, runsData, ticketsData, simData, ordersData] = await Promise.all([
        api.getMachines(),
        api.getRuns(),
        api.getAndonTickets(),
        api.getSimulatorStatus(),
        api.getOrders(),
      ]);

      // Merge simulator nodes into machines
      const mergedMachines = machinesData.map((m) => {
        const simNode = simData.nodes.find((n) => n.machineCode === m.code);
        return {
          ...m,
          cycleCounter: simNode?.cycleCounter ?? m.currentState?.activeRunId ? 100 : 0,
          currentPhase: simNode?.currentPhase as Machine['currentPhase'],
          nominalCycleTimeSeconds: simNode?.nominalCycleTimeSeconds ?? 22.0,
          isSlowCycleActive: simNode?.isSlowCycleActive ?? false,
          isFaultActive: simNode?.isFaultActive ?? false,
          activeFaultCode: simNode?.activeFaultCode ?? null,
          isDisconnected: simNode?.isDisconnected ?? false,
        };
      });

      setMachines(mergedMachines);
      setRuns(runsData);
      setTickets(ticketsData);
      setOrders(ordersData);
      setSimulatorStatus({
        isRunning: simData.isRunning,
        speedMultiplier: simData.speedMultiplier,
      });
    } catch (err) {
      console.error('Failed to load shopfloor data:', err);
      setFetchError(err instanceof Error ? err.message : 'Error fetching telemetry data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      void refreshData();
    }
  }, [user, refreshData]);

  // Handle incoming real-time telemetry events via WebSocket
  const handleTelemetryEvent = useCallback((event: TelemetryEventPayload) => {
    setMachines((prev) =>
      prev.map((m) => {
        if (m.code === event.machineId || m.id === event.internalMachineId) {
          return {
            ...m,
            currentState: m.currentState
              ? {
                  ...m.currentState,
                  normalizedStatus: event.normalizedStatus,
                  currentCycleTime: event.metrics?.cycleTimeSeconds ?? m.currentState.currentCycleTime,
                  lastEventTimestamp: event.sourceTimestamp,
                }
              : undefined,
            cycleCounter: event.metrics?.shotCounter ?? m.cycleCounter,
            latestMetrics: {
              ...m.latestMetrics,
              ...event.metrics,
            },
          };
        }
        return m;
      }),
    );
  }, []);

  const handleCycleCompleted = useCallback((event: TelemetryEventPayload) => {
    handleTelemetryEvent(event);
  }, [handleTelemetryEvent]);

  const handleStateChanged = useCallback((event: TelemetryEventPayload) => {
    handleTelemetryEvent(event);
  }, [handleTelemetryEvent]);

  const handleFaultAsserted = useCallback((event: TelemetryEventPayload) => {
    handleTelemetryEvent(event);
    void api.getAndonTickets().then(setTickets);
  }, [handleTelemetryEvent]);

  const handleFaultCleared = useCallback((event: TelemetryEventPayload) => {
    handleTelemetryEvent(event);
    void api.getAndonTickets().then(setTickets);
  }, [handleTelemetryEvent]);

  const handleMachineInterlockState = useCallback(
    ({ machineId, isInterlocked, reason }: { machineId: string; isInterlocked: boolean; reason?: string }) => {
      setMachines((prev) =>
        prev.map((m) => {
          if (m.id === machineId || m.code === machineId) {
            return {
              ...m,
              isInterlocked,
              interlockReason: reason,
            };
          }
          return m;
        }),
      );
    },
    [],
  );

  const handleProductionRunReleased = useCallback(
    ({ runId }: { runId: string }) => {
      setRuns((prev) =>
        prev.map((r) => (r.id === runId ? { ...r, status: 'ACTIVE' } : r)),
      );
    },
    [],
  );

  const { connected, latencyMs } = useTelemetrySocket({
    onEvent: handleTelemetryEvent,
    onCycleCompleted: handleCycleCompleted,
    onStateChanged: handleStateChanged,
    onFaultAsserted: handleFaultAsserted,
    onFaultCleared: handleFaultCleared,
    onMachineInterlockState: handleMachineInterlockState,
    onProductionRunReleased: handleProductionRunReleased,
  });

  // Simulator actions
  const handleStartSimulator = async () => {
    await api.startSimulator();
    setSimulatorStatus((s) => ({ ...s, isRunning: true }));
  };

  const handleStopSimulator = async () => {
    await api.stopSimulator();
    setSimulatorStatus((s) => ({ ...s, isRunning: false }));
  };

  const handleSetSimulatorSpeed = async (speed: number) => {
    await api.setSimulatorSpeed(speed);
    setSimulatorStatus((s) => ({ ...s, speedMultiplier: speed }));
  };

  const handleResetSimulator = async () => {
    await api.resetSimulator();
    await refreshData();
  };

  const handleTriggerScenario = async (dto: {
    machineCode: string;
    scenario: 'NORMAL' | 'SLOW_CYCLE' | 'HEATER_FAULT' | 'ESTOP' | 'DISCONNECT';
    customCycleTimeSeconds?: number;
    faultCode?: string;
  }) => {
    await api.triggerScenario(dto);
    await refreshData();
  };

  // Production actions
  const handleCreateOrder = async (dto: {
    orderNumber: string;
    productId: string;
    targetQuantity: number;
    plannedStartTime: string;
  }) => {
    const newOrder = await api.createOrder(dto);
    setOrders((prev) => [newOrder, ...prev]);
  };

  const handleReleaseOrder = async (id: string) => {
    const released = await api.releaseOrder(id);
    setOrders((prev) => prev.map((o) => (o.id === id ? released : o)));
  };

  const handlePauseRun = async (id: string) => {
    const paused = await api.pauseRun(id);
    setRuns((prev) => prev.map((r) => (r.id === id ? paused : r)));
  };

  const handleCompleteRun = async (id: string) => {
    const completed = await api.completeRun(id);
    setRuns((prev) => prev.map((r) => (r.id === id ? completed : r)));
  };

  const handleRecordScrap = async (
    runId: string,
    dto: { quantity: number; defectCode: string; notes?: string },
  ) => {
    const updated = await api.recordScrap(runId, dto);
    setRuns((prev) => prev.map((r) => (r.id === runId ? updated : r)));
  };

  // Andon actions
  const handleAcknowledgeAndon = async (id: string) => {
    const updated = await api.acknowledgeAndonTicket(id);
    setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const handleResolveAndon = async (
    id: string,
    dto: { downtimeClassification: string; correctiveAction?: string },
  ) => {
    const resolved = await api.resolveAndonTicket(id, dto);
    setTickets((prev) => prev.map((t) => (t.id === id ? resolved : t)));
  };

  const handleSubmitAndon = async (dto: {
    machineId: string;
    category: AndonCategory;
    description: string;
    priority?: string;
  }) => {
    const newTicket = await api.createAndonTicket(dto);
    setTickets((prev) => [newTicket, ...prev]);
  };

  const openTickets = tickets.filter((t) => t.status === 'OPEN');

  const value: ShopfloorContextValue = {
    machines,
    orders,
    runs,
    tickets,
    simulatorStatus,
    isLoading,
    fetchError,
    connected,
    latencyMs,
    openTickets,
    selectedMachineForAndon,
    setSelectedMachineForAndon,
    refreshData,
    handleStartSimulator,
    handleStopSimulator,
    handleSetSimulatorSpeed,
    handleResetSimulator,
    handleTriggerScenario,
    handleCreateOrder,
    handleReleaseOrder,
    handlePauseRun,
    handleCompleteRun,
    handleRecordScrap,
    handleAcknowledgeAndon,
    handleResolveAndon,
    handleSubmitAndon,
  };

  return <ShopfloorContext.Provider value={value}>{children}</ShopfloorContext.Provider>;
};

export const useShopfloor = (): ShopfloorContextValue => {
  const context = useContext(ShopfloorContext);
  if (!context) {
    throw new Error('useShopfloor must be used within a ShopfloorProvider');
  }
  return context;
};
