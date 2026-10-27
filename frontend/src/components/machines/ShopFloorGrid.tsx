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
      {/* Top Controls & Simulator Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-2">
            <Filter className="h-4 w-4" />
            <span>Filters:</span>
          </div>

          {/* Area Selector */}
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {/* Status Badges Filter */}
          {(['ALL', 'RUNNING', 'IDLE', 'FAULT', 'SETUP', 'STOPPED'] as const).map((st) => {
            const isSelected = selectedStatus === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`text-xs px-2.5 py-1 rounded-xl font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>

        {/* Right: Simulator Controls */}
        <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-1.5">
          <span className="text-[11px] font-mono text-slate-400 px-2 flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5 text-blue-400" />
            <span>Sim: {simulatorStatus?.isRunning ? 'Running' : 'Paused'}</span>
          </span>

          {simulatorStatus?.isRunning ? (
            <button
              type="button"
              onClick={() => void onStopSimulator()}
              title="Pause Simulator Loop"
              className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void onStartSimulator()}
              title="Start Simulator Loop"
              className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Speed multiplier selector */}
          <div className="flex items-center gap-0.5 border-l border-slate-800 pl-1">
            {[1, 2, 5].map((spd) => {
              const isActive = (simulatorStatus?.speedMultiplier ?? 1) === spd;
              return (
                <button
                  key={spd}
                  type="button"
                  onClick={() => void onSetSimulatorSpeed(spd)}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {spd}x
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => void onResetSimulator()}
            title="Reset Simulator to Deterministic Baseline"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors ml-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Fleet KPI Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Machines */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Fleet</span>
            <Layers className="h-4 w-4 text-slate-500" />
          </div>
          <span className="text-2xl font-bold font-mono text-slate-100">{kpis.total}</span>
        </div>

        {/* Running */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 text-xs mb-1">
            <span>Running</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-400">{kpis.running}</span>
        </div>

        {/* Faults */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-400 text-xs mb-1">
            <span>Fault Alarms</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-rose-400">{kpis.fault}</span>
        </div>

        {/* Idle */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 text-xs mb-1">
            <span>Idle / Starved</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-amber-400">{kpis.idle}</span>
        </div>

        {/* Setup */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-cyan-400 text-xs mb-1">
            <span>In Setup</span>
            <FastForward className="h-4 w-4 text-cyan-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-cyan-400">{kpis.setup}</span>
        </div>

        {/* Fleet Utilization */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-400 text-xs mb-1">
            <span>Fleet Utilization</span>
            <Gauge className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-blue-400">
              {kpis.utilization}%
            </span>
            <span className="text-xs text-slate-500">running</span>
          </div>
        </div>
      </div>

      {/* Grid of Machine Cards */}
      {filteredMachines.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
          <p className="text-slate-400 text-sm">No machines match the selected filter criteria.</p>
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
