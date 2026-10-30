import React from 'react';
import { BarChart3, Clock, Zap, CheckCircle2, Award, AlertTriangle } from 'lucide-react';
import type { OeeCalculationResult, PlantOeeResponse } from '../../types/oee.js';

interface OeeScorecardsProps {
  result?: PlantOeeResponse | OeeCalculationResult | null;
}

export const OeeScorecards: React.FC<OeeScorecardsProps> = ({ result }) => {
  const metrics = result && 'metrics' in result ? result.metrics : undefined;
  const legacy = result && 'availability' in result ? result : undefined;

  const availability =
    metrics != null
      ? metrics.availability * 100
      : legacy?.availability != null
      ? legacy.availability * 100
      : 92.4;

  const performance =
    metrics != null
      ? metrics.performance * 100
      : legacy?.performance != null
      ? legacy.performance * 100
      : 89.6;

  const quality =
    metrics != null
      ? metrics.quality * 100
      : legacy?.quality != null
      ? legacy.quality * 100
      : 98.1;

  const oee =
    metrics != null
      ? metrics.oee * 100
      : legacy?.oee != null
      ? legacy.oee * 100
      : (availability * performance * quality) / 10000;

  const plannedMins =
    metrics?.breakdown?.plannedProductionTimeSeconds != null
      ? Math.round(metrics.breakdown.plannedProductionTimeSeconds / 60)
      : legacy?.plannedProductionTimeMinutes ?? 480;

  const operatingMins =
    metrics?.breakdown?.operatingTimeSeconds != null
      ? Math.round(metrics.breakdown.operatingTimeSeconds / 60)
      : legacy?.operatingTimeMinutes ?? 440;

  const goodParts =
    metrics?.breakdown?.goodPartsCount ??
    legacy?.goodPartsProduced ??
    5680;

  const totalParts =
    metrics?.breakdown?.totalPartsProduced ??
    legacy?.totalPartsProduced ??
    5788;

  const isWorldClass = oee >= 85.0;
  const isOverSpeed =
    metrics?.speedOverPerformance ??
    legacy?.isOverSpeed ??
    performance > 100.0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Overall OEE */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 flex flex-col justify-between shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#292A2E] flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-[#1868DB]" />
            <span>Overall OEE</span>
          </span>
          {isWorldClass && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#37471F] bg-[#EFFFD6] px-2 py-0.5 rounded-[3px] border border-[#6A9A23]">
              <Award className="h-3 w-3" />
              <span>World-class</span>
            </span>
          )}
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold font-mono text-[#292A2E] tracking-tight">
              {oee.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-[#505258] mt-1">
            ISO 22400-2: A ({availability.toFixed(1)}%) × P ({performance.toFixed(1)}%) × Q ({quality.toFixed(1)}%)
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full bg-[#091E4214] rounded-full overflow-hidden border border-[#0B120E24] mt-2">
          <div
            className="h-full rounded-full transition-all duration-500 bg-[#1868DB]"
            style={{ width: `${Math.min(oee, 100)}%` }}
          />
        </div>
      </div>

      {/* 2. Availability */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#292A2E] flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-[#22A06B]" />
            <span>Availability (A)</span>
          </span>
          <span className="text-xs font-mono text-[#505258]">Run / planned</span>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold font-mono text-[#216E4E] tracking-tight">
              {availability.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-[#505258] mt-1">
            Operating: {operatingMins}m / Planned: {plannedMins}m
          </p>
        </div>

        <div className="h-2 w-full bg-[#091E4214] rounded-full overflow-hidden border border-[#0B120E24] mt-2">
          <div
            className="h-full bg-[#22A06B] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(availability, 100)}%` }}
          />
        </div>
      </div>

      {/* 3. Performance */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#292A2E] flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-[#803FA5]" />
            <span>Performance (P)</span>
          </span>
          {isOverSpeed && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#693200] bg-[#FFF5DB] px-2 py-0.5 rounded-[3px] border border-[#E06C00]">
              <AlertTriangle className="h-3 w-3" />
              <span>Over-speed</span>
            </span>
          )}
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold font-mono text-[#803FA5] tracking-tight">
              {performance.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-[#505258] mt-1">
            Actual cycle pacing vs 22.0s ideal cycle time
          </p>
        </div>

        <div className="h-2 w-full bg-[#091E4214] rounded-full overflow-hidden border border-[#0B120E24] mt-2">
          <div
            className="h-full bg-[#803FA5] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(performance, 100)}%` }}
          />
        </div>
      </div>

      {/* 4. Quality */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#292A2E] flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[#206A83]" />
            <span>Quality (Q)</span>
          </span>
          <span className="text-xs font-mono text-[#505258]">Good / total</span>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold font-mono text-[#206A83] tracking-tight">
              {quality.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-[#505258] mt-1">
            Good: {goodParts.toLocaleString()} / Total: {totalParts.toLocaleString()} pcs
          </p>
        </div>

        <div className="h-2 w-full bg-[#091E4214] rounded-full overflow-hidden border border-[#0B120E24] mt-2">
          <div
            className="h-full bg-[#206A83] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(quality, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
