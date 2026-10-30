import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  RefreshCw,
  Plus,
  Play,
  CheckCircle2,
  Sliders,
  X,
  ShieldAlert,
  GripVertical,
  Move,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useTelemetrySocket } from '../../hooks/useTelemetrySocket.js';
import type { Machine } from '../../types/machine.js';
import type { ProductionOrder, Mold } from '../../types/production.js';
import type {
  SchedulingTimelineResponse,
  TimelineBlock,
  MoldChangeoverRule,
} from '../../types/scheduling.js';

type HorizonType = 'SHIFT' | 'DAY' | 'WEEK';

interface DragOverSlotState {
  machineId: string;
  snappedTime: Date;
  percent: number;
  timeString: string;
  durationMinutes: number;
  conflict?: {
    type: 'TONNAGE_MISMATCH' | 'TOOLING_COLLISION' | 'MACHINE_OVERLAP';
    message: string;
  } | null;
}

interface ActiveDragItem {
  source: 'BACKLOG' | 'TIMELINE';
  orderId: string;
  orderNumber: string;
  durationMinutes: number;
  productName?: string;
  moldId?: string;
  moldCode?: string;
}

export const SchedulingView: React.FC = () => {
  const [timelineData, setTimelineData] = useState<SchedulingTimelineResponse | null>(null);
  const [backlogOrders, setBacklogOrders] = useState<ProductionOrder[]>([]);
  const [changeovers, setChangeovers] = useState<MoldChangeoverRule[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [molds, setMolds] = useState<Mold[]>([]);

  const [horizon, setHorizon] = useState<HorizonType>('DAY');
  const [selectedBlock, setSelectedBlock] = useState<TimelineBlock | null>(null);
  const [isBacklogOpen, setIsBacklogOpen] = useState<boolean>(false);
  const [isChangeoverModalOpen, setIsChangeoverModalOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [orderToSchedule, setOrderToSchedule] = useState<ProductionOrder | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Drag and Drop States
  const [dragOverSlot, setDragOverSlot] = useState<DragOverSlotState | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeDragItem, setActiveDragItem] = useState<ActiveDragItem | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (feedbackToast) {
      const timer = setTimeout(() => {
        setFeedbackToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [feedbackToast]);

  // Form states for scheduling an order
  const [scheduleMachineId, setScheduleMachineId] = useState<string>('');
  const [scheduleMoldId, setScheduleMoldId] = useState<string>('');
  const [scheduleStartTime, setScheduleStartTime] = useState<string>('');
  const [schedulePriority, setSchedulePriority] = useState<number>(3);
  const [scheduleNotes, setScheduleNotes] = useState<string>('');

  // Form states for changeover rule
  const [coFromMoldId, setCoFromMoldId] = useState<string>('');
  const [coToMoldId, setCoToMoldId] = useState<string>('');
  const [coSetupMinutes, setCoSetupMinutes] = useState<number>(45);
  const [coPurgeMinutes, setCoPurgeMinutes] = useState<number>(15);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const now = new Date();
      let startDate: string;
      let endDate: string;

      if (horizon === 'SHIFT') {
        const start = new Date(now);
        start.setHours(start.getHours() - 1, 0, 0, 0);
        const end = new Date(start.getTime() + 8 * 3600 * 1000);
        startDate = start.toISOString();
        endDate = end.toISOString();
      } else if (horizon === 'DAY') {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime() + 24 * 3600 * 1000);
        startDate = start.toISOString();
        endDate = end.toISOString();
      } else {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
        startDate = start.toISOString();
        endDate = end.toISOString();
      }

      const [timelineRes, backlogRes, changeoversRes, machinesRes, moldsRes] = await Promise.all([
        api.getSchedulingTimeline(startDate, endDate),
        api.getSchedulingBacklog(),
        api.getMoldChangeovers(),
        api.getMachines(),
        api.getMolds(),
      ]);

      setTimelineData(timelineRes);
      setBacklogOrders(backlogRes);
      setChangeovers(changeoversRes);
      setMachines(machinesRes);
      setMolds(moldsRes);
    } catch (err) {
      console.error('Failed to load scheduling data:', err);
      setError(err instanceof Error ? err.message : 'Error loading timeline schedule');
    } finally {
      setIsLoading(false);
    }
  }, [horizon]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const { connected, subscribeModule, unsubscribeModule } = useTelemetrySocket({
    onSchedulingUpdated: () => {
      void loadData();
    },
  });

  useEffect(() => {
    subscribeModule('scheduling');
    return () => {
      unsubscribeModule('scheduling');
    };
  }, [subscribeModule, unsubscribeModule]);

  // Compute timeline boundaries and hours for grid headers
  const timeHeaderSlots = useMemo(() => {
    if (!timelineData) return [];
    const start = new Date(timelineData.horizonStart);
    const end = new Date(timelineData.horizonEnd);
    const totalMs = end.getTime() - start.getTime();

    const slots: Array<{ label: string; subLabel: string; percent: number }> = [];
    const count = horizon === 'SHIFT' ? 8 : horizon === 'DAY' ? 12 : 7;
    const intervalMs = totalMs / count;

    for (let i = 0; i < count; i++) {
      const slotTime = new Date(start.getTime() + i * intervalMs);
      const percent = (i / count) * 100;

      let label = '';
      let subLabel = '';

      if (horizon === 'SHIFT') {
        label = slotTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        subLabel = `+${i}h`;
      } else if (horizon === 'DAY') {
        label = slotTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        subLabel = slotTime.getHours() < 12 ? 'AM' : 'PM';
      } else {
        label = slotTime.toLocaleDateString([], { weekday: 'short' });
        subLabel = slotTime.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
      }

      slots.push({ label, subLabel, percent });
    }

    return slots;
  }, [timelineData, horizon]);

  // Calculate position and width of a block relative to the horizon
  const getBlockStyle = (block: TimelineBlock) => {
    if (!timelineData) return { left: '0%', width: '0%' };
    const horizonStart = new Date(timelineData.horizonStart).getTime();
    const horizonEnd = new Date(timelineData.horizonEnd).getTime();
    const totalDuration = horizonEnd - horizonStart;

    const blockStart = Math.max(horizonStart, new Date(block.startTime).getTime());
    const blockEnd = Math.min(horizonEnd, new Date(block.endTime).getTime());

    if (blockEnd <= horizonStart || blockStart >= horizonEnd) {
      return { display: 'none' };
    }

    const leftPercent = ((blockStart - horizonStart) / totalDuration) * 100;
    const widthPercent = Math.max(1.5, ((blockEnd - blockStart) / totalDuration) * 100);

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  // Schedule an order
  const handleOpenScheduleModal = useCallback((order: ProductionOrder) => {
    setOrderToSchedule(order);
    setScheduleMachineId(machines[0]?.id ?? '');
    setScheduleMoldId(molds[0]?.id ?? '');
    const nowIso = new Date(Date.now()).toISOString().slice(0, 16);
    setScheduleStartTime(nowIso);
    setSchedulePriority(order.priority ?? 3);
    setScheduleNotes(order.schedulingNotes ?? '');
    setIsScheduleModalOpen(true);
  }, [machines, molds]);

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToSchedule) return;
    setIsSaving(true);
    try {
      await api.scheduleOrder(orderToSchedule.id, {
        machineId: scheduleMachineId,
        moldId: scheduleMoldId,
        plannedStartTime: new Date(scheduleStartTime).toISOString(),
        priority: Number(schedulePriority),
        schedulingNotes: scheduleNotes || undefined,
      });
      setIsScheduleModalOpen(false);
      setOrderToSchedule(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to schedule order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnschedule = async (orderId: string) => {
    if (!confirm('Revert this order back to the unscheduled backlog?')) return;
    setIsSaving(true);
    try {
      await api.unscheduleOrder(orderId);
      setSelectedBlock(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unschedule order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReleaseOrder = async (orderId: string) => {
    setIsSaving(true);
    try {
      await api.releaseScheduledOrder(orderId);
      setSelectedBlock(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to release order to shop floor');
    } finally {
      setIsSaving(false);
    }
  };

  // Drag and Drop Helper & Handlers
  const getCompatibleMoldForProduct = useCallback(
    (productId: string) => {
      const matchingMold = molds.find((m) =>
        m.compatibilities?.some((c) => c.productId === productId),
      );
      return matchingMold ?? molds[0];
    },
    [molds],
  );

  const handleTrackDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, machineId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!timelineData) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const ratio = x / rect.width;

      const startMs = new Date(timelineData.horizonStart).getTime();
      const endMs = new Date(timelineData.horizonEnd).getTime();
      const totalMs = endMs - startMs;
      const rawTimeMs = startMs + ratio * totalMs;

      // Snap to 15-minute grid intervals
      const snapIntervalMs = 15 * 60 * 1000;
      const snappedMs = Math.round(rawTimeMs / snapIntervalMs) * snapIntervalMs;
      const clampedMs = Math.max(startMs, Math.min(snappedMs, endMs - 15 * 60 * 1000));
      const snappedTime = new Date(clampedMs);

      const snappedPercent = ((clampedMs - startMs) / totalMs) * 100;
      const duration = activeDragItem?.durationMinutes ?? 120;
      const slotStart = clampedMs;
      const slotEnd = clampedMs + duration * 60 * 1000;

      // Real-time Conflict Validation during drag
      let conflict: DragOverSlotState['conflict'] = null;
      const targetMachine = machines.find((m) => m.id === machineId);
      const targetTonnage = targetMachine?.clampingTonnage ?? 150;
      const activeMoldCode = activeDragItem?.moldCode;

      // 1. Tonnage Check
      if (activeMoldCode?.toUpperCase().includes('BUMP') && targetTonnage < 450) {
        conflict = {
          type: 'TONNAGE_MISMATCH',
          message: `Tonnage Deficit: Mold ${activeMoldCode} requires ≥ 450T (Machine is ${targetTonnage}T)`,
        };
      }

      // 2. Tooling / Mold Collision Check across all machines
      if (!conflict && activeDragItem?.moldId) {
        for (const mRow of timelineData.machines) {
          if (mRow.machineId === machineId) continue;
          for (const blk of mRow.blocks) {
            if (blk.orderId === activeDragItem.orderId) continue;
            if (blk.moldId === activeDragItem.moldId) {
              const bStart = new Date(blk.startTime).getTime();
              const bEnd = new Date(blk.endTime).getTime();
              if (slotStart < bEnd && slotEnd > bStart) {
                conflict = {
                  type: 'TOOLING_COLLISION',
                  message: `Tooling Collision: Mold ${blk.moldCode ?? 'assigned'} is already running on ${mRow.machineCode}`,
                };
                break;
              }
            }
          }
          if (conflict) break;
        }
      }

      // 3. Machine Overlap Check on the target track
      if (!conflict) {
        const targetRow = timelineData.machines.find((m) => m.machineId === machineId);
        if (targetRow) {
          for (const blk of targetRow.blocks) {
            if (blk.orderId === activeDragItem?.orderId) continue;
            const bStart = new Date(blk.startTime).getTime();
            const bEnd = new Date(blk.endTime).getTime();
            if (slotStart < bEnd && slotEnd > bStart) {
              conflict = {
                type: 'MACHINE_OVERLAP',
                message: `Schedule Overlap: Slot overlaps with ${blk.orderNumber ?? 'scheduled block'}`,
              };
              break;
            }
          }
        }
      }

      setDragOverSlot({
        machineId,
        snappedTime,
        percent: snappedPercent,
        timeString: snappedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        durationMinutes: duration,
        conflict,
      });
    },
    [timelineData, activeDragItem, machines],
  );

  const handleTrackDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      setDragOverSlot(null);
    }
  }, []);

  const handleTrackDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>, targetMachineId: string) => {
      e.preventDefault();
      setDragOverSlot(null);
      setIsDragging(false);

      try {
        const dataStr = e.dataTransfer.getData('application/json');
        if (!dataStr) return;
        const data = JSON.parse(dataStr) as {
          source: 'BACKLOG' | 'TIMELINE';
          orderId: string;
          orderNumber: string;
          productId?: string;
          targetQuantity?: number;
        };

        if (!timelineData) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const ratio = x / rect.width;

        const startMs = new Date(timelineData.horizonStart).getTime();
        const endMs = new Date(timelineData.horizonEnd).getTime();
        const totalMs = endMs - startMs;
        const rawTimeMs = startMs + ratio * totalMs;

        // Snap to 15-minute grid intervals
        const snapIntervalMs = 15 * 60 * 1000;
        const snappedMs = Math.round(rawTimeMs / snapIntervalMs) * snapIntervalMs;
        const clampedMs = Math.max(startMs, Math.min(snappedMs, endMs - 15 * 60 * 1000));
        const snappedTime = new Date(clampedMs);

        setIsSaving(true);
        const targetMachine = machines.find((m) => m.id === targetMachineId);
        const machineCode = targetMachine?.code ?? 'Machine';
        const timeDisplay = snappedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (data.source === 'BACKLOG') {
          const order = backlogOrders.find((o) => o.id === data.orderId);
          const mold = order ? getCompatibleMoldForProduct(order.productId) : molds[0];

          await api.scheduleOrder(data.orderId, {
            machineId: targetMachineId,
            moldId: mold?.id ?? molds[0]?.id ?? '',
            plannedStartTime: snappedTime.toISOString(),
            priority: order?.priority ?? 3,
          });

          setFeedbackToast({
            type: 'success',
            message: `Order ${data.orderNumber} successfully scheduled on ${machineCode} starting at ${timeDisplay}.`,
          });
        } else if (data.source === 'TIMELINE') {
          await api.rescheduleOrder(data.orderId, {
            machineId: targetMachineId,
            plannedStartTime: snappedTime.toISOString(),
          });

          setFeedbackToast({
            type: 'success',
            message: `Order ${data.orderNumber} successfully relocated to ${machineCode} at ${timeDisplay}.`,
          });
        }

        await loadData();
      } catch (err) {
        console.error('Drag and drop scheduling failed:', err);
        setFeedbackToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to reschedule order via drag & drop',
        });
      } finally {
        setIsSaving(false);
        setActiveDragItem(null);
      }
    },
    [timelineData, machines, backlogOrders, molds, getCompatibleMoldForProduct, loadData],
  );

  const handleSaveChangeover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coFromMoldId || !coToMoldId) {
      alert('Please select both from and to molds');
      return;
    }
    setIsSaving(true);
    try {
      await api.upsertMoldChangeover({
        fromMoldId: coFromMoldId,
        toMoldId: coToMoldId,
        setupMinutes: Number(coSetupMinutes),
        purgeMinutes: Number(coPurgeMinutes),
      });
      setIsChangeoverModalOpen(false);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save changeover rule');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#292A2E] tracking-tight">
            Production scheduling & mold changeovers
          </h1>
          <p className="text-xs text-[#505258] mt-0.5">
            Multi-machine Gantt dispatch timeline, automated mold setup calculations, and tooling conflict auditing.
          </p>
        </div>

        {/* Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Horizon Switcher */}
          <div className="flex items-center rounded-md border border-[#0B120E24] bg-[#FFFFFF] p-0.5 shadow-2xs">
            {(
              [
                { id: 'SHIFT', label: 'Shift (8h)' },
                { id: 'DAY', label: 'Day (24h)' },
                { id: 'WEEK', label: 'Week (7d)' },
              ] as const
            ).map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setHorizon(h.id)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  horizon === h.id
                    ? 'bg-[#1868DB] text-white shadow-2xs'
                    : 'text-[#505258] hover:text-[#292A2E] hover:bg-[#091E420F]'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>

          {/* Changeover Matrix Button */}
          <button
            type="button"
            onClick={() => setIsChangeoverModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[32px] rounded-md text-xs font-semibold bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] border border-[#0B120E24] transition-colors shadow-2xs"
          >
            <Sliders className="h-3.5 w-3.5 text-[#505258]" />
            <span>Changeover matrix</span>
          </button>

          {/* Drag & Drop Hint Badge */}
          <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[32px] rounded-md text-xs font-medium bg-[#E9F2FE] border border-[#0B120E24] text-[#123263]">
            <Move className="h-3.5 w-3.5 text-[#1868DB]" />
            <span>Drag & drop: snap 15m</span>
          </div>

          {/* Unscheduled Backlog Toggle */}
          <button
            type="button"
            onClick={() => setIsBacklogOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[32px] rounded-md text-xs font-semibold transition-colors shadow-2xs ${
              isBacklogOpen
                ? 'bg-[#1868DB] text-white border border-[#1868DB]'
                : 'bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] border border-[#0B120E24]'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Backlog</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${
                isBacklogOpen ? 'bg-white text-[#1868DB]' : 'bg-[#E9F2FE] text-[#123263]'
              }`}
            >
              {backlogOrders.length}
            </span>
          </button>

          {/* Live Sync Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[32px] rounded-md text-xs font-semibold ${
              connected
                ? 'bg-[#E3FCEF] text-[#006644] border border-[#ABF5D1]'
                : 'bg-[#F1F2F4] text-[#505258] border border-[#DCDFE4]'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? 'bg-[#00875A] animate-pulse' : 'bg-[#8C8F97]'
              }`}
            />
            {connected ? 'Live Sync' : 'Connecting'}
          </span>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={isLoading}
            className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-md bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#505258] border border-[#0B120E24] transition-colors shadow-2xs"
            title="Refresh scheduling data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-[#1868DB]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3.5 rounded-lg bg-[#FFECEB] border border-[#E2483D] text-[#AE2E24] text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#505258] text-xs mb-1">
            <span>Scheduled orders</span>
            <Calendar className="h-4 w-4 text-[#1868DB]" />
          </div>
          <span className="text-xl font-bold font-mono text-[#292A2E]">
            {timelineData?.summary.totalScheduledOrders ?? 0}
          </span>
          <p className="text-xs text-[#6B6E76] mt-0.5">Across 10 injection machines</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#505258] text-xs mb-1">
            <span>Tooling conflicts</span>
            <ShieldAlert
              className={`h-4 w-4 ${
                (timelineData?.summary.activeConflictsCount ?? 0) > 0 ? 'text-[#C9372C]' : 'text-[#6A9A23]'
              }`}
            />
          </div>
          <span
            className={`text-xl font-bold font-mono ${
              (timelineData?.summary.activeConflictsCount ?? 0) > 0 ? 'text-[#C9372C]' : 'text-[#37471F]'
            }`}
          >
            {timelineData?.summary.activeConflictsCount ?? 0}
          </span>
          <p className="text-xs text-[#6B6E76] mt-0.5">Tonnage & concurrent tool collisions</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#505258] text-xs mb-1">
            <span>Mold changeovers</span>
            <Sliders className="h-4 w-4 text-[#E06C00]" />
          </div>
          <span className="text-xl font-bold font-mono text-[#693200]">
            {timelineData?.summary.totalChangeovers ?? 0}
          </span>
          <p className="text-xs text-[#6B6E76] mt-0.5">Tooling swaps & barrel purges</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#505258] text-xs mb-1">
            <span>Scheduled runtime</span>
            <Clock className="h-4 w-4 text-[#216E4E]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-[#216E4E]">
              {timelineData?.summary.scheduledHours ?? 0}
            </span>
            <span className="text-xs text-[#6B6E76]">hours</span>
          </div>
          <p className="text-xs text-[#6B6E76] mt-0.5">Total planned machine time</p>
        </div>
      </div>

      {/* Main Interactive Gantt Canvas & Backlog Drawer Layout */}
      <div className="flex gap-4 items-start relative">
        {/* Left: Gantt Timeline Board */}
        <div className="flex-1 min-w-0 bg-[#FFFFFF] border border-[#0B120E24] rounded-lg shadow-2xs overflow-hidden">
          {/* Timeline Time Header */}
          <div className="flex border-b border-[#0B120E24] bg-[#F8F8F8]">
            {/* Sticky Machine Column Header */}
            <div className="w-48 sm:w-56 p-3 border-r border-[#0B120E24] text-xs font-bold text-[#6B6E76] uppercase tracking-wider flex-shrink-0">
              Machine (IMM)
            </div>

            {/* Time Axis Slots */}
            <div className="flex-1 relative h-12 flex items-center overflow-hidden">
              {timeHeaderSlots.map((slot, idx) => (
                <div
                  key={idx}
                  style={{ left: `${slot.percent}%` }}
                  className="absolute top-0 bottom-0 border-l border-[#0B120E24] pl-2 flex flex-col justify-center"
                >
                  <span className="text-xs font-semibold text-[#292A2E]">{slot.label}</span>
                  <span className="text-xs text-[#6B6E76]">{slot.subLabel}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Machine Rows */}
          <div className="divide-y divide-[#0B120E24]">
            {timelineData?.machines.map((machine) => (
              <div key={machine.machineId} className="flex min-h-[64px] hover:bg-[#F8F8F8]/50 transition-colors">
                {/* Machine Header Cell */}
                <div className="w-48 sm:w-56 p-2.5 border-r border-[#0B120E24] flex items-center justify-between flex-shrink-0 bg-[#FFFFFF]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#292A2E] truncate">{machine.machineCode}</span>
                      <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-[#E9F2FE] text-[#123263]">
                        {machine.clampingTonnage}T
                      </span>
                    </div>
                    <p className="text-xs text-[#6B6E76] truncate">{machine.machineName}</p>
                  </div>

                  {/* Status dot */}
                  <span
                    className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                      machine.currentStatus === 'RUNNING'
                        ? 'bg-[#22A06B]'
                        : machine.currentStatus === 'FAULT'
                          ? 'bg-[#C9372C] animate-pulse'
                          : 'bg-[#B38600]'
                    }`}
                    title={`Status: ${machine.currentStatus}`}
                  />
                </div>

                {/* Track Canvas & Dropzone */}
                <div
                  onDragOver={(e) => handleTrackDragOver(e, machine.machineId)}
                  onDragLeave={handleTrackDragLeave}
                  onDrop={(e) => void handleTrackDrop(e, machine.machineId)}
                  className={`flex-1 relative h-16 transition-colors ${
                    dragOverSlot?.machineId === machine.machineId
                      ? 'bg-[#1868DB]/10 ring-2 ring-inset ring-[#1868DB]'
                      : isDragging
                        ? 'bg-[#F4F7FC]/60'
                        : 'bg-[#FFFFFF]'
                  }`}
                >
                  {/* Background grid lines matching timeHeaderSlots */}
                  {timeHeaderSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      style={{ left: `${slot.percent}%` }}
                      className="absolute top-0 bottom-0 border-l border-[#0B120E12] pointer-events-none"
                    />
                  ))}

                  {/* Drag & Drop Ghost Slot Preview with Real-time Conflict Guard */}
                  {dragOverSlot && dragOverSlot.machineId === machine.machineId && (
                    <div
                      style={{
                        left: `${dragOverSlot.percent}%`,
                        width: `${Math.max(
                          6,
                          ((dragOverSlot.durationMinutes * 60 * 1000) /
                            (new Date(timelineData!.horizonEnd).getTime() - new Date(timelineData!.horizonStart).getTime())) *
                            100
                        )}%`,
                      }}
                      className={`absolute top-1.5 bottom-1.5 z-30 pointer-events-none rounded-md border-2 border-dashed flex items-center justify-between px-2 text-xs font-bold shadow-md transition-all ${
                        dragOverSlot.conflict
                          ? 'border-[#E2483D] bg-[#FFECEB]/90 text-[#AE2E24]'
                          : 'border-[#1868DB] bg-[#E9F2FE]/90 text-[#123263]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {dragOverSlot.conflict ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-[#C9372C] flex-shrink-0 animate-bounce" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-[#1868DB] flex-shrink-0" />
                        )}
                        <span className="truncate">
                          {dragOverSlot.conflict
                            ? dragOverSlot.conflict.message
                            : `${activeDragItem?.orderNumber ?? 'Slot'}: ${dragOverSlot.timeString}`}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-1 rounded flex-shrink-0 border ${
                          dragOverSlot.conflict
                            ? 'bg-white text-[#AE2E24] border-[#E2483D]'
                            : 'bg-white/90 text-[#123263] border-[#1868DB]/30'
                        }`}
                      >
                        {dragOverSlot.durationMinutes}m
                      </span>
                    </div>
                  )}

                  {/* Render Order Blocks & Changeover Slots */}
                  {machine.blocks.map((block) => {
                    const style = getBlockStyle(block);
                    const isChangeover = block.blockType === 'MOLD_CHANGEOVER';
                    const hasConflict = block.conflicts && block.conflicts.length > 0;
                    const isSelected = selectedBlock?.id === block.id;
                    const isDraggable =
                      !isChangeover &&
                      (block.status === 'SCHEDULED' || block.status === 'RELEASED');
                    const isCurrentlyDragged = activeDragItem?.orderId === block.orderId;

                    return (
                      <button
                        type="button"
                        key={block.id}
                        style={style}
                        draggable={isDraggable}
                        onDragStart={
                          isDraggable
                            ? (e) => {
                                e.stopPropagation();
                                setIsDragging(true);
                                setActiveDragItem({
                                  source: 'TIMELINE',
                                  orderId: block.orderId!,
                                  orderNumber: block.orderNumber!,
                                  durationMinutes: block.durationMinutes,
                                  productName: block.productName,
                                  moldId: block.moldId,
                                  moldCode: block.moldCode,
                                });
                                e.dataTransfer.setData(
                                  'application/json',
                                  JSON.stringify({
                                    source: 'TIMELINE',
                                    orderId: block.orderId,
                                    orderNumber: block.orderNumber,
                                    fromMachineId: machine.machineId,
                                    durationMinutes: block.durationMinutes,
                                    moldId: block.moldId,
                                    moldCode: block.moldCode,
                                  }),
                                );
                                e.dataTransfer.effectAllowed = 'move';
                              }
                            : undefined
                        }
                        onDragEnd={
                          isDraggable
                            ? () => {
                                setIsDragging(false);
                                setDragOverSlot(null);
                                setActiveDragItem(null);
                              }
                            : undefined
                        }
                        onClick={() => setSelectedBlock(block)}
                        className={`absolute top-1.5 bottom-1.5 rounded-md px-2 py-1 flex flex-col justify-between transition-all shadow-2xs overflow-hidden border text-left ${
                          isCurrentlyDragged
                            ? 'opacity-40 ring-2 ring-[#1868DB]'
                            : ''
                        } ${
                          isDraggable
                            ? 'cursor-grab active:cursor-grabbing hover:shadow-md'
                            : 'cursor-pointer'
                        } ${
                          isChangeover
                            ? 'bg-[#FFF5DB] border-dashed border-[#E06C00] text-[#693200]'
                            : block.status === 'IN_PROGRESS'
                              ? 'bg-[#EFFFD6] border-[#6A9A23] text-[#37471F]'
                              : isSelected
                                ? 'bg-[#E9F2FE] border-[#1868DB] ring-2 ring-[#1868DB]/30'
                                : 'bg-[#E9F2FE] border-[#8FB8F6] text-[#123263] hover:border-[#1868DB]'
                        }`}
                        title={`${block.productName ?? block.orderNumber} (${block.durationMinutes}m)${
                          isDraggable ? ' — Drag to shift time or machine' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 overflow-hidden">
                          <div className="flex items-center gap-1 min-w-0">
                            {isDraggable && (
                              <GripVertical className="h-3 w-3 text-[#1868DB] opacity-60 hover:opacity-100 flex-shrink-0" />
                            )}
                            <span className="text-xs font-bold truncate">
                              {isChangeover ? block.productName : block.orderNumber}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {hasConflict && (
                              <AlertTriangle className="h-3 w-3 text-[#C9372C] animate-pulse" />
                            )}
                            {block.moldCode && (
                              <span className="text-xs font-mono font-medium px-1 rounded bg-white/70 border border-[#0B120E24]">
                                {block.moldCode}
                              </span>
                            )}
                          </div>
                        </div>

                        {!isChangeover && (
                          <div className="flex items-center justify-between text-xs text-[#505258]">
                            <span className="truncate">{block.productName}</span>
                            <span className="font-mono font-bold flex-shrink-0">
                              {block.targetQuantity} pcs
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Unscheduled Backlog Drawer */}
        {isBacklogOpen && (
          <aside
            aria-label="Unscheduled backlog orders"
            className="w-80 bg-[#FFFFFF] border border-[#0B120E24] rounded-lg shadow-md p-4 space-y-3 flex-shrink-0"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#0B120E24]">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#1868DB]" />
                <h2 className="text-sm font-bold text-[#292A2E]">Unscheduled backlog</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsBacklogOpen(false)}
                className="p-1 rounded text-[#505258] hover:text-[#292A2E]"
                aria-label="Close backlog drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[11px] text-[#505258] leading-tight">
              Drag orders onto any machine timeline slot to schedule, or click Options to customize.
            </p>

            {backlogOrders.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#6B6E76]">
                <CheckCircle2 className="h-8 w-8 text-[#22A06B] mx-auto mb-2" />
                <span>All production orders are currently scheduled!</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {backlogOrders.map((order) => (
                  <div
                    key={order.id}
                    draggable={true}
                    onDragStart={(e) => {
                      setIsDragging(true);
                      const compMold = getCompatibleMoldForProduct(order.productId);
                      setActiveDragItem({
                        source: 'BACKLOG',
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        durationMinutes: 120,
                        productName: order.product?.name,
                        moldId: compMold?.id,
                        moldCode: compMold?.code,
                      });
                      e.dataTransfer.setData(
                        'application/json',
                        JSON.stringify({
                          source: 'BACKLOG',
                          orderId: order.id,
                          orderNumber: order.orderNumber,
                          productId: order.productId,
                          targetQuantity: order.targetQuantity,
                          moldId: compMold?.id,
                          moldCode: compMold?.code,
                        }),
                      );
                      e.dataTransfer.effectAllowed = 'copyMove';
                    }}
                    onDragEnd={() => {
                      setIsDragging(false);
                      setDragOverSlot(null);
                      setActiveDragItem(null);
                    }}
                    className={`p-3 rounded-lg border transition-all space-y-2 cursor-grab active:cursor-grabbing group shadow-2xs select-none ${
                      activeDragItem?.orderId === order.id
                        ? 'opacity-40 border-[#1868DB] ring-2 ring-[#1868DB]/20 bg-[#FFFFFF]'
                        : 'border-[#0B120E24] bg-[#F8F8F8] hover:border-[#1868DB] hover:bg-[#FFFFFF]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <GripVertical className="h-4 w-4 text-[#6B6E76] group-hover:text-[#1868DB] flex-shrink-0" />
                        <span className="text-xs font-bold text-[#292A2E] truncate">{order.orderNumber}</span>
                        {order.externalOrderRef && (
                          <span className="text-[10px] font-bold px-1 rounded bg-purple-100 text-purple-700 border border-purple-200 flex-shrink-0" title={`PPSS Ref: ${order.externalOrderRef}`}>
                            PPSS
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-bold px-1.5 py-0.2 rounded flex-shrink-0 ${
                          order.priority === 1
                            ? 'bg-[#FFECEB] text-[#AE2E24]'
                            : order.priority === 2
                              ? 'bg-[#FFF5DB] text-[#693200]'
                              : 'bg-[#E9F2FE] text-[#123263]'
                        }`}
                      >
                        {order.priority === 1 ? 'Rush' : order.priority === 2 ? 'High' : 'Normal'}
                      </span>
                    </div>

                    <div className="text-xs text-[#505258]">
                      <p className="font-medium text-[#292A2E] truncate">{order.product?.name}</p>
                      <div className="flex items-center justify-between font-mono text-[11px] mt-0.5">
                        <span>Target: {order.targetQuantity} parts</span>
                        {order.dueDate && (
                          <span className="text-[#693200] bg-[#FFF5DB] px-1 py-0.2 rounded border border-[#F5CD47]/50" title={`Deadline: ${new Date(order.dueDate).toLocaleString()}`}>
                            Due: {new Date(order.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {order.suggestedMachineCode && (
                        <p className="text-[10px] text-[#1868DB] font-mono mt-0.5">
                          Suggested Line: {order.suggestedMachineCode}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 gap-2">
                      <span className="text-[11px] text-[#505258] italic flex items-center gap-1 truncate">
                        <Move className="h-3 w-3 text-[#1868DB] flex-shrink-0" />
                        <span>Drag to timeline</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenScheduleModal(order)}
                        className="inline-flex items-center gap-1 py-1 px-2 rounded-md text-xs font-semibold bg-[#FFFFFF] hover:bg-[#F0F0F0] text-[#1868DB] border border-[#0B120E24] transition-colors flex-shrink-0"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Options</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Selected Block Detail Popover / Bottom Sheet */}
      {selectedBlock && (
        <div className="p-4 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-md flex items-center justify-center text-white ${
                selectedBlock.blockType === 'MOLD_CHANGEOVER' ? 'bg-[#E06C00]' : 'bg-[#1868DB]'
              }`}
            >
              {selectedBlock.blockType === 'MOLD_CHANGEOVER' ? (
                <Sliders className="h-4 w-4" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#292A2E]">
                  {selectedBlock.orderNumber ?? selectedBlock.productName}
                </span>
                <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-[#F8F8F8] border border-[#0B120E24] text-[#505258]">
                  {selectedBlock.durationMinutes} mins
                </span>
                <span className="text-xs font-semibold uppercase px-1.5 py-0.2 rounded bg-[#E9F2FE] text-[#123263]">
                  {selectedBlock.status}
                </span>
                {selectedBlock.externalOrderRef && (
                  <span className="text-xs font-semibold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">
                    PPSS: {selectedBlock.externalOrderRef}
                  </span>
                )}
                {selectedBlock.dueDate && (
                  <span className="text-xs font-medium px-1.5 py-0.2 rounded bg-[#FFF5DB] text-[#693200] border border-[#F5CD47]/60">
                    Due: {new Date(selectedBlock.dueDate).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#505258] mt-0.5">
                {new Date(selectedBlock.startTime).toLocaleString()} →{' '}
                {new Date(selectedBlock.endTime).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Conflict warnings */}
          {selectedBlock.conflicts && (
            <div className="flex flex-col gap-1 max-w-md">
              {selectedBlock.conflicts.map((c, i) => (
                <div
                  key={i}
                  className="px-2 py-1 rounded bg-[#FFECEB] border border-[#E2483D] text-[#AE2E24] text-xs flex items-center gap-1.5"
                >
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{c.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {selectedBlock.orderId && selectedBlock.status === 'SCHEDULED' && (
              <button
                type="button"
                onClick={() => void handleReleaseOrder(selectedBlock.orderId!)}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#22A06B] hover:bg-[#164B35] text-white shadow-2xs transition-colors"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Release to shop floor</span>
              </button>
            )}

            {selectedBlock.orderId && (
              <button
                type="button"
                onClick={() => void handleUnschedule(selectedBlock.orderId!)}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#AE2E24] hover:bg-[#FFECEB] transition-colors"
              >
                <span>Unschedule</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedBlock(null)}
              className="p-1.5 rounded-md text-[#505258] hover:bg-[#091E420F]"
              aria-label="Dismiss details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Schedule Order Modal */}
      {isScheduleModalOpen && orderToSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E427A] p-4 backdrop-blur-2xs">
          <div className="max-w-md w-full bg-[#FFFFFF] rounded-lg border border-[#0B120E24] shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#0B120E24]">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#1868DB]" />
                <h2 className="text-base font-bold text-[#292A2E]">Schedule production order</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 rounded text-[#505258] hover:text-[#292A2E]"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-[#F8F8F8] rounded-md text-xs space-y-1">
              <p className="font-bold text-[#292A2E]">{orderToSchedule.orderNumber}</p>
              <p className="text-[#505258]">Product: {orderToSchedule.product?.name}</p>
              <p className="text-[#505258]">Target: {orderToSchedule.targetQuantity} parts</p>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-3">
              <div>
                <label htmlFor="sched-machine-select" className="block text-xs font-bold text-[#292A2E] mb-1">
                  Target machine (IMM)
                </label>
                <select
                  id="sched-machine-select"
                  value={scheduleMachineId}
                  onChange={(e) => setScheduleMachineId(e.target.value)}
                  required
                  className="w-full bg-[#FFFFFF] border border-[#0B120E24] rounded-md px-3 py-1.5 text-xs text-[#292A2E] focus:outline-none focus:ring-1 focus:ring-[#1868DB]"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.name} ({m.clampingTonnage ?? m.tonnage ?? 150}T)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sched-mold-select" className="block text-xs font-bold text-[#292A2E] mb-1">
                  Assigned mold / tooling
                </label>
                <select
                  id="sched-mold-select"
                  value={scheduleMoldId}
                  onChange={(e) => setScheduleMoldId(e.target.value)}
                  required
                  className="w-full bg-[#FFFFFF] border border-[#0B120E24] rounded-md px-3 py-1.5 text-xs text-[#292A2E] focus:outline-none focus:ring-1 focus:ring-[#1868DB]"
                >
                  {molds.map((mold) => (
                    <option key={mold.id} value={mold.id}>
                      {mold.code} — {mold.name} ({mold.cavityCount} cavities)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sched-start-time" className="block text-xs font-bold text-[#292A2E] mb-1">
                  Planned start time
                </label>
                <input
                  id="sched-start-time"
                  type="datetime-local"
                  value={scheduleStartTime}
                  onChange={(e) => setScheduleStartTime(e.target.value)}
                  required
                  className="w-full bg-[#FFFFFF] border border-[#0B120E24] rounded-md px-3 py-1.5 text-xs text-[#292A2E] focus:outline-none focus:ring-1 focus:ring-[#1868DB]"
                />
              </div>

              <div>
                <label htmlFor="sched-priority-select" className="block text-xs font-bold text-[#292A2E] mb-1">
                  Order priority
                </label>
                <select
                  id="sched-priority-select"
                  value={schedulePriority}
                  onChange={(e) => setSchedulePriority(Number(e.target.value))}
                  className="w-full bg-[#FFFFFF] border border-[#0B120E24] rounded-md px-3 py-1.5 text-xs text-[#292A2E] focus:outline-none focus:ring-1 focus:ring-[#1868DB]"
                >
                  <option value={1}>1 — Urgent / Rush</option>
                  <option value={2}>2 — High</option>
                  <option value={3}>3 — Normal</option>
                  <option value={4}>4 — Low</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#0B120E24]">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-[#505258] hover:bg-[#091E420F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#1868DB] hover:bg-[#1558BC] text-white shadow-2xs"
                >
                  {isSaving ? 'Calculating...' : 'Schedule onto track'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mold Changeover Matrix Modal */}
      {isChangeoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E427A] p-4 backdrop-blur-2xs">
          <div className="max-w-2xl w-full bg-[#FFFFFF] rounded-lg border border-[#0B120E24] shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#0B120E24]">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-[#E06C00]" />
                <h2 className="text-base font-bold text-[#292A2E]">Mold changeover setup matrix</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeoverModalOpen(false)}
                className="p-1 rounded text-[#505258] hover:text-[#292A2E]"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-[#505258]">
              Standardized mechanical setup times (unclamping, crane mounting, water line hookup) and resin barrel purge stabilization times.
            </p>

            {/* Changeover Rules Table */}
            <div className="max-h-60 overflow-y-auto border border-[#0B120E24] rounded-md">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8F8F8] border-b border-[#0B120E24] text-[#6B6E76]">
                  <tr>
                    <th className="p-2.5 font-bold uppercase tracking-wider">From mold</th>
                    <th className="p-2.5 font-bold uppercase tracking-wider">To mold</th>
                    <th className="p-2.5 font-bold uppercase tracking-wider">Setup</th>
                    <th className="p-2.5 font-bold uppercase tracking-wider">Purge</th>
                    <th className="p-2.5 font-bold uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0B120E24]">
                  {changeovers.map((co) => (
                    <tr key={co.id} className="hover:bg-[#F8F8F8]">
                      <td className="p-2.5 font-bold text-[#292A2E]">{co.fromMold?.code ?? co.fromMoldId}</td>
                      <td className="p-2.5 font-bold text-[#292A2E]">{co.toMold?.code ?? co.toMoldId}</td>
                      <td className="p-2.5 font-mono">{co.setupMinutes}m</td>
                      <td className="p-2.5 font-mono">{co.purgeMinutes}m</td>
                      <td className="p-2.5 font-mono font-bold text-[#E06C00]">
                        {co.setupMinutes + co.purgeMinutes}m
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add / Update Rule Form */}
            <form onSubmit={handleSaveChangeover} className="p-3 bg-[#F8F8F8] rounded-md border border-[#0B120E24] space-y-3">
              <h3 className="text-xs font-bold text-[#292A2E]">Define pairwise transition rule</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label htmlFor="co-from-select" className="block text-xs text-[#6B6E76] mb-1">
                    From mold
                  </label>
                  <select
                    id="co-from-select"
                    value={coFromMoldId}
                    onChange={(e) => setCoFromMoldId(e.target.value)}
                    required
                    className="w-full bg-[#FFFFFF] border border-[#0B120E24] rounded px-2 py-1 text-xs"
                  >
                    <option value="">Select mold</option>
                    {molds.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="co-to-select" className="block text-xs text-[#6B6E76] mb-1">
                    To mold
                  </label>
                  <select
                    id="co-to-select"
                    value={coToMoldId}
                    onChange={(e) => setCoToMoldId(e.target.value)}
                    required
                    className="w-full bg-[#FFFFFF] border border-[#0B120E24] rounded px-2 py-1 text-xs"
                  >
                    <option value="">Select mold</option>
                    {molds.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="co-setup-mins" className="block text-xs text-[#6B6E76] mb-1">
                    Setup (mins)
                  </label>
                  <input
                    id="co-setup-mins"
                    type="number"
                    min="1"
                    value={coSetupMinutes}
                    onChange={(e) => setCoSetupMinutes(Number(e.target.value))}
                    required
                    className="w-full bg-[#FFFFFF] border border-[#0B120E24] rounded px-2 py-1 text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="co-purge-mins" className="block text-xs text-[#6B6E76] mb-1">
                    Purge (mins)
                  </label>
                  <input
                    id="co-purge-mins"
                    type="number"
                    min="0"
                    value={coPurgeMinutes}
                    onChange={(e) => setCoPurgeMinutes(Number(e.target.value))}
                    required
                    className="w-full bg-[#FFFFFF] border border-[#0B120E24] rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-[#E06C00] hover:bg-[#693200] text-white transition-colors"
                >
                  Save changeover rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Feedback Toast */}
      {feedbackToast && (
        <output
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 max-w-md p-3.5 rounded-lg border shadow-lg flex items-start gap-2.5 transition-all ${
            feedbackToast.type === 'success'
              ? 'bg-[#E3FCEF] border-[#22A06B] text-[#164B35]'
              : feedbackToast.type === 'warning'
                ? 'bg-[#FFF5DB] border-[#E06C00] text-[#693200]'
                : 'bg-[#FFECEB] border-[#E2483D] text-[#AE2E24]'
          }`}
        >
          {feedbackToast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-[#22A06B] flex-shrink-0 mt-0.5" />
          ) : feedbackToast.type === 'warning' ? (
            <AlertTriangle className="h-4 w-4 text-[#E06C00] flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-[#C9372C] flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs font-medium leading-relaxed">
            {feedbackToast.message}
          </div>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="p-0.5 text-current opacity-70 hover:opacity-100 rounded"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </output>
      )}
    </div>
  );
};
