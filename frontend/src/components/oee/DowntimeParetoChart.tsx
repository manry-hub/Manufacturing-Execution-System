import React from 'react';
import { AlertTriangle, Trash2, TrendingUp } from 'lucide-react';

interface ParetoItem {
  category: string;
  durationMinutes: number;
}

const DOWNTIME_DATA: ParetoItem[] = [
  { category: 'Heater band thermocouple alarm', durationMinutes: 145 },
  { category: 'Mechanical hydraulic leak', durationMinutes: 92 },
  { category: 'Mold parting line flash choke', durationMinutes: 58 },
  { category: 'Colorant & resin changeover', durationMinutes: 42 },
  { category: 'Material hopper starvation', durationMinutes: 28 },
  { category: 'Operator break / minor stop', durationMinutes: 16 },
];

const DEFECT_DATA = [
  { code: 'FLASH', label: 'Flash / burrs', count: 68 },
  { code: 'SHORT_SHOT', label: 'Short shot', count: 42 },
  { code: 'WARPAGE', label: 'Shrinkage warpage', count: 24 },
  { code: 'SINK_MARK', label: 'Sink marks', count: 16 },
  { code: 'CONTAMINATION', label: 'Black specks', count: 8 },
];

// Module-level pre-calculations (pure and immutable during renders)
const totalDowntime = DOWNTIME_DATA.reduce((acc, d) => acc + d.durationMinutes, 0);
let runningDowntimeAcc = 0;
const DOWNTIME_WITH_CUMULATIVE = DOWNTIME_DATA.map((d) => {
  runningDowntimeAcc += d.durationMinutes;
  return {
    ...d,
    pctOfTotal: Math.round((d.durationMinutes / totalDowntime) * 100),
    cumPct: Math.round((runningDowntimeAcc / totalDowntime) * 100),
  };
});

const totalScrap = DEFECT_DATA.reduce((acc, d) => acc + d.count, 0);
let runningScrapAcc = 0;
const SCRAP_WITH_CUMULATIVE = DEFECT_DATA.map((d) => {
  runningScrapAcc += d.count;
  return {
    ...d,
    pctOfTotal: Math.round((d.count / totalScrap) * 100),
    cumPct: Math.round((runningScrapAcc / totalScrap) * 100),
  };
});

export const DowntimeParetoChart: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Downtime Pareto */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#292A2E] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#C9372C]" />
              <span>Downtime losses Pareto (80/20)</span>
            </h3>
            <p className="text-xs text-[#505258] mt-0.5">
              Cumulative root-cause downtime duration ({totalDowntime} total minutes logged)
            </p>
          </div>
          <span className="text-xs font-mono text-[#5D1F1A] bg-[#FFECEB] px-2 py-0.5 rounded-[3px] border border-[#E2483D]">
            Availability loss
          </span>
        </div>

        <div className="space-y-3">
          {DOWNTIME_WITH_CUMULATIVE.map((item) => (
            <div key={item.category} className="bg-[#F8F8F8] p-3 rounded-md border border-[#0B120E14]">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-[#292A2E]">{item.category}</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[#292A2E] font-bold">{item.durationMinutes}m</span>
                  <span className="text-[#505258]">({item.pctOfTotal}%)</span>
                  <span className="text-[#AE2E24] text-xs font-bold">
                    Cum: {item.cumPct}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-[#091E4214] rounded-full overflow-hidden border border-[#0B120E24] relative">
                <div
                  className="h-full bg-[#C9372C] rounded-full transition-all duration-300"
                  style={{ width: `${item.pctOfTotal}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-md bg-[#F8F8F8] border border-[#0B120E24] flex items-center gap-2 text-xs text-[#292A2E]">
          <TrendingUp className="h-4 w-4 text-[#1868DB] flex-shrink-0" />
          <span>
            <strong>Pareto insight:</strong> Top 3 root causes contribute to <strong>76%</strong> of all unplanned equipment downtime.
          </span>
        </div>
      </div>

      {/* 2. Scrap Defect Pareto */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#292A2E] flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-[#E06C00]" />
              <span>Scrap defect Pareto (80/20)</span>
            </h3>
            <p className="text-xs text-[#505258] mt-0.5">
              Cumulative scrap piece counts by defect classification ({totalScrap} pieces rejected)
            </p>
          </div>
          <span className="text-xs font-mono text-[#693200] bg-[#FFF5DB] px-2 py-0.5 rounded-[3px] border border-[#E06C00]">
            Quality loss
          </span>
        </div>

        <div className="space-y-3">
          {SCRAP_WITH_CUMULATIVE.map((item) => (
            <div key={item.code} className="bg-[#F8F8F8] p-3 rounded-md border border-[#0B120E14]">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-[#292A2E]">{item.label}</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[#292A2E] font-bold">{item.count} pcs</span>
                  <span className="text-[#505258]">({item.pctOfTotal}%)</span>
                  <span className="text-[#9E4C00] text-xs font-bold">
                    Cum: {item.cumPct}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-[#091E4214] rounded-full overflow-hidden border border-[#0B120E24]">
                <div
                  className="h-full bg-[#E06C00] rounded-full transition-all duration-300"
                  style={{ width: `${item.pctOfTotal}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-md bg-[#F8F8F8] border border-[#0B120E24] flex items-center gap-2 text-xs text-[#292A2E]">
          <TrendingUp className="h-4 w-4 text-[#1868DB] flex-shrink-0" />
          <span>
            <strong>Pareto insight:</strong> <strong>Flash</strong> and <strong>short shots</strong> account for <strong>69%</strong> of all scrap generation.
          </span>
        </div>
      </div>
    </div>
  );
};
