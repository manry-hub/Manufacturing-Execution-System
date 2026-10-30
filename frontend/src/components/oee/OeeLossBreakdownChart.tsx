import React from 'react';
import { Activity, Clock, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { OeeMetricsResult } from '../../types/oee.js';

interface OeeLossBreakdownChartProps {
  metrics: OeeMetricsResult;
  windowType: 'SHIFT' | 'DAY';
}

export const OeeLossBreakdownChart: React.FC<OeeLossBreakdownChartProps> = ({ metrics, windowType }) => {
  const a = Math.min(1.0, Math.max(0, metrics.availability));
  const p = Math.min(1.0, Math.max(0, metrics.performance));
  const q = Math.min(1.0, Math.max(0, metrics.quality));
  const oee = Math.min(1.0, Math.max(0, metrics.oee));

  // ISO 22400-2 / TPM 6 Big Losses cascade calculation
  // Total Planned Time = 100%
  const availabilityLossPct = Math.round((1 - a) * 1000) / 10;
  const performanceLossPct = Math.round(a * (1 - p) * 1000) / 10;
  const qualityLossPct = Math.round(a * p * (1 - q) * 1000) / 10;
  const netEffectiveOeePct = Math.round(oee * 1000) / 10;

  const plannedMins = Math.round(metrics.breakdown.plannedProductionTimeSeconds / 60);
  const operatingMins = Math.round(metrics.breakdown.operatingTimeSeconds / 60);
  const downtimeMins = Math.max(0, plannedMins - operatingMins);

  // Speed loss in equivalent minutes
  const speedLossMins = Math.round(operatingMins * (1 - p));

  // Scrap loss in equivalent parts and minutes
  const scrapParts = metrics.breakdown.scrapPartsCount;
  const idealCycleSec = metrics.breakdown.idealCycleTimeSeconds || 20;
  const scrapLossMins = Math.round((scrapParts * idealCycleSec) / 60);

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#0B120E24]">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#1868DB]" />
          <div>
            <h3 className="text-sm font-bold text-[#292A2E]">
              ISO 22400-2 Equipment loss cascade (6 Big Losses)
            </h3>
            <p className="text-xs text-[#505258]">
              Decomposition of planned production time into Availability, Performance, and Quality losses
            </p>
          </div>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded-[3px] bg-[#F1F2F4] text-[#505258] border border-[#DCDFE4]">
          {windowType === 'SHIFT' ? 'Shift window (8h)' : '24h day window'}
        </span>
      </div>

      {/* Stacked Loss Waterfall Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-[#505258]">
          <span className="font-semibold text-[#292A2E]">
            Production time breakdown (Total: {plannedMins}m planned)
          </span>
          <span className="font-mono">
            Net Value-Added: <strong className="text-[#1868DB]">{netEffectiveOeePct}%</strong>
          </span>
        </div>

        {/* Multi-segment stacked progress bar */}
        <div className="h-6 w-full rounded-md overflow-hidden flex border border-[#0B120E24] shadow-inner bg-[#F1F2F4]">
          {/* 1. Net Value-Added OEE (Green/Blue) */}
          {netEffectiveOeePct > 0 && (
            <div
              className="bg-[#1868DB] text-white text-[11px] font-bold font-mono flex items-center justify-center overflow-hidden transition-all"
              style={{ width: `${netEffectiveOeePct}%` }}
              title={`Net OEE Operating Time: ${netEffectiveOeePct}%`}
            >
              {netEffectiveOeePct >= 15 ? `${netEffectiveOeePct}% OEE` : ''}
            </div>
          )}

          {/* 2. Quality Loss (Red) */}
          {qualityLossPct > 0 && (
            <div
              className="bg-[#E2483D] text-white text-[11px] font-bold font-mono flex items-center justify-center overflow-hidden transition-all"
              style={{ width: `${qualityLossPct}%` }}
              title={`Quality / Scrap Loss: ${qualityLossPct}%`}
            >
              {qualityLossPct >= 8 ? `${qualityLossPct}%` : ''}
            </div>
          )}

          {/* 3. Performance Loss (Amber) */}
          {performanceLossPct > 0 && (
            <div
              className="bg-[#D97706] text-white text-[11px] font-bold font-mono flex items-center justify-center overflow-hidden transition-all"
              style={{ width: `${performanceLossPct}%` }}
              title={`Performance / Speed Loss: ${performanceLossPct}%`}
            >
              {performanceLossPct >= 8 ? `${performanceLossPct}%` : ''}
            </div>
          )}

          {/* 4. Availability Loss (Orange/Gray) */}
          {availabilityLossPct > 0 && (
            <div
              className="bg-[#E06C00] text-white text-[11px] font-bold font-mono flex items-center justify-center overflow-hidden transition-all"
              style={{ width: `${availabilityLossPct}%` }}
              title={`Availability / Downtime Loss: ${availabilityLossPct}%`}
            >
              {availabilityLossPct >= 8 ? `${availabilityLossPct}%` : ''}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#505258] pt-1">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#1868DB]" />
              <span>Net value-add ({netEffectiveOeePct}%)</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#E2483D]" />
              <span>Scrap & defect loss ({qualityLossPct}%)</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#D97706]" />
              <span>Speed & slow cycle loss ({performanceLossPct}%)</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#E06C00]" />
              <span>Downtime & setup loss ({availabilityLossPct}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* 4 Detailed Loss Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {/* Card 1: Net Operating Output */}
        <div className="p-3.5 rounded-md bg-[#EFFFD6] border border-[#6A9A23] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-[#37471F] flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#6A9A23]" />
              <span>Good Output</span>
            </span>
            <span className="text-xs font-bold text-[#37471F] font-mono">
              {netEffectiveOeePct}%
            </span>
          </div>
          <p className="text-lg font-extrabold font-mono text-[#292A2E]">
            {metrics.breakdown.goodPartsCount.toLocaleString()} <span className="text-xs font-normal text-[#505258]">pcs</span>
          </p>
          <p className="text-[11px] text-[#505258] mt-1">
            Produced in spec at standard cycle time
          </p>
        </div>

        {/* Card 2: Quality Scrap Loss */}
        <div className="p-3.5 rounded-md bg-[#FFECEB] border border-[#E2483D] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-[#5D1F1A] flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-[#E2483D]" />
              <span>Quality Defect Loss</span>
            </span>
            <span className="text-xs font-bold text-[#5D1F1A] font-mono">
              -{qualityLossPct}%
            </span>
          </div>
          <p className="text-lg font-extrabold font-mono text-[#AE2E24]">
            {scrapParts} <span className="text-xs font-normal text-[#505258]">pcs ({scrapLossMins}m eq)</span>
          </p>
          <p className="text-[11px] text-[#505258] mt-1">
            Flash, short shots, and startup purges
          </p>
        </div>

        {/* Card 3: Performance Speed Loss */}
        <div className="p-3.5 rounded-md bg-[#FFF5DB] border border-[#E06C00] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-[#693200] flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-[#E06C00]" />
              <span>Speed Loss</span>
            </span>
            <span className="text-xs font-bold text-[#693200] font-mono">
              -{performanceLossPct}%
            </span>
          </div>
          <p className="text-lg font-extrabold font-mono text-[#E06C00]">
            {speedLossMins} <span className="text-xs font-normal text-[#505258]">min lost</span>
          </p>
          <p className="text-[11px] text-[#505258] mt-1">
            Slow injection cycles and cooling drift
          </p>
        </div>

        {/* Card 4: Availability Downtime Loss */}
        <div className="p-3.5 rounded-md bg-[#F8F8F8] border border-[#0B120E24] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-[#292A2E] flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-[#6B6E76]" />
              <span>Downtime Loss</span>
            </span>
            <span className="text-xs font-bold text-[#AE2E24] font-mono">
              -{availabilityLossPct}%
            </span>
          </div>
          <p className="text-lg font-extrabold font-mono text-[#292A2E]">
            {downtimeMins} <span className="text-xs font-normal text-[#505258]">min lost</span>
          </p>
          <p className="text-[11px] text-[#505258] mt-1">
            Unplanned stops, mold setup, and alarms
          </p>
        </div>
      </div>
    </div>
  );
};
