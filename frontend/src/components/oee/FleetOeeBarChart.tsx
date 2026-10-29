import React, { useState } from 'react';
import { Layers, Award, AlertCircle, Clock } from 'lucide-react';
import type { MachineOeeBreakdownItem } from '../../types/oee.js';

interface FleetOeeBarChartProps {
  breakdown: MachineOeeBreakdownItem[];
  windowType: 'SHIFT' | 'DAY';
}

export const FleetOeeBarChart: React.FC<FleetOeeBarChartProps> = ({ breakdown, windowType }) => {
  const [sortBy, setSortBy] = useState<'CODE' | 'OEE_DESC' | 'OEE_ASC'>('CODE');

  const sortedItems = [...breakdown].sort((a, b) => {
    if (sortBy === 'OEE_DESC') return b.metrics.oee - a.metrics.oee;
    if (sortBy === 'OEE_ASC') return a.metrics.oee - b.metrics.oee;
    return a.machineCode.localeCompare(b.machineCode);
  });

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#0B120E24]">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#1868DB]" />
            <h3 className="text-sm font-bold text-[#292A2E]">
              Fleet equipment effectiveness benchmarking
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-[3px] bg-[#E9F2FE] text-[#123263] border border-[#357DE8]">
              {breakdown.length} IMM cells
            </span>
          </div>
          <p className="text-xs text-[#505258] mt-0.5">
            Individual machine OEE, Availability (A), Performance (P), and Quality (Q) comparison for {windowType.toLowerCase()}
          </p>
        </div>

        {/* Sort & Filter Controls */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#6B6E76]">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'CODE' | 'OEE_DESC' | 'OEE_ASC')}
            aria-label="Sort fleet OEE"
            className="min-h-[30px] px-2.5 py-1 text-xs rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-medium"
          >
            <option value="CODE">Machine Code (Ascending)</option>
            <option value="OEE_DESC">OEE (Highest First)</option>
            <option value="OEE_ASC">OEE (Lowest / Bottleneck First)</option>
          </select>
        </div>
      </div>

      {/* Reference Benchmark Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#505258] bg-[#F8F8F8] px-3 py-2 rounded-md border border-[#0B120E24]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-[#22A06B]" />
            <span>World-class (≥ 85%)</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-[#E06C00]" />
            <span>Acceptable (70% - 84%)</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-[#E2483D]" />
            <span>Bottleneck (&lt; 70%)</span>
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-[#6B6E76] font-mono">
          <span className="h-3 w-0.5 bg-[#505258]" />
          <span>85% Benchmark target line</span>
        </div>
      </div>

      {/* Fleet Horizontal Bars */}
      <div className="space-y-3 pt-1">
        {sortedItems.map((item) => {
          const oeePct = Math.round(item.metrics.oee * 1000) / 10;
          const aPct = Math.round(item.metrics.availability * 1000) / 10;
          const pPct = Math.round(item.metrics.performance * 1000) / 10;
          const qPct = Math.round(item.metrics.quality * 1000) / 10;

          const isWorldClass = oeePct >= 85.0;
          const isBottleneck = oeePct < 70.0;

          const barColor = isWorldClass
            ? 'bg-[#22A06B]'
            : oeePct >= 70.0
            ? 'bg-[#E06C00]'
            : 'bg-[#E2483D]';

          const operatingMins = Math.round(item.metrics.breakdown.operatingTimeSeconds / 60);
          const plannedMins = Math.round(item.metrics.breakdown.plannedProductionTimeSeconds / 60);

          return (
            <div
              key={item.machineId}
              className="p-3 rounded-md bg-[#F8F8F8] border border-[#0B120E24] hover:bg-[#FFFFFF] transition-colors space-y-2"
            >
              {/* Machine Header Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono text-[#292A2E] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#0B120E24]">
                    {item.machineCode}
                  </span>
                  <span className="text-[#505258] font-medium truncate max-w-[220px]">
                    {item.machineName}
                  </span>
                  {isWorldClass && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#37471F] bg-[#EFFFD6] px-1.5 py-0.2 rounded border border-[#6A9A23]">
                      <Award className="h-3 w-3" />
                      <span>World-class</span>
                    </span>
                  )}
                  {isBottleneck && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5D1F1A] bg-[#FFECEB] px-1.5 py-0.2 rounded border border-[#E2483D]">
                      <AlertCircle className="h-3 w-3" />
                      <span>Loss alert</span>
                    </span>
                  )}
                </div>

                {/* Sub-Metrics Badges */}
                <div className="flex items-center gap-3 font-mono text-xs text-[#505258]">
                  <span>A: <strong className="text-[#216E4E]">{aPct.toFixed(1)}%</strong></span>
                  <span>P: <strong className="text-[#D97706]">{pPct.toFixed(1)}%</strong></span>
                  <span>Q: <strong className="text-[#123263]">{qPct.toFixed(1)}%</strong></span>
                  <span className="text-sm font-bold text-[#292A2E] min-w-[70px] text-right">
                    {oeePct.toFixed(1)}% OEE
                  </span>
                </div>
              </div>

              {/* Horizontal Bar with 85% Target Line Marker */}
              <div className="relative h-3 w-full bg-[#091E4214] rounded-full overflow-hidden border border-[#0B120E24]">
                {/* 85% Target Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#292A2E] z-10 opacity-70"
                  style={{ left: '85%' }}
                  title="85% World-Class Benchmark"
                />

                {/* Filled Progress Bar */}
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${Math.min(100, Math.max(2, oeePct))}%` }}
                />
              </div>

              {/* Bottom Operating Meta */}
              <div className="flex items-center justify-between text-[11px] text-[#6B6E76] font-mono pt-0.5">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-[#6B6E76]" />
                  <span>
                    Operating: {operatingMins}m / {plannedMins}m planned
                  </span>
                </span>
                <span>
                  Produced: <strong>{item.metrics.breakdown.goodPartsCount.toLocaleString()}</strong> good /{' '}
                  <span className={item.metrics.breakdown.scrapPartsCount > 0 ? 'text-[#AE2E24]' : ''}>
                    {item.metrics.breakdown.scrapPartsCount} scrap
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
