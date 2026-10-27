import React from 'react';
import type { InjectionCyclePhase } from '../../../types/machine.js';
import { Lock, Zap, Gauge, Snowflake, Unlock, ChevronRight } from 'lucide-react';

interface CyclePhaseBarProps {
  currentPhase?: InjectionCyclePhase | string;
  isMachineRunning: boolean;
}

interface PhaseDefinition {
  id: InjectionCyclePhase;
  label: string;
  description: string;
  icon: React.ReactNode;
  durationApprox: string;
}

const PHASES: PhaseDefinition[] = [
  {
    id: 'CLAMPING',
    label: '1. Clamping',
    description: 'Mold halves close & lock under tonnage',
    icon: <Lock className="h-4 w-4" />,
    durationApprox: '2.5s',
  },
  {
    id: 'INJECTION',
    label: '2. Injection',
    description: 'Screw moves forward; high pressure fill',
    icon: <Zap className="h-4 w-4" />,
    durationApprox: '3.0s',
  },
  {
    id: 'HOLDING',
    label: '3. Holding',
    description: 'Pack pressure prevents sink marks',
    icon: <Gauge className="h-4 w-4" />,
    durationApprox: '4.5s',
  },
  {
    id: 'COOLING',
    label: '4. Cooling',
    description: 'Part solidifies; screw plasticizing',
    icon: <Snowflake className="h-4 w-4" />,
    durationApprox: '9.0s',
  },
  {
    id: 'MOLD_OPENING',
    label: '5. Opening',
    description: 'Moving platen retracts smoothly',
    icon: <Unlock className="h-4 w-4" />,
    durationApprox: '2.0s',
  },
  {
    id: 'EJECTION',
    label: '6. Ejection',
    description: 'Mechanical pins eject finished parts',
    icon: <ChevronRight className="h-4 w-4" />,
    durationApprox: '1.0s',
  },
];

export const CyclePhaseBar: React.FC<CyclePhaseBarProps> = ({
  currentPhase,
  isMachineRunning,
}) => {
  const activeNormalized = (currentPhase ?? 'COOLING').toUpperCase();

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <span>Injection Molding Cycle Sequence</span>
            <span className="text-[11px] font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60">
              6-Phase Standard
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time mechanical progression of the active molding shot
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Active Phase:</span>
          <span
            className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
              isMachineRunning
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isMachineRunning ? activeNormalized : 'CYCLE PAUSED'}
          </span>
        </div>
      </div>

      {/* Responsive Step Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {PHASES.map((phase, idx) => {
          const isActive = isMachineRunning && activeNormalized === phase.id;
          const isPassed =
            isMachineRunning &&
            PHASES.findIndex((p) => p.id === activeNormalized) > idx;

          let cardStyle = 'border-slate-800 bg-slate-950/40 text-slate-400';
          let iconStyle = 'bg-slate-800 text-slate-400';

          if (isActive) {
            cardStyle =
              'border-blue-500/60 bg-blue-500/10 text-blue-200 ring-2 ring-blue-500/30 shadow-lg shadow-blue-950/30';
            iconStyle = 'bg-blue-500 text-white animate-bounce';
          } else if (isPassed) {
            cardStyle = 'border-emerald-500/30 bg-emerald-500/5 text-slate-300';
            iconStyle = 'bg-emerald-500/20 text-emerald-400';
          }

          return (
            <div
              key={phase.id}
              className={`rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 ${cardStyle}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`p-1.5 rounded-lg ${iconStyle}`}>
                  {phase.icon}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  ~{phase.durationApprox}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold block text-slate-200">
                  {phase.label}
                </span>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-tight">
                  {phase.description}
                </p>
              </div>

              {/* Progress indicator bar at bottom of card */}
              <div className="mt-3 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isActive
                      ? 'w-full bg-blue-500 animate-pulse'
                      : isPassed
                      ? 'w-full bg-emerald-500/60'
                      : 'w-0'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
