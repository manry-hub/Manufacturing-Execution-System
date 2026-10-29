import React from 'react';
import { TrendingUp, Award } from 'lucide-react';
import type { OeeCalculationResult } from '../../types/oee.js';

interface CurrentOeeRadialCardProps {
  plantOee?: (OeeCalculationResult & {
    metrics?: {
      oee: number;
      availability: number;
      performance: number;
      quality: number;
    };
  }) | null;
}

export const CurrentOeeRadialCard: React.FC<CurrentOeeRadialCardProps> = ({ plantOee }) => {
  const oeePercent =
    plantOee?.oee != null
      ? plantOee.oee * 100
      : plantOee?.metrics?.oee != null
      ? plantOee.metrics.oee * 100
      : 83.2;

  const target = 74.0;
  const clampedOee = Math.max(0, Math.min(100, oeePercent));
  const isWorldClass = clampedOee >= 85.0;

  // Donut geometry
  const cx = 70;
  const cy = 70;
  const r = 50;
  const circumference = 2 * Math.PI * r; // ~314.16
  const strokeOffset = circumference * (1 - clampedOee / 100);

  const arcColor = clampedOee >= 80 ? '#22A06B' : clampedOee >= 65 ? '#B38600' : '#E2483D';

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 flex flex-col justify-between shadow-xs">
      {/* Header with Title and Trend badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#292A2E]">Current OEE Score</h3>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#37471F] bg-[#EFFFD6] px-2 py-0.5 rounded-[3px] border border-[#6A9A23]">
          <TrendingUp className="h-3 w-3 text-[#6A9A23]" />
          <span>↑ 12.2%</span>
        </span>
      </div>

      {/* Circular Radial Donut Gauge */}
      <div className="flex flex-col items-center justify-center my-3 relative">
        <svg
          viewBox="0 0 140 140"
          className="w-36 h-36 -rotate-90 transform overflow-visible"
          aria-label={`Current OEE Score: ${clampedOee.toFixed(1)}%`}
        >
          {/* Background track circle */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#F1F2F4"
            strokeWidth="12"
          />

          {/* Progress circle */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={arcColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Text Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-3xl font-extrabold font-mono text-[#292A2E] tracking-tight">
            {Math.round(clampedOee)}%
          </span>
          {isWorldClass && (
            <span className="text-[10px] font-bold text-[#37471F] uppercase tracking-wider flex items-center gap-0.5 mt-0.5">
              <Award className="h-2.5 w-2.5 text-[#6A9A23]" />
              <span>World-Class</span>
            </span>
          )}
        </div>
      </div>

      {/* Legend & Target Comparison */}
      <div className="flex items-center justify-center gap-4 text-xs font-mono text-[#505258] pt-1 border-t border-[#0B120E24]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: arcColor }} />
          <span className="font-semibold text-[#292A2E]">OEE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#8C8F97]" />
          <span>Target {target}%</span>
        </div>
      </div>
    </div>
  );
};
