import React from 'react';
import { Layers } from 'lucide-react';
import type { Machine } from '../../types/machine.js';

interface MultiMachineOeeChartProps {
  machines: Machine[];
}

export const MultiMachineOeeChart: React.FC<MultiMachineOeeChartProps> = ({ machines }) => {
  // Compute synthetic/actual OEE values for all 10 machines for demonstration
  const machineMetrics = machines.map((m) => {
    let a = 0.94;
    let p = 0.96;
    let q = 0.985;

    if (m.isSlowCycleActive) {
      p = 0.524; // 22s / 42s
    }
    if (m.isFaultActive) {
      a = 0.65; // Fault downtime
    }
    if (m.currentState?.normalizedStatus === 'IDLE') {
      a = 0.82;
    }

    const oee = a * p * q;
    return {
      code: m.code,
      name: m.name,
      status: m.currentState?.normalizedStatus ?? m.status,
      a: Math.round(a * 100),
      p: Math.round(p * 100),
      q: Math.round(q * 100),
      oee: Math.round(oee * 100),
    };
  });

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-400" />
            <span>Multi-Machine OEE Comparison</span>
            <span className="text-[11px] font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60">
              10-Machine Fleet Benchmarking
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Availability, Performance, Quality, and composite OEE per injection molding cell
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-blue-500" />
            <span>OEE</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-emerald-500" />
            <span>Avail</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-purple-500" />
            <span>Perf</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-cyan-500" />
            <span>Qual</span>
          </span>
        </div>
      </div>

      {/* Comparison Rows */}
      <div className="space-y-3">
        {machineMetrics.map((item) => (
          <div key={item.code} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 font-mono">{item.code}</span>
                <span className="text-[11px] text-slate-400">{item.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {item.status}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-slate-400 text-[11px]">A: <strong className="text-emerald-400">{item.a}%</strong></span>
                <span className="text-slate-400 text-[11px]">P: <strong className="text-purple-400">{item.p}%</strong></span>
                <span className="text-slate-400 text-[11px]">Q: <strong className="text-cyan-400">{item.q}%</strong></span>
                <span className="text-sm font-extrabold text-blue-400">{item.oee}% OEE</span>
              </div>
            </div>

            {/* Composite Progress Bar */}
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.oee >= 85
                    ? 'bg-gradient-to-r from-blue-500 to-emerald-400'
                    : item.oee >= 70
                    ? 'bg-blue-500'
                    : item.oee >= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${item.oee}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
