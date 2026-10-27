import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { useTelemetrySocket } from './hooks/useTelemetrySocket.js';
import { api } from './services/api.js';
import type { Machine, TelemetryEventPayload } from './types/machine.js';
import type { ProductionOrder, ProductionRun } from './types/production.js';
import type { AndonTicket, AndonCategory } from './types/andon.js';
import { Navbar, type ActiveTab } from './components/layout/Navbar.js';
import { AndonTopBanner } from './components/layout/AndonTopBanner.js';
import { ShopFloorGrid } from './components/machines/ShopFloorGrid.js';
import { MachineDetailView } from './components/machines/detail/MachineDetailView.js';
import { ProductionOrdersView } from './components/production/ProductionOrdersView.js';
import { OeeAnalyticsView } from './components/oee/OeeAnalyticsView.js';
import { AndonBoardView } from './components/andon/AndonBoardView.js';
import { CreateAndonModal } from './components/andon/CreateAndonModal.js';
import { AlertCircle, RefreshCw } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('shopfloor');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [runs, setRuns] = useState<ProductionRun[]>([]);
  const [tickets, setTickets] = useState<AndonTicket[]>([]);
  const [selectedMachineForAndon, setSelectedMachineForAndon] = useState<Machine | null>(null);
  const [selectedMachineForDetail, setSelectedMachineForDetail] = useState<Machine | null>(null);
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

  const { connected, latencyMs } = useTelemetrySocket({
    onEvent: handleTelemetryEvent,
    onCycleCompleted: handleCycleCompleted,
    onStateChanged: handleStateChanged,
    onFaultAsserted: handleFaultAsserted,
    onFaultCleared: handleFaultCleared,
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        connected={connected}
        latencyMs={latencyMs}
        openTicketsCount={openTickets.length}
      />

      {/* Active Andon Alert Top Banner */}
      <AndonTopBanner
        tickets={tickets}
        onAcknowledge={handleAcknowledgeAndon}
        onNavigateToAndon={() => setActiveTab('andon')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {fetchError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{fetchError}</span>
            </div>
            <button
              type="button"
              onClick={() => void refreshData()}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Connecting to Shop Floor Ingestion Engine...</p>
          </div>
        ) : (
          <>
            {/* View 1: Shop Floor Grid */}
            {activeTab === 'shopfloor' && (
              <ShopFloorGrid
                machines={machines}
                runs={runs}
                simulatorStatus={simulatorStatus}
                onSelectMachine={(m) => {
                  setSelectedMachineForDetail(m);
                  setActiveTab('machines');
                }}
                onTriggerAndon={(m) => setSelectedMachineForAndon(m)}
                onStartSimulator={handleStartSimulator}
                onStopSimulator={handleStopSimulator}
                onSetSimulatorSpeed={handleSetSimulatorSpeed}
                onResetSimulator={handleResetSimulator}
              />
            )}

            {/* View 2: Machine Details & Gauges */}
            {activeTab === 'machines' && (
              <MachineDetailView
                machine={
                  machines.find(
                    (m) =>
                      m.id === selectedMachineForDetail?.id ||
                      m.code === selectedMachineForDetail?.code,
                  ) ??
                  machines[0] ??
                  selectedMachineForDetail
                }
                allMachines={machines}
                activeRun={runs.find(
                  (r) =>
                    r.machineId ===
                    (selectedMachineForDetail?.id ?? machines[0]?.id),
                )}
                onSelectMachine={(m) => setSelectedMachineForDetail(m)}
                onBackToGrid={() => setActiveTab('shopfloor')}
                onTriggerAndon={(m) => setSelectedMachineForAndon(m)}
                onTriggerScenario={handleTriggerScenario}
                onRefresh={refreshData}
              />
            )}

            {/* View 3: Production Orders & Runs */}
            {activeTab === 'orders' && (
              <ProductionOrdersView
                orders={orders}
                runs={runs}
                onCreateOrder={handleCreateOrder}
                onReleaseOrder={handleReleaseOrder}
                onPauseRun={handlePauseRun}
                onCompleteRun={handleCompleteRun}
                onRecordScrap={handleRecordScrap}
                onRefresh={refreshData}
              />
            )}

            {/* View 4: ISO 22400-2 OEE Executive Analytics */}
            {activeTab === 'oee' && <OeeAnalyticsView machines={machines} />}

            {/* View 5: Digital Andon Response Center */}
            {activeTab === 'andon' && (
              <AndonBoardView
                tickets={tickets}
                machines={machines}
                onAcknowledgeTicket={handleAcknowledgeAndon}
                onResolveTicket={handleResolveAndon}
                onCreateTicket={handleSubmitAndon}
              />
            )}
          </>
        )}
      </main>

      {/* Operator Call-for-Help Modal */}
      <CreateAndonModal
        isOpen={Boolean(selectedMachineForAndon)}
        onClose={() => setSelectedMachineForAndon(null)}
        machine={selectedMachineForAndon}
        onSubmit={handleSubmitAndon}
      />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}

export default App;
