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
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>Demonstration & Scenario Injector</span>
            <span className="text-[11px] font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60">
              Virtual Node Control
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Inject deterministic operational events to demonstrate OEE loss calculations and Andon dispatch
          </p>
        </div>

        {feedback && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-xl">
            <CheckCircle2 className="h-3.5 w-3.5" />
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
          className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-all disabled:opacity-50"
        >
          <Play className="h-5 w-5 mb-1.5 text-emerald-400" />
          <span className="text-xs font-bold">Normal Flow</span>
          <span className="text-[10px] text-emerald-400/80 font-mono mt-0.5">22.0s Cycle</span>
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
          className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-all disabled:opacity-50"
        >
          <Clock className="h-5 w-5 mb-1.5 text-amber-400" />
          <span className="text-xs font-bold">Slow Cycle</span>
          <span className="text-[10px] text-amber-400/80 font-mono mt-0.5">42.0s (+90%)</span>
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
          className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-all disabled:opacity-50"
        >
          <Flame className="h-5 w-5 mb-1.5 text-rose-400" />
          <span className="text-xs font-bold">Heater Fault</span>
          <span className="text-[10px] text-rose-400/80 font-mono mt-0.5">ALM-TEMP-04</span>
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
          className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-red-500/40 bg-red-500/15 hover:bg-red-500/25 text-red-300 transition-all disabled:opacity-50"
        >
          <AlertOctagon className="h-5 w-5 mb-1.5 text-red-400" />
          <span className="text-xs font-bold">E-Stop Trip</span>
          <span className="text-[10px] text-red-400/80 font-mono mt-0.5">ALM-ESTOP-01</span>
        </button>

        {/* 5. Telemetry Disconnect */}
        <button
          type="button"
          disabled={isExecuting}
          onClick={() =>
            void handleAction('DISCONNECT', 'Telemetry Network Drop')
          }
          className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 transition-all disabled:opacity-50"
        >
          <WifiOff className="h-5 w-5 mb-1.5 text-slate-400" />
          <span className="text-xs font-bold">Disconnect</span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">Network Drop</span>
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
          className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 transition-all disabled:opacity-50"
        >
          <RotateCcw className="h-5 w-5 mb-1.5 text-blue-400" />
          <span className="text-xs font-bold">Reset Node</span>
          <span className="text-[10px] text-blue-400/80 font-mono mt-0.5">Clear Faults</span>
        </button>
      </div>
    </div>
  );
};
