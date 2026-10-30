import React from 'react';
import {
  Clock,
  Gauge,
  Thermometer,
  Layers,
  ArrowUpRight,
  AlertOctagon,
  Sparkles,
  Lock,
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

  const borderClass = currentStatus === 'FAULT'
    ? 'border-[#E2483D] shadow-sm'
    : 'border-[#0B120E24] hover:border-[#7D818A]';

  return (
    <div
      className={`group relative rounded-lg bg-[#FFFFFF] border p-5 transition-shadow duration-150 hover:shadow-md flex flex-col justify-between ${borderClass}`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-[#292A2E] tracking-tight">
                {machine.code}
              </h3>
              <span className="text-xs font-mono text-[#505258] bg-[#F1F2F4] px-1.5 py-0.5 rounded-[3px] border border-[#DCDFE4]">
                {machine.tonnage}T
              </span>
            </div>
            <p className="text-xs text-[#505258] line-clamp-1">{machine.name}</p>
          </div>
          <StatusBadge status={currentStatus} size="sm" />
        </div>

        {/* Active Order & Production Info Well */}
        <div className="bg-[#F8F8F8] rounded-md p-3 border border-[#0B120E14] mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#505258]">Order</span>
            <span className="font-medium text-[#292A2E]">
              {activeRun?.productionOrder?.orderNumber ?? 'PO-2026-IMM01'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#505258]">Part</span>
            <span className="font-mono text-[#292A2E]">
              {activeRun?.productionOrder?.product?.partNumber ?? 'PART-HOUSING-01'}
            </span>
          </div>

          {/* Output Progress */}
          <div>
            <div className="flex items-center justify-between text-xs text-[#505258] mb-1">
              <span>Progress</span>
              <span>
                {goodQuantity.toLocaleString()} / {targetQuantity.toLocaleString()} ({progressPercent}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-[#091E4214] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  currentStatus === 'FAULT' ? 'bg-[#C9372C]' : 'bg-[#1868DB]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* Cycle Time */}
          <div className="bg-[#FFFFFF] rounded-md p-2.5 border border-[#0B120E24] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#505258] text-xs mb-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Cycle time</span>
              </span>
              {isSlowCycle && (
                <span className="text-xs text-[#693200] bg-[#FFF5DB] border border-[#E06C00] px-1 rounded-[3px] font-bold">
                  Slow
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={`text-base font-bold font-mono tracking-tight ${
                  isSlowCycle ? 'text-[#9E4C00]' : 'text-[#292A2E]'
                }`}
              >
                {cycleTime > 0 ? cycleTime.toFixed(1) : '--'}s
              </span>
              <span className="text-xs text-[#6B6E76]">/ {idealCycleTime}s</span>
            </div>
          </div>

          {/* Shot Counter */}
          <div className="bg-[#FFFFFF] rounded-md p-2.5 border border-[#0B120E24] flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[#505258] text-xs mb-1">
              <Layers className="h-3 w-3" />
              <span>Total shots</span>
            </div>
            <span className="text-base font-bold font-mono text-[#292A2E] tracking-tight">
              {totalShots.toLocaleString()}
            </span>
          </div>

          {/* Pressure Telemetry */}
          <div className="bg-[#FFFFFF] rounded-md p-2.5 border border-[#0B120E24] flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[#505258] text-xs mb-1">
              <Gauge className="h-3 w-3" />
              <span>Pressure</span>
            </div>
            <span className="text-xs font-semibold font-mono text-[#292A2E]">
              {machine.latestMetrics?.injectionPressureBar
                ? `${Math.round(machine.latestMetrics.injectionPressureBar)} bar`
                : '128 bar'}
            </span>
          </div>

          {/* Barrel Temp Avg */}
          <div className="bg-[#FFFFFF] rounded-md p-2.5 border border-[#0B120E24] flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[#505258] text-xs mb-1">
              <Thermometer className="h-3 w-3" />
              <span>Barrel temp</span>
            </div>
            <span className="text-xs font-semibold font-mono text-[#292A2E]">
              {machine.latestMetrics?.barrelTemperatures?.zone3
                ? `${Math.round(machine.latestMetrics.barrelTemperatures.zone3)}°C`
                : '228°C'}
            </span>
          </div>
        </div>
      </div>

      {/* Card Action Controls */}
      <div className="flex items-center gap-2 pt-3 border-t border-[#0B120E24]">
        <button
          type="button"
          onClick={() => onSelect(machine)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium bg-[#091E420F] hover:bg-[#091E4214] active:bg-[#080F214A] text-[#292A2E] border border-[#0B120E24] transition-colors"
        >
          <span>Inspect</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-[#505258]" />
        </button>

        <button
          type="button"
          onClick={() => onTriggerAndon(machine)}
          title="Call andon assistance for this machine"
          aria-label="Call andon assistance"
          className="inline-flex items-center justify-center p-1.5 rounded-md text-xs font-medium text-[#AE2E24] hover:bg-[#FFECEB] active:bg-[#FFD5D2] border border-[#FD9891] transition-colors"
        >
          <AlertOctagon className="h-4 w-4 text-[#C9372C]" />
        </button>
      </div>

      {/* Fault overlay indicator */}
      {currentStatus === 'FAULT' && (
        <div className="absolute top-3 right-3 pointer-events-none">
          <span className="flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E2483D] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C9372C]" />
          </span>
        </div>
      )}

      {/* Simulator scenario active badge */}
      {machine.isSlowCycleActive && (
        <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-[3px] bg-[#FFF5DB] text-[#693200] border border-[#E06C00] font-bold text-xs tracking-wide flex items-center gap-1 shadow-xs">
          <Sparkles className="h-3 w-3 text-[#E06C00]" />
          <span>Scenario: slow cycle</span>
        </div>
      )}

      {/* Quality Interlock badge */}
      {machine.isInterlocked && (
        <div
          title={machine.interlockReason ?? 'Quarantine interlock active'}
          className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-[3px] bg-[#FFECEB] text-[#AE2E24] border border-[#FD9891] font-bold text-xs tracking-wide flex items-center gap-1 shadow-xs"
        >
          <Lock className="h-3 w-3 text-[#C9372C]" />
          <span>QC Interlock</span>
        </div>
      )}
    </div>
  );
};
