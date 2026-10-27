import React from 'react';
import { AlertTriangle, Trash2, TrendingUp } from 'lucide-react';

interface ParetoItem {
  category: string;
  durationMinutes: number;
}

const DOWNTIME_DATA: ParetoItem[] = [
  { category: 'Heater Band Thermocouple Alarm', durationMinutes: 145 },
  { category: 'Mechanical Hydraulic Leak', durationMinutes: 92 },
  { category: 'Mold Parting Line Flash Choke', durationMinutes: 58 },
  { category: 'Colorant & Resin Changeover', durationMinutes: 42 },
  { category: 'Material Hopper Starvation', durationMinutes: 28 },
  { category: 'Operator Break / Minor Stop', durationMinutes: 16 },
];

const DEFECT_DATA = [
  { code: 'FLASH', label: 'Flash / Burrs', count: 68 },
  { code: 'SHORT_SHOT', label: 'Short Shot', count: 42 },
  { code: 'WARPAGE', label: 'Shrinkage Warpage', count: 24 },
  { code: 'SINK_MARK', label: 'Sink Marks', count: 16 },
  { code: 'CONTAMINATION', label: 'Black Specks', count: 8 },
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
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span>Downtime Losses Pareto (80/20)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cumulative root-cause downtime duration ({totalDowntime} total minutes logged)
            </p>
          </div>
          <span className="text-xs font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
            Availability Loss
          </span>
        </div>

        <div className="space-y-3">
          {DOWNTIME_WITH_CUMULATIVE.map((item) => (
            <div key={item.category} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-200">{item.category}</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-300 font-bold">{item.durationMinutes}m</span>
                  <span className="text-slate-500">({item.pctOfTotal}%)</span>
                  <span className="text-rose-400 text-[11px] font-bold">
                    Cum: {item.cumPct}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-300"
                  style={{ width: `${item.pctOfTotal}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
          <TrendingUp className="h-4 w-4 text-rose-400 flex-shrink-0" />
          <span>
            <strong>Pareto Insight:</strong> Top 3 root causes contribute to <strong>76%</strong> of all unplanned equipment downtime.
          </span>
        </div>
      </div>

      {/* 2. Scrap Defect Pareto */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-amber-400" />
              <span>Scrap Defect Pareto (80/20)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cumulative scrap piece counts by defect classification ({totalScrap} pieces rejected)
            </p>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            Quality Loss
          </span>
        </div>

        <div className="space-y-3">
          {SCRAP_WITH_CUMULATIVE.map((item) => (
            <div key={item.code} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-200">{item.label}</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-300 font-bold">{item.count} pcs</span>
                  <span className="text-slate-500">({item.pctOfTotal}%)</span>
                  <span className="text-amber-400 text-[11px] font-bold">
                    Cum: {item.cumPct}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${item.pctOfTotal}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
          <TrendingUp className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Pareto Insight:</strong> <strong>Flash</strong> and <strong>Short Shots</strong> account for <strong>69%</strong> of all scrap generation.
          </span>
        </div>
      </div>
    </div>
  );
};
