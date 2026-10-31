import React, { useState, useMemo } from 'react';
import {
  Filter,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  FastForward,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Machine } from '../../types/machine.js';
import type { ProductionRun } from '../../types/production.js';
import { MachineCard } from './MachineCard.js';

interface ShopFloorGridProps {
  machines: Machine[];
  runs: ProductionRun[];
  simulatorStatus?: {
    isRunning: boolean;
    speedMultiplier: number;
  };
  onSelectMachine: (machine: Machine) => void;
  onTriggerAndon: (machine: Machine) => void;
  onStartSimulator: () => Promise<void>;
  onStopSimulator: () => Promise<void>;
  onSetSimulatorSpeed: (speed: number) => Promise<void>;
  onResetSimulator: () => Promise<void>;
}

export const ShopFloorGrid: React.FC<ShopFloorGridProps> = ({
  machines,
  runs,
  simulatorStatus,
  onSelectMachine,
  onTriggerAndon,
  onStartSimulator,
  onStopSimulator,
  onSetSimulatorSpeed,
  onResetSimulator,
}) => {
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [showSimSandbox, setShowSimSandbox] = useState<boolean>(false);

  // Compute fleet KPI summaries
  const kpis = useMemo(() => {
    const total = machines.length;
    let running = 0;
    let fault = 0;
    let idle = 0;
    let setup = 0;
    let stopped = 0;

    machines.forEach((m) => {
      const st = m.currentState?.normalizedStatus ?? m.status;
      if (st === 'RUNNING') running++;
      else if (st === 'FAULT') fault++;
      else if (st === 'IDLE') idle++;
      else if (st === 'SETUP') setup++;
      else stopped++;
    });

    const utilization = total > 0 ? Math.round((running / total) * 100) : 0;
    return { total, running, fault, idle, setup, stopped, utilization };
  }, [machines]);

  // Extract unique areas
  const areas = useMemo(() => {
    const set = new Set<string>();
    machines.forEach((m) => {
      if (m.area?.name) set.add(m.area.name);
    });
    return Array.from(set);
  }, [machines]);

  // Filtered machines
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const matchArea = selectedArea === 'ALL' || m.area?.name === selectedArea;
      const currentSt = m.currentState?.normalizedStatus ?? m.status;
      const matchStatus = selectedStatus === 'ALL' || currentSt === selectedStatus;
      return matchArea && matchStatus;
    });
  }, [machines, selectedArea, selectedStatus]);

  // Map active runs by machineId
  const runsByMachine = useMemo(() => {
    const map = new Map<string, ProductionRun>();
    runs.forEach((r) => {
      if (r.status === 'ACTIVE' || r.status === 'SETUP') {
        map.set(r.machineId, r);
      }
    });
    return map;
  }, [runs]);

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Shop floor matrix</h1>

      {/* Top Controls & Simulator Bar */}
      <div className="bg-[#F8F8F8] border border-[#0B120E24] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#505258] mr-2">
            <Filter className="h-4 w-4" />
            <span>Filters:</span>
          </div>

          {/* Area Selector */}
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="bg-[#FFFFFF] border border-[#8C8F97] text-xs font-medium text-[#292A2E] rounded-md px-3 py-1.5 min-h-[32px] focus:border-[#4688EC] focus:ring-2 focus:ring-[#4688EC]/30 outline-none"
          >
            <option value="ALL">All areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {/* Status Badges Filter */}
          {(
            [
              { id: 'ALL', label: 'All' },
              { id: 'RUNNING', label: 'Running' },
              { id: 'IDLE', label: 'Idle' },
              { id: 'FAULT', label: 'Fault' },
              { id: 'SETUP', label: 'Setup' },
              { id: 'STOPPED', label: 'Stopped' },
            ] as const
          ).map((st) => {
            const isSelected = selectedStatus === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStatus(st.id)}
                className={`text-xs px-3 py-1.5 min-h-[32px] rounded-md font-medium transition-all ${
                  isSelected
                    ? 'bg-[#1868DB] text-white border border-[#1868DB]'
                    : 'bg-[#FFFFFF] text-[#505258] hover:bg-[#F0F1F2] border border-[#0B120E24]'
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {/* Right: Operational Status & Collapsible Simulation Sandbox Access */}
        <div className="flex items-center gap-2.5">
          {/* Live Telemetry Status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#FFFFFF] border border-[#0B120E24] text-xs text-[#505258]">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22A06B] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#216E4E]" />
            </span>
            <span className="font-medium text-[#292A2E]">Live Fleet</span>
            <span className="text-[#6B6E76]">•</span>
            <span>10 Nodes</span>
          </div>

          {/* Discreet Simulation Sandbox Button */}
          <button
            type="button"
            onClick={() => setShowSimSandbox((prev) => !prev)}
            title="Toggle developer & demonstration simulator sandbox"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              showSimSandbox
                ? 'bg-[#E9F2FE] text-[#123263] border-[#8FB8F6]'
                : 'bg-[#FFFFFF] text-[#505258] hover:text-[#292A2E] hover:bg-[#F0F1F2] border-[#0B120E24]'
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-[#1868DB]" />
            <span>Sim Sandbox</span>
            {simulatorStatus?.isRunning && (
              <span className="h-1.5 w-1.5 rounded-full bg-[#6A9A23]" title="Simulator loop running" />
            )}
            {showSimSandbox ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Simulator Sandbox Panel */}
      {showSimSandbox && (
        <div className="bg-[#FFFFFF] border border-[#8FB8F6] rounded-lg p-3.5 shadow-sm animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-[#E9F2FE] text-[#1868DB]">
                <Gauge className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#123263] uppercase tracking-wider">
                    Virtual Telemetry Sandbox
                  </h4>
                  <span
                    className={`text-[11px] font-mono px-1.5 py-0.5 rounded-[3px] border ${
                      simulatorStatus?.isRunning
                        ? 'bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]'
                        : 'bg-[#FFF5DB] text-[#693200] border-[#E06C00]'
                    }`}
                  >
                    {simulatorStatus?.isRunning ? 'Running' : 'Paused'}
                  </span>
                </div>
                <p className="text-[11px] text-[#505258] mt-0.5">
                  Internal simulator cycle loop for telemetry generation and edge device emulation.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Play / Pause Toggle */}
              {simulatorStatus?.isRunning ? (
                <button
                  type="button"
                  onClick={() => void onStopSimulator()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#FFF5DB] text-[#693200] border border-[#E06C00] hover:bg-[#FCE4A6] transition-colors"
                >
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause Loop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void onStartSimulator()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#EFFFD6] text-[#37471F] border border-[#6A9A23] hover:bg-[#D3F1A7] transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Start Loop</span>
                </button>
              )}

              {/* Speed Multiplier */}
              <div className="flex items-center gap-0.5 border border-[#0B120E24] rounded-md p-0.5 bg-[#F8F8F8]">
                {[1, 2, 5].map((spd) => {
                  const isActive = (simulatorStatus?.speedMultiplier ?? 1) === spd;
                  return (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => void onSetSimulatorSpeed(spd)}
                      className={`text-xs font-mono px-2 py-1 rounded transition-colors ${
                        isActive
                          ? 'bg-[#1868DB] text-white font-bold shadow-xs'
                          : 'text-[#505258] hover:text-[#292A2E] hover:bg-[#FFFFFF]'
                      }`}
                    >
                      {spd}x
                    </button>
                  );
                })}
              </div>

              {/* Reset to baseline */}
              <button
                type="button"
                onClick={() => void onResetSimulator()}
                title="Reset simulation parameters to deterministic baseline"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#505258] hover:text-[#292A2E] border border-[#0B120E24] hover:bg-[#F8F8F8] transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fleet KPI Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Machines */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#505258] text-xs mb-1">
            <span>Total fleet</span>
            <Layers className="h-4 w-4 text-[#6B6E76]" />
          </div>
          <span className="text-2xl font-bold font-mono text-[#292A2E]">{kpis.total}</span>
        </div>

        {/* Running */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#37471F] text-xs mb-1">
            <span>Running</span>
            <CheckCircle2 className="h-4 w-4 text-[#6A9A23]" />
          </div>
          <span className="text-2xl font-bold font-mono text-[#37471F]">{kpis.running}</span>
        </div>

        {/* Faults */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#5D1F1A] text-xs mb-1">
            <span>Fault alarms</span>
            <AlertTriangle className="h-4 w-4 text-[#C9372C]" />
          </div>
          <span className="text-2xl font-bold font-mono text-[#5D1F1A]">{kpis.fault}</span>
        </div>

        {/* Idle */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#693200] text-xs mb-1">
            <span>Idle / starved</span>
            <Clock className="h-4 w-4 text-[#E06C00]" />
          </div>
          <span className="text-2xl font-bold font-mono text-[#693200]">{kpis.idle}</span>
        </div>

        {/* Setup */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#123263] text-xs mb-1">
            <span>In setup</span>
            <FastForward className="h-4 w-4 text-[#357DE8]" />
          </div>
          <span className="text-2xl font-bold font-mono text-[#123263]">{kpis.setup}</span>
        </div>

        {/* Fleet Utilization */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[#123263] text-xs mb-1">
            <span>Fleet utilization</span>
            <Gauge className="h-4 w-4 text-[#357DE8]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-[#1868DB]">
              {kpis.utilization}%
            </span>
            <span className="text-xs text-[#6B6E76]">running</span>
          </div>
        </div>
      </div>

      {/* Grid of Machine Cards */}
      {filteredMachines.length === 0 ? (
        <div className="text-center py-12 bg-[#FFFFFF] border border-[#0B120E24] rounded-lg shadow-xs">
          <p className="text-[#505258] text-sm mb-3">No machines match the selected filter criteria.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedArea('ALL');
              setSelectedStatus('ALL');
            }}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#091E420F] hover:bg-[#091E4214] text-[#292A2E] border border-[#0B120E24] transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredMachines.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              activeRun={runsByMachine.get(machine.id)}
              onSelect={onSelectMachine}
              onTriggerAndon={onTriggerAndon}
            />
          ))}
        </div>
      )}
    </div>
  );
};
