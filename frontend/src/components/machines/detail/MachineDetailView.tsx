import React from 'react';
import {
  ArrowLeft,
  AlertOctagon,
  Cpu,
  Layers,
  Sparkles,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import type { Machine } from '../../../types/machine.js';
import type { ProductionRun } from '../../../types/production.js';
import { StatusBadge } from '../../common/StatusBadge.js';
import { CyclePhaseBar } from './CyclePhaseBar.js';
import { TelemetryGauges } from './TelemetryGauges.js';
import { BarrelHeatingZones } from './BarrelHeatingZones.js';
import { ScenarioControlPanel } from './ScenarioControlPanel.js';

interface MachineDetailViewProps {
  machine: Machine;
  allMachines: Machine[];
  activeRun?: ProductionRun | null;
  onSelectMachine: (machine: Machine) => void;
  onBackToGrid: () => void;
  onTriggerAndon: (machine: Machine) => void;
  onTriggerScenario: (dto: {
    machineCode: string;
    scenario: 'NORMAL' | 'SLOW_CYCLE' | 'HEATER_FAULT' | 'ESTOP' | 'DISCONNECT';
    customCycleTimeSeconds?: number;
    faultCode?: string;
  }) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const MachineDetailView: React.FC<MachineDetailViewProps> = ({
  machine,
  allMachines,
  activeRun,
  onSelectMachine,
  onBackToGrid,
  onTriggerAndon,
  onTriggerScenario,
  onRefresh,
}) => {
  const currentStatus = machine.currentState?.normalizedStatus ?? machine.status ?? 'UNKNOWN';
  const isRunning = currentStatus === 'RUNNING';
  const hasHeaterFault = machine.isFaultActive && machine.activeFaultCode === 'ALM-TEMP-04';

  const totalShots = machine.cycleCounter ?? activeRun?.totalShots ?? 0;
  const goodQuantity = activeRun?.goodQuantity ?? totalShots * 4;
  const scrapQuantity = activeRun?.rejectQuantity ?? 24;
  const totalParts = goodQuantity + scrapQuantity;
  const scrapRate = totalParts > 0 ? ((scrapQuantity / totalParts) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      {/* Top Navigation & Machine Selector Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToGrid}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Return to Shop Floor Matrix"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                <Cpu className="h-6 w-6 text-blue-400" />
                <span>{machine.code}</span>
              </h2>

              <StatusBadge status={currentStatus} size="md" />

              {/* Machine quick dropdown selector */}
              <div className="ml-2">
                <label htmlFor="machine-selector" className="sr-only">Switch Machine</label>
                <select
                  id="machine-selector"
                  value={machine.code}
                  onChange={(e) => {
                    const target = allMachines.find((m) => m.code === e.target.value);
                    if (target) onSelectMachine(target);
                  }}
                  className="bg-slate-800/90 border border-slate-700 text-xs font-semibold text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {allMachines.map((m) => (
                    <option key={m.id} value={m.code} className="bg-slate-900 text-slate-100">
                      {m.code} ({m.tonnage}T - {m.currentState?.normalizedStatus ?? m.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-1">
              {machine.name} • {machine.area?.name ?? 'Injection Production'} • Model Injection Plant 01
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onTriggerAndon(machine)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition-colors"
          >
            <AlertOctagon className="h-4 w-4" />
            <span>Call Andon Assistance</span>
          </button>
        </div>
      </div>

      {/* Machine Specifications & Active Job Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Machine Identity */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Machine Specifications</span>
            <Cpu className="h-4 w-4 text-slate-500" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Clamping Force:</span>
              <span className="font-mono font-semibold text-slate-200">{machine.tonnage} Metric Tons</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Shot Capacity:</span>
              <span className="font-mono text-slate-300">{machine.shotCapacityGrams ?? 480}g PS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Drive Type:</span>
              <span className="text-slate-300">Servo-Hydraulic</span>
            </div>
          </div>
        </div>

        {/* Active Order & Tooling */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Active Tooling & Order</span>
            <Layers className="h-4 w-4 text-blue-400" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Order:</span>
              <span className="font-medium text-slate-200">{activeRun?.productionOrder?.orderNumber ?? 'PO-2026-IMM01'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Part:</span>
              <span className="font-mono text-slate-300">{activeRun?.productionOrder?.product?.partNumber ?? 'PART-BEZEL-01'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Mold:</span>
              <span className="font-mono text-slate-300">{activeRun?.mold?.code ?? 'MLD-BEZEL-01'} (4 Cav)</span>
            </div>
          </div>
        </div>

        {/* Production Tally */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Good Output vs Scrap</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {goodQuantity.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400 block">Good Parts</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold font-mono text-rose-400 flex items-center justify-end gap-1">
                <Trash2 className="h-3.5 w-3.5" />
                <span>{scrapQuantity}</span>
              </span>
              <span className="text-[11px] text-slate-400 block">Scrap ({scrapRate}%)</span>
            </div>
          </div>
        </div>

        {/* Active Scenario / Diagnostics */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Operational Mode</span>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  machine.isSlowCycleActive
                    ? 'bg-amber-400 animate-pulse'
                    : machine.isFaultActive
                    ? 'bg-rose-400 animate-ping'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="text-sm font-bold text-slate-100">
                {machine.isSlowCycleActive
                  ? 'Slow Cycle Active'
                  : machine.isFaultActive
                  ? `Fault: ${machine.activeFaultCode ?? 'ALM-01'}`
                  : 'Nominal Steady-State'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block">
              {machine.isSlowCycleActive
                ? 'Cycle prolonged to 42s; degrades Performance'
                : machine.isFaultActive
                ? 'Machine halted; Availability stop recorded'
                : 'Cycle running at nominal 22s pace'}
            </span>
          </div>
        </div>
      </div>

      {/* 6-Phase Cycle Sequence Progression Bar */}
      <CyclePhaseBar
        currentPhase={machine.currentPhase}
        isMachineRunning={isRunning}
      />

      {/* Real-time Injection Pressures & Cushion Gauges */}
      <TelemetryGauges metrics={machine.latestMetrics} />

      {/* 4-Zone Electric Barrel Heating Profiles */}
      <BarrelHeatingZones
        temperatures={machine.latestMetrics?.barrelTemperatures}
        hasHeaterFault={hasHeaterFault}
      />

      {/* Demonstration Scenario Controls */}
      <ScenarioControlPanel
        machine={machine}
        onTriggerScenario={onTriggerScenario}
        onRefresh={onRefresh}
      />
    </div>
  );
};
