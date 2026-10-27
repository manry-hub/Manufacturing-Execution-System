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
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#292A2E] flex items-center gap-2">
            <span>Injection molding cycle sequence</span>
            <span className="text-xs font-mono font-normal text-[#505258] bg-[#F1F2F4] px-2 py-0.5 rounded-[3px] border border-[#DCDFE4]">
              6-phase standard
            </span>
          </h3>
          <p className="text-xs text-[#505258] mt-0.5">
            Real-time mechanical progression of the active molding shot
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#505258] font-medium">Active phase:</span>
          <span
            className={`text-xs font-mono font-bold px-2 py-0.5 rounded-[3px] border ${
              isMachineRunning
                ? 'bg-[#E9F2FE] text-[#123263] border-[#357DE8]'
                : 'bg-[#F1F2F4] text-[#505258] border-[#DCDFE4]'
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

          let cardStyle = 'border-[#0B120E24] bg-[#F8F8F8] text-[#505258]';
          let iconStyle = 'bg-[#091E420F] text-[#505258]';

          if (isActive) {
            cardStyle =
              'border-[#1868DB] bg-[#E9F2FE] text-[#123263] shadow-xs';
            iconStyle = 'bg-[#1868DB] text-white';
          } else if (isPassed) {
            cardStyle = 'border-[#6A9A23] bg-[#EFFFD6] text-[#37471F]';
            iconStyle = 'bg-[#6A9A23] text-white';
          }

          return (
            <div
              key={phase.id}
              className={`rounded-md border p-3 flex flex-col justify-between transition-colors duration-150 ${cardStyle}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`p-1.5 rounded-md ${iconStyle}`}>
                  {phase.icon}
                </span>
                <span className="text-xs font-mono text-[#6B6E76]">
                  ~{phase.durationApprox}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold block text-[#292A2E]">
                  {phase.label}
                </span>
                <p className="text-xs text-[#505258] line-clamp-2 mt-0.5 leading-tight">
                  {phase.description}
                </p>
              </div>

              {/* Progress indicator bar at bottom of card */}
              <div className="mt-3 h-1 w-full rounded-full bg-[#091E4214] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isActive
                      ? 'w-full bg-[#1868DB]'
                      : isPassed
                      ? 'w-full bg-[#6A9A23]'
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
