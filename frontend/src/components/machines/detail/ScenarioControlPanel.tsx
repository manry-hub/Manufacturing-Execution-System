import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  Clock,
  Flame,
  AlertOctagon,
  WifiOff,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import type { Machine } from '../../../types/machine.js';

interface ScenarioControlPanelProps {
  machine: Machine;
  onTriggerScenario: (dto: {
    machineCode: string;
    scenario: 'NORMAL' | 'SLOW_CYCLE' | 'HEATER_FAULT' | 'ESTOP' | 'DISCONNECT';
    customCycleTimeSeconds?: number;
    faultCode?: string;
  }) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const ScenarioControlPanel: React.FC<ScenarioControlPanelProps> = ({
  machine,
  onTriggerScenario,
  onRefresh,
}) => {
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAction = async (
    scenario: 'NORMAL' | 'SLOW_CYCLE' | 'HEATER_FAULT' | 'ESTOP' | 'DISCONNECT',
    label: string,
    extra?: { customCycleTimeSeconds?: number; faultCode?: string },
  ) => {
    setIsExecuting(true);
    setFeedback(null);
    try {
      await onTriggerScenario({
        machineCode: machine.code,
        scenario,
        ...extra,
      });
      setFeedback(`Scenario "${label}" successfully applied to ${machine.code}.`);
      await onRefresh();
    } catch (err) {
      setFeedback(`Failed to apply scenario: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#292A2E] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#803FA5]" />
            <span>Demonstration & scenario injector</span>
            <span className="text-[11px] font-mono font-normal text-[#505258] bg-[#F1F2F4] px-2 py-0.5 rounded-[3px] border border-[#DCDFE4]">
              Virtual node control
            </span>
          </h3>
          <p className="text-xs text-[#505258] mt-0.5">
            Inject deterministic operational events to demonstrate OEE loss calculations and andon dispatch
          </p>
        </div>

        {feedback && (
          <div className="flex items-center gap-1.5 text-xs text-[#37471F] bg-[#EFFFD6] border border-[#6A9A23] px-3 py-1 rounded-md">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#6A9A23]" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* 1. Normal Steady-State */}
        <button
          type="button"
          disabled={isExecuting}
          onClick={() =>
            void handleAction('NORMAL', 'Nominal Steady-State Flow', {
              customCycleTimeSeconds: 22.0,
            })
          }
          className="flex flex-col items-center justify-center text-center p-3 rounded-md border border-[#6A9A23] bg-[#EFFFD6] hover:bg-[#D3F1A7] text-[#37471F] transition-all disabled:opacity-50"
        >
          <Play className="h-5 w-5 mb-1.5 text-[#6A9A23]" />
          <span className="text-xs font-bold">Normal flow</span>
          <span className="text-[10px] text-[#37471F]/80 font-mono mt-0.5">22.0s cycle</span>
        </button>

        {/* 2. Slow Cycle (Performance Drop) */}
        <button
          type="button"
          disabled={isExecuting}
          onClick={() =>
            void handleAction('SLOW_CYCLE', 'Slow Cycle Condition', {
              customCycleTimeSeconds: 42.0,
            })
          }
          className="flex flex-col items-center justify-center text-center p-3 rounded-md border border-[#E06C00] bg-[#FFF5DB] hover:bg-[#FCE4A6] text-[#693200] transition-all disabled:opacity-50"
        >
          <Clock className="h-5 w-5 mb-1.5 text-[#E06C00]" />
          <span className="text-xs font-bold">Slow cycle</span>
          <span className="text-[10px] text-[#693200]/80 font-mono mt-0.5">42.0s (+90%)</span>
        </button>

        {/* 3. Heater Band Fault */}
        <button
          type="button"
          disabled={isExecuting}
          onClick={() =>
            void handleAction('HEATER_FAULT', 'Heater Band Thermocouple Alarm', {
              faultCode: 'ALM-TEMP-04',
            })
          }
          className="flex flex-col items-center justify-center text-center p-3 rounded-md border border-[#E2483D] bg-[#FFECEB] hover:bg-[#FFD5D2] text-[#5D1F1A] transition-all disabled:opacity-50"
        >
          <Flame className="h-5 w-5 mb-1.5 text-[#C9372C]" />
          <span className="text-xs font-bold">Heater fault</span>
          <span className="text-[10px] text-[#5D1F1A]/80 font-mono mt-0.5">ALM-TEMP-04</span>
        </button>

        {/* 4. Emergency Stop (E-Stop) */}
        <button
          type="button"
          disabled={isExecuting}
          onClick={() =>
            void handleAction('ESTOP', 'Emergency Stop Actuated', {
              faultCode: 'ALM-ESTOP-01',
            })
          }
          className="flex flex-col items-center justify-center text-center p-3 rounded-md border border-[#E2483D] bg-[#FFECEB] hover:bg-[#FFD5D2] text-[#5D1F1A] transition-all disabled:opacity-50"
        >
          <AlertOctagon className="h-5 w-5 mb-1.5 text-[#C9372C]" />
          <span className="text-xs font-bold">E-stop trip</span>
          <span className="text-[10px] text-[#5D1F1A]/80 font-mono mt-0.5">ALM-ESTOP-01</span>
        </button>

        {/* 5. Telemetry Disconnect */}
        <button
          type="button"
          disabled={isExecuting}
          onClick={() =>
            void handleAction('DISCONNECT', 'Telemetry Network Drop')
          }
          className="flex flex-col items-center justify-center text-center p-3 rounded-md border border-[#0B120E24] bg-[#F1F2F4] hover:bg-[#E4E6EB] text-[#505258] transition-all disabled:opacity-50"
        >
          <WifiOff className="h-5 w-5 mb-1.5 text-[#505258]" />
          <span className="text-xs font-bold">Disconnect</span>
          <span className="text-[10px] text-[#505258] font-mono mt-0.5">Network drop</span>
        </button>

        {/* 6. Clear & Reset Machine */}
        <button
          type="button"
          disabled={isExecuting}
          onClick={() =>
            void handleAction('NORMAL', 'Reset Machine to Baseline', {
              customCycleTimeSeconds: 22.0,
            })
          }
          className="flex flex-col items-center justify-center text-center p-3 rounded-md border border-[#357DE8] bg-[#E9F2FE] hover:bg-[#CFE1FD] text-[#123263] transition-all disabled:opacity-50"
        >
          <RotateCcw className="h-5 w-5 mb-1.5 text-[#1868DB]" />
          <span className="text-xs font-bold">Reset node</span>
          <span className="text-[10px] text-[#123263]/80 font-mono mt-0.5">Clear faults</span>
        </button>
      </div>
    </div>
  );
};
