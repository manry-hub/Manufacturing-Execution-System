import React, { useMemo } from 'react';
import { Layers } from 'lucide-react';
import type { Machine } from '../../types/machine.js';

interface MultiMachineOeeChartProps {
  machines: Machine[];
}

export const MultiMachineOeeChart: React.FC<MultiMachineOeeChartProps> = ({ machines }) => {
  // Compute synthetic/actual OEE values for all 10 machines for demonstration
  const machineMetrics = useMemo(() => {
    return machines.map((m) => {
      let a = 0.94;
      let p = 0.96;
      let q = 0.985;

      if (m.isSlowCycleActive) {
        p = 0.524;
      }
      if (m.isFaultActive) {
        a = 0.65;
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
  }, [machines]);

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#292A2E] flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#1868DB]" />
            <span>Multi-machine OEE comparison</span>
            <span className="text-xs font-mono font-normal text-[#505258] bg-[#F1F2F4] px-2 py-0.5 rounded-[3px] border border-[#DCDFE4]">
              10-machine fleet benchmarking
            </span>
          </h3>
          <p className="text-xs text-[#505258] mt-0.5">
            Availability, performance, quality, and composite OEE per injection molding cell
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-[#505258] font-mono">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#1868DB]" />
            <span>OEE</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#22A06B]" />
            <span>Avail</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#803FA5]" />
            <span>Perf</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#206A83]" />
            <span>Qual</span>
          </span>
        </div>
      </div>

      {/* Comparison Rows */}
      <div className="space-y-3">
        {machineMetrics.map((item) => (
          <div key={item.code} className="bg-[#F8F8F8] border border-[#0B120E24] rounded-md p-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#292A2E] font-mono">{item.code}</span>
                <span className="text-xs text-[#505258]">{item.name}</span>
                <span className="text-xs font-mono px-1.5 py-0.5 rounded-[3px] bg-[#FFFFFF] text-[#505258] border border-[#DCDFE4]">
                  {item.status}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-[#505258] text-xs">A: <strong className="text-[#216E4E]">{item.a}%</strong></span>
                <span className="text-[#505258] text-xs">P: <strong className="text-[#803FA5]">{item.p}%</strong></span>
                <span className="text-[#505258] text-xs">Q: <strong className="text-[#206A83]">{item.q}%</strong></span>
                <span className="text-sm font-bold text-[#1868DB]">{item.oee}% OEE</span>
              </div>
            </div>

            {/* Composite Progress Bar */}
            <div className="h-2 w-full bg-[#091E4214] rounded-full overflow-hidden border border-[#0B120E24]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.oee >= 85
                    ? 'bg-[#1868DB]'
                    : item.oee >= 70
                    ? 'bg-[#22A06B]'
                    : item.oee >= 50
                    ? 'bg-[#E06C00]'
                    : 'bg-[#C9372C]'
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
