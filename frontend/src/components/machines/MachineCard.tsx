import React from 'react';
import {
  Clock,
  Gauge,
  Thermometer,
  Layers,
  ArrowUpRight,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import type { Machine } from '../../types/machine.js';
import type { ProductionRun } from '../../types/production.js';
import { StatusBadge } from '../common/StatusBadge.js';

interface MachineCardProps {
  machine: Machine;
  activeRun?: ProductionRun | null;
  onSelect: (machine: Machine) => void;
  onTriggerAndon: (machine: Machine) => void;
}

export const MachineCard: React.FC<MachineCardProps> = ({
  machine,
  activeRun,
  onSelect,
  onTriggerAndon,
}) => {
  const currentStatus = machine.currentState?.normalizedStatus ?? machine.status ?? 'UNKNOWN';
  const cycleTime = Number(
    machine.latestMetrics?.cycleTimeSeconds ?? machine.currentState?.currentCycleTime ?? 22.0,
  );
  const idealCycleTime = machine.nominalCycleTimeSeconds ?? 22.0;
  const isSlowCycle = cycleTime > idealCycleTime * 1.15;
  const totalShots = machine.cycleCounter ?? activeRun?.totalShots ?? 0;
  const targetQuantity = activeRun?.productionOrder?.targetQuantity ?? 1000;
  const goodQuantity = activeRun?.goodQuantity ?? 0;
  const progressPercent = Math.min(Math.round((goodQuantity / targetQuantity) * 100), 100);

  // Border glow effect based on machine status
  const cardBorderClasses = {
    RUNNING: 'border-slate-800 hover:border-emerald-500/50 hover:shadow-emerald-950/20',
    IDLE: 'border-slate-800 hover:border-amber-500/50 hover:shadow-amber-950/20',
    FAULT: 'border-rose-500/60 shadow-lg shadow-rose-950/40 bg-rose-950/10',
    SETUP: 'border-slate-800 hover:border-cyan-500/50 hover:shadow-cyan-950/20',
    STOPPED: 'border-slate-800 hover:border-slate-600',
    DISCONNECTED: 'border-zinc-800 opacity-75',
    UNKNOWN: 'border-slate-800',
  }[currentStatus] ?? 'border-slate-800';

  return (
    <div
      className={`group relative rounded-2xl bg-slate-900/80 border p-5 transition-all duration-200 hover:shadow-xl flex flex-col justify-between ${cardBorderClasses}`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-slate-100 tracking-tight">
                {machine.code}
              </h3>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/60">
                {machine.tonnage}T
              </span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-1">{machine.name}</p>
          </div>
          <StatusBadge status={currentStatus} size="sm" />
        </div>

        {/* Active Order & Production Info */}
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Order</span>
            <span className="font-medium text-slate-200">
              {activeRun?.productionOrder?.orderNumber ?? 'PO-2026-IMM01'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Part</span>
            <span className="font-mono text-slate-300">
              {activeRun?.productionOrder?.product?.partNumber ?? 'PART-HOUSING-01'}
            </span>
          </div>

          {/* Output Progress */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Progress</span>
              <span>
                {goodQuantity.toLocaleString()} / {targetQuantity.toLocaleString()} ({progressPercent}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  currentStatus === 'FAULT' ? 'bg-rose-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* Cycle Time */}
          <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Cycle Time</span>
              </span>
              {isSlowCycle && (
                <span className="text-[10px] text-amber-400 bg-amber-500/20 px-1 rounded font-bold">
                  SLOW
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={`text-lg font-bold font-mono tracking-tight ${
                  isSlowCycle ? 'text-amber-400' : 'text-slate-100'
                }`}
              >
                {cycleTime > 0 ? cycleTime.toFixed(1) : '--'}s
              </span>
              <span className="text-xs text-slate-500">/ {idealCycleTime}s</span>
            </div>
          </div>

          {/* Shot Counter */}
          <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
              <Layers className="h-3 w-3" />
              <span>Total Shots</span>
            </div>
            <span className="text-lg font-bold font-mono text-slate-100 tracking-tight">
              {totalShots.toLocaleString()}
            </span>
          </div>

          {/* Pressure Telemetry (if available) */}
          <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
              <Gauge className="h-3 w-3" />
              <span>Pressure</span>
            </div>
            <span className="text-sm font-semibold font-mono text-slate-200">
              {machine.latestMetrics?.injectionPressureBar
                ? `${Math.round(machine.latestMetrics.injectionPressureBar)} bar`
                : '128 bar'}
            </span>
          </div>

          {/* Barrel Temp Avg (if available) */}
          <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
              <Thermometer className="h-3 w-3" />
              <span>Barrel Temp</span>
            </div>
            <span className="text-sm font-semibold font-mono text-slate-200">
              {machine.latestMetrics?.barrelTemperatures?.zone3
                ? `${Math.round(machine.latestMetrics.barrelTemperatures.zone3)}°C`
                : '228°C'}
            </span>
          </div>
        </div>
      </div>

      {/* Card Action Controls */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => onSelect(machine)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
          <span>Inspect</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => onTriggerAndon(machine)}
          title="Trigger Andon Alert for this Machine"
          className="inline-flex items-center justify-center p-2 rounded-xl text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
        >
          <AlertOctagon className="h-4 w-4" />
        </button>
      </div>

      {/* Fault overlay indicator */}
      {currentStatus === 'FAULT' && (
        <div className="absolute top-3 right-3 pointer-events-none">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </span>
        </div>
      )}

      {/* Simulator scenario active badge */}
      {machine.isSlowCycleActive && (
        <div className="absolute -top-2 left-6 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] tracking-wide flex items-center gap-1 shadow-md">
          <Sparkles className="h-3 w-3" />
          <span>SCENARIO: SLOW CYCLE</span>
        </div>
      )}
    </div>
  );
};
