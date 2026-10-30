import React from 'react';
import type { ExecutiveOeeAnalyticsResponse } from '../../types/oee.js';

interface OeeProductionRateLossCardProps {
  data?: ExecutiveOeeAnalyticsResponse | null;
}

/**
 * Formats seconds into HH:MM:SS duration string.
 */
function formatDuration(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const seconds = safeSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export const OeeProductionRateLossCard: React.FC<OeeProductionRateLossCardProps> = ({ data }) => {
  const rate = data?.productionRate;
  const losses = data?.lossAccounts;

  const currentRate = rate?.currentRate ?? 72.0;
  const targetRate = rate?.targetRate ?? 100.0;
  const unit = rate?.unit ?? 'U/M';

  // Arc gauge geometry
  const radius = 75;
  const arcLength = Math.PI * radius; // ~235.6
  const rateRatio = targetRate > 0 ? Math.min(1.2, currentRate / targetRate) : 0;
  const progressRatio = Math.min(1.0, rateRatio);
  const strokeOffset = arcLength * (1 - progressRatio);

  const us = formatDuration(losses?.availabilityLoss?.unplannedSeconds ?? 5108); // 01:25:08
  const ps = formatDuration(losses?.availabilityLoss?.plannedSeconds ?? 8124);   // 02:15:24
  const ss = formatDuration(losses?.productionLoss?.smallStopsSeconds ?? 1685);   // 00:28:05
  const slow = formatDuration(losses?.productionLoss?.reducedSpeedSeconds ?? 11887); // 03:18:07
  const pr = losses?.qualityLoss?.productionRejects ?? 356;
  const sr = losses?.qualityLoss?.startupRejects ?? 125;

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs flex flex-col justify-between h-full">
      {/* 1. Production Rate Top Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#292A2E] tracking-tight">
            Production Rate
          </h3>
          <span className="text-[11px] font-semibold text-[#505258] bg-[#FAFBFC] border border-[#0B120E14] px-2 py-0.5 rounded-[3px]">
            Real-time Cycle Pace
          </span>
        </div>

        {/* Speedometer Arc Gauge with Left / Right Readouts */}
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          {/* Left: Current Rate */}
          <div className="text-left min-w-[70px]">
            <div className="text-xs font-semibold text-[#505258]">Current Rate</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#00A3BF] tracking-tight mt-0.5">
              {currentRate.toFixed(0)}
            </div>
          </div>

          {/* Center: 180° Semi-circular Arc */}
          <div className="flex flex-col items-center justify-center relative w-[170px] h-[95px] overflow-hidden">
            <svg width="170" height="95" viewBox="0 0 170 95" className="overflow-visible">
              {/* Background Arc Track */}
              <path
                d="M 10 85 A 75 75 0 0 1 160 85"
                fill="none"
                stroke="#091E4214"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Progress Arc */}
              <path
                d="M 10 85 A 75 75 0 0 1 160 85"
                fill="none"
                stroke="#00A3BF"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={arcLength}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            {/* Center Unit Text */}
            <div className="absolute bottom-1 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-bold font-mono text-[#505258] uppercase">
                {unit}
              </span>
            </div>
          </div>

          {/* Right: Target Rate */}
          <div className="text-right min-w-[70px]">
            <div className="text-xs font-semibold text-[#505258]">Target Rate</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#1868DB] tracking-tight mt-0.5">
              {targetRate.toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Loss Accounts Bottom Section (Six Big Losses) */}
      <div className="mt-5 pt-4 border-t border-[#0B120E14] space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#505258]">
          Loss Accounts (6 Big Losses)
        </h4>

        {/* Row 1: Availability Loss */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#FAFBFC] border border-[#0B120E14] rounded p-2.5 gap-1">
          <span className="text-xs font-bold text-[#292A2E]">
            Availability Loss
          </span>
          <div className="text-xs font-mono font-bold text-[#00A3BF] flex items-center gap-1.5 flex-wrap">
            <span>US {us}</span>
            <span className="text-[#8993A4]">/</span>
            <span>PS {ps}</span>
          </div>
        </div>

        {/* Row 2: Production Loss (Performance Loss) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#FAFBFC] border border-[#0B120E14] rounded p-2.5 gap-1">
          <span className="text-xs font-bold text-[#292A2E]">
            Production Loss
          </span>
          <div className="text-xs font-mono font-bold text-[#00A3BF] flex items-center gap-1.5 flex-wrap">
            <span>SS {ss}</span>
            <span className="text-[#8993A4]">/</span>
            <span>Slow {slow}</span>
          </div>
        </div>

        {/* Row 3: Quality Loss */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#FAFBFC] border border-[#0B120E14] rounded p-2.5 gap-1">
          <span className="text-xs font-bold text-[#292A2E]">
            Quality Loss
          </span>
          <div className="text-xs font-mono font-bold text-[#00A3BF] flex items-center gap-1.5 flex-wrap">
            <span>PR {pr.toLocaleString()}</span>
            <span className="text-[#8993A4]">/</span>
            <span>SR {sr.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
