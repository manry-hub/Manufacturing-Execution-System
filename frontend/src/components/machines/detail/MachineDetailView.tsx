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
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToGrid}
            className="p-2 rounded-md bg-[#091E420F] hover:bg-[#091E4214] text-[#292A2E] border border-[#0B120E24] transition-colors"
            title="Return to shop floor matrix"
            aria-label="Return to shop floor matrix"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#292A2E] tracking-tight flex items-center gap-2">
                <Cpu className="h-6 w-6 text-[#1868DB]" />
                <span>{machine.code}</span>
              </h1>

              <StatusBadge status={currentStatus} size="md" />

              {/* Machine quick dropdown selector */}
              <div className="ml-2">
                <label htmlFor="machine-selector" className="sr-only">Switch machine</label>
                <select
                  id="machine-selector"
                  value={machine.code}
                  onChange={(e) => {
                    const target = allMachines.find((m) => m.code === e.target.value);
                    if (target) onSelectMachine(target);
                  }}
                  className="bg-[#FFFFFF] border border-[#8C8F97] text-xs font-semibold text-[#292A2E] rounded-md px-3 py-1.5 focus:border-[#4688EC] focus:ring-2 focus:ring-[#4688EC]/30 outline-none cursor-pointer"
                >
                  {allMachines.map((m) => (
                    <option key={m.id} value={m.code}>
                      {m.code} ({m.tonnage}T - {m.currentState?.normalizedStatus ?? m.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-[#505258] mt-1">
              {machine.name} • {machine.area?.name ?? 'Injection production'} • Plant unit 01
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onTriggerAndon(machine)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-[#C9372C] hover:bg-[#AE2E24] active:bg-[#872821] text-white shadow-xs transition-colors"
          >
            <AlertOctagon className="h-4 w-4" />
            <span>Call andon assistance</span>
          </button>
        </div>
      </div>

      {/* Machine Specifications & Active Job Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Machine Identity */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#505258] mb-1">
            <span>Machine specifications</span>
            <Cpu className="h-4 w-4 text-[#6B6E76]" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[#505258]">Clamping force:</span>
              <span className="font-mono font-semibold text-[#292A2E]">{machine.tonnage} metric tons</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#505258]">Shot capacity:</span>
              <span className="font-mono text-[#292A2E]">{machine.shotCapacityGrams ?? 480}g PS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#505258]">Drive type:</span>
              <span className="text-[#292A2E]">Servo-hydraulic</span>
            </div>
          </div>
        </div>

        {/* Active Order & Tooling */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#505258] mb-1">
            <span>Active tooling & order</span>
            <Layers className="h-4 w-4 text-[#1868DB]" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[#505258]">Order:</span>
              <span className="font-medium text-[#292A2E]">{activeRun?.productionOrder?.orderNumber ?? 'PO-2026-IMM01'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#505258]">Part:</span>
              <span className="font-mono text-[#292A2E]">{activeRun?.productionOrder?.product?.partNumber ?? 'PART-BEZEL-01'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#505258]">Mold:</span>
              <span className="font-mono text-[#292A2E]">{activeRun?.mold?.code ?? 'MLD-BEZEL-01'} (4 cav)</span>
            </div>
          </div>
        </div>

        {/* Production Tally */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#505258] mb-1">
            <span>Good output vs scrap</span>
            <CheckCircle2 className="h-4 w-4 text-[#6A9A23]" />
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xl font-bold font-mono text-[#37471F]">
                {goodQuantity.toLocaleString()}
              </span>
              <span className="text-xs text-[#505258] block">Good parts</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold font-mono text-[#5D1F1A] flex items-center justify-end gap-1">
                <Trash2 className="h-3.5 w-3.5" />
                <span>{scrapQuantity}</span>
              </span>
              <span className="text-xs text-[#505258] block">Scrap ({scrapRate}%)</span>
            </div>
          </div>
        </div>

        {/* Active Scenario / Diagnostics */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#505258] mb-1">
            <span>Operational mode</span>
            <Sparkles className="h-4 w-4 text-[#803FA5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  machine.isSlowCycleActive
                    ? 'bg-[#E06C00]'
                    : machine.isFaultActive
                    ? 'bg-[#E2483D] animate-ping'
                    : 'bg-[#22A06B]'
                }`}
              />
              <span className="text-sm font-bold text-[#292A2E]">
                {machine.isSlowCycleActive
                  ? 'Slow cycle active'
                  : machine.isFaultActive
                  ? `Fault: ${machine.activeFaultCode ?? 'ALM-01'}`
                  : 'Nominal steady-state'}
              </span>
            </div>
            <span className="text-xs text-[#505258] block">
              {machine.isSlowCycleActive
                ? 'Cycle prolonged to 42s; degrades performance'
                : machine.isFaultActive
                ? 'Machine halted; availability stop recorded'
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
