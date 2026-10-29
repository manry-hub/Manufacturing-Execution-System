import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { useTelemetrySocket } from './hooks/useTelemetrySocket.js';
import { api } from './services/api.js';
import type { Machine, TelemetryEventPayload } from './types/machine.js';
import type { ProductionOrder, ProductionRun } from './types/production.js';
import type { AndonTicket, AndonCategory } from './types/andon.js';
import { Sidebar, type ActiveTab } from './components/layout/Sidebar.js';
import { Header } from './components/layout/Header.js';
import { AndonTopBanner } from './components/layout/AndonTopBanner.js';
import { ShopFloorGrid } from './components/machines/ShopFloorGrid.js';
import { MachineDetailView } from './components/machines/detail/MachineDetailView.js';
import { ProductionOrdersView } from './components/production/ProductionOrdersView.js';
import { OeeAnalyticsView } from './components/oee/OeeAnalyticsView.js';
import { AndonBoardView } from './components/andon/AndonBoardView.js';
import { CreateAndonModal } from './components/andon/CreateAndonModal.js';
import { QualityView } from './components/quality/QualityView.js';
import { MaterialsView } from './components/materials/MaterialsView.js';
import { MaintenanceView } from './components/maintenance/MaintenanceView.js';
import { PackagingView } from './components/packaging/PackagingView.js';
import { SchedulingView } from './components/scheduling/SchedulingView.js';
import { TravelerView } from './components/traveler/TravelerView.js';
import { AnalyticsView } from './components/analytics/AnalyticsView.js';
import { AlertCircle, RefreshCw } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('shopfloor');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
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
      setSelectedMachineForDetail((prev) => {
        if (prev && (prev.id === machineId || prev.code === machineId)) {
          return {
            ...prev,
            isInterlocked,
            interlockReason: reason,
          };
        }
        return prev;
      });
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

  return (
    <div className="h-screen h-[100dvh] bg-[#F8F8F8] text-[#292A2E] flex font-sans overflow-hidden">
      {/* Atlassian Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        openTicketsCount={openTickets.length}
        connected={connected}
        latencyMs={latencyMs}
      />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onToggleMobile={() => setIsMobileNavOpen((prev) => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          connected={connected}
          latencyMs={latencyMs}
          openTicketsCount={openTickets.length}
          onNavigateToAndon={() => setActiveTab('andon')}
        />

        {/* Active Andon Alert Top Banner */}
        <AndonTopBanner
          tickets={tickets}
          onAcknowledge={handleAcknowledgeAndon}
          onNavigateToAndon={() => setActiveTab('andon')}
        />

        {/* Main Container */}
        <main id="main-content" className="flex-1 overflow-y-auto overscroll-contain w-full px-4 sm:px-6 lg:px-8 py-6">
        {fetchError && (
          <div className="mb-6 p-4 rounded-lg bg-[#FFECEB] border border-[#E2483D] text-[#292A2E] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-[#C9372C] flex-shrink-0" />
              <span className="text-sm font-medium">{fetchError}</span>
            </div>
            <button
              type="button"
              onClick={() => void refreshData()}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] border border-[#0B120E24] transition-colors shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-[#505258] space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-[#1868DB]" />
            <p className="text-sm font-medium">Connecting to shop floor ingestion engine...</p>
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

            {/* View 3b: Production Scheduling & Gantt Timeline */}
            {activeTab === 'scheduling' && <SchedulingView />}

            {/* View 4: Quality Control & First-Piece Gate */}
            {activeTab === 'quality' && <QualityView runs={runs} onRefreshRuns={refreshData} />}

            {/* View 5: Raw Materials & Genealogy */}
            {activeTab === 'materials' && <MaterialsView runs={runs} />}

            {/* View 6: Tooling Health & Mold PM */}
            {activeTab === 'maintenance' && <MaintenanceView />}

            {/* View 7: Finished Goods Packaging & Reconciliation */}
            {activeTab === 'packaging' && <PackagingView runs={runs} />}

            {/* View 8: ISO 22400-2 OEE Executive Analytics */}
            {activeTab === 'oee' && <OeeAnalyticsView machines={machines} />}

            {/* View 9: Digital Andon Response Center */}
            {activeTab === 'andon' && (
              <AndonBoardView
                tickets={tickets}
                machines={machines}
                onAcknowledgeTicket={handleAcknowledgeAndon}
                onResolveTicket={handleResolveAndon}
                onCreateTicket={handleSubmitAndon}
              />
            )}

            {/* View 10: Digital Traveler & Certificate of Conformance */}
            {activeTab === 'traveler' && <TravelerView runs={runs} />}

            {/* View 11: Statistical Process Control (SPC) & FMEA Analytics */}
            {activeTab === 'analytics' && <AnalyticsView />}
          </>
        )}
      </main>
      </div>

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
