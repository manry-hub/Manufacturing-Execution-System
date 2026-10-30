import React from 'react';
import type { ExecutiveOeeAnalyticsResponse } from '../../types/oee.js';

interface OeeKpiRingsCardProps {
  data?: ExecutiveOeeAnalyticsResponse | null;
}

/**
 * Helper to render an SVG Circular Donut Ring with smooth stroke calculations.
 */
const CircularRing: React.FC<{
  percentage: number;
  label: string;
  size: number;
  strokeWidth: number;
  strokeColor: string;
  trackColor?: string;
  isPrimary?: boolean;
}> = ({
  percentage,
  label,
  size,
  strokeWidth,
  strokeColor,
  trackColor = '#091E4214',
  isPrimary = false,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.max(0, Math.min(100, percentage));
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
        <span
          className={`font-mono font-extrabold text-[#292A2E] leading-tight ${
            isPrimary ? 'text-2xl sm:text-3xl tracking-tight' : 'text-base sm:text-lg font-bold'
          }`}
        >
          {percentage.toFixed(0)}%
        </span>
        <span
          className={`font-bold uppercase tracking-wider text-[#505258] ${
            isPrimary ? 'text-xs' : 'text-[10px]'
          }`}
        >
          {label}
        </span>
      </div>
    </div>
  );
};

export const OeeKpiRingsCard: React.FC<OeeKpiRingsCardProps> = ({ data }) => {
  const kpi = data?.kpi;
  const productQuantity = data?.productQuantity;

  const oee = kpi ? kpi.oee * 100 : 65.0;
  const ava = kpi ? kpi.availability * 100 : 89.0;
  const eff = kpi ? kpi.performance * 100 : 79.0;
  const qua = kpi ? kpi.quality * 100 : 93.0;

  const actualQty = productQuantity?.actualQuantity ?? 9448;
  const expectedQty = productQuantity?.expectedQuantity ?? 8685;
  const targetQty = productQuantity?.targetQuantity ?? 27000;

  const actualPercent = targetQty > 0 ? Math.min(100, (actualQty / targetQty) * 100) : 0;
  const expectedPercent = targetQty > 0 ? Math.min(100, (expectedQty / targetQty) * 100) : 0;

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#292A2E] tracking-tight">
          Key Performance Indicators
        </h3>
        {kpi?.isWorldClass && (
          <span className="text-[11px] font-bold text-[#37471F] bg-[#EFFFD6] px-2 py-0.5 rounded-[3px] border border-[#6A9A23]">
            World-Class (&ge;85%)
          </span>
        )}
      </div>

      {/* KPI Donut Rings Layout */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
        {/* Primary OEE Large Ring */}
        <div className="flex flex-col items-center">
          <CircularRing
            percentage={oee}
            label="OEE"
            size={130}
            strokeWidth={13}
            strokeColor="#00A3BF"
            trackColor="#091E4214"
            isPrimary={true}
          />
        </div>

        {/* 3 Companion Rings: AVA, EFF, QUA */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 items-center">
          <div className="flex flex-col items-center">
            <CircularRing
              percentage={ava}
              label="AVA"
              size={82}
              strokeWidth={9}
              strokeColor="#00A3BF"
              trackColor="#091E4214"
            />
          </div>
          <div className="flex flex-col items-center">
            <CircularRing
              percentage={eff}
              label="EFF"
              size={82}
              strokeWidth={9}
              strokeColor="#1868DB"
              trackColor="#091E4214"
            />
          </div>
          <div className="flex flex-col items-center">
            <CircularRing
              percentage={qua}
              label="QUA"
              size={82}
              strokeWidth={9}
              strokeColor="#0C2B54"
              trackColor="#091E4214"
            />
          </div>
        </div>
      </div>

      {/* Product Quantity Section */}
      <div className="mt-5 pt-4 border-t border-[#0B120E14]">
        <div className="flex items-center justify-between text-xs font-semibold text-[#505258] mb-1.5">
          <span>Product Quantity</span>
          <span>{actualPercent.toFixed(1)}% of Target</span>
        </div>

        {/* Multi-tier horizontal progress bar */}
        <div className="relative h-3 w-full bg-[#091E4214] rounded-full overflow-hidden border border-[#0B120E24]">
          {/* Actual progress */}
          <div
            className="h-full bg-[#00A3BF] rounded-full transition-all duration-500"
            style={{ width: `${actualPercent}%` }}
          />
          {/* Expected marker tick */}
          {expectedPercent > 0 && expectedPercent <= 100 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#0C2B54] z-10"
              style={{ left: `${expectedPercent}%` }}
              title={`Expected: ${expectedQty.toLocaleString()}`}
            />
          )}
        </div>

        {/* Quantity Breakdown Counters */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-1 text-center">
          <div className="bg-[#FAFBFC] border border-[#0B120E14] rounded p-2">
            <div className="text-lg sm:text-xl font-extrabold font-mono text-[#00A3BF] leading-none">
              {actualQty.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-[#505258] mt-1">
              Actual Quantity
            </div>
          </div>

          <div className="bg-[#FAFBFC] border border-[#0B120E14] rounded p-2">
            <div className="text-lg sm:text-xl font-extrabold font-mono text-[#1868DB] leading-none">
              {expectedQty.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-[#505258] mt-1">
              Expected Quantity
            </div>
          </div>

          <div className="bg-[#FAFBFC] border border-[#0B120E14] rounded p-2">
            <div className="text-lg sm:text-xl font-extrabold font-mono text-[#292A2E] leading-none">
              {targetQty.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-[#505258] mt-1">
              Target Quantity
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
