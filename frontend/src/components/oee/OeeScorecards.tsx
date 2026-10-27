import React from 'react';
import { BarChart3, Clock, Zap, CheckCircle2, Award, AlertTriangle } from 'lucide-react';
import type { OeeCalculationResult } from '../../types/oee.js';

interface OeeScorecardsProps {
  result?: OeeCalculationResult | null;
}

export const OeeScorecards: React.FC<OeeScorecardsProps> = ({ result }) => {
  // Default values if no OEE calculation result yet
  const availability = result ? result.availability * 100 : 92.4;
  const performance = result ? result.performance * 100 : 89.6;
  const quality = result ? result.quality * 100 : 98.1;
  const oee = result ? result.oee * 100 : (availability * performance * quality) / 10000;

  const isWorldClass = oee >= 85.0;
  const isOverSpeed = result?.isOverSpeed ?? performance > 100.0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Overall OEE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            <span>Overall OEE</span>
          </span>
          {isWorldClass && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
              <Award className="h-3 w-3" />
              <span>World-Class</span>
            </span>
          )}
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold font-mono text-slate-100 tracking-tight">
              {oee.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ISO 22400-2 Metric: A ({availability.toFixed(1)}%) × P ({performance.toFixed(1)}%) × Q ({quality.toFixed(1)}%)
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isWorldClass ? 'bg-gradient-to-r from-blue-500 to-emerald-400' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(oee, 100)}%` }}
          />
        </div>
      </div>

      {/* 2. Availability */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-emerald-400" />
            <span>Availability (A)</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400">Run / Planned</span>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold font-mono text-emerald-400 tracking-tight">
              {availability.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Operating: {result ? Math.round(result.operatingTimeMinutes) : 440}m / Planned: {result ? Math.round(result.plannedProductionTimeMinutes) : 480}m
          </p>
        </div>

        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-2">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(availability, 100)}%` }}
          />
        </div>
      </div>

      {/* 3. Performance */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-purple-400" />
            <span>Performance (P)</span>
          </span>
          {isOverSpeed && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
              <AlertTriangle className="h-3 w-3" />
              <span>Over-Speed</span>
            </span>
          )}
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold font-mono text-purple-400 tracking-tight">
              {performance.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Actual cycle pacing vs 22.0s Ideal Cycle Time
          </p>
        </div>

        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-2">
          <div
            className="h-full bg-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(performance, 100)}%` }}
          />
        </div>
      </div>

      {/* 4. Quality */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-cyan-400" />
            <span>Quality (Q)</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400">Good / Total</span>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold font-mono text-cyan-400 tracking-tight">
              {quality.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Good: {result ? result.goodPartsProduced.toLocaleString() : '5,680'} / Total: {result ? result.totalPartsProduced.toLocaleString() : '5,788'} pcs
          </p>
        </div>

        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-2">
          <div
            className="h-full bg-cyan-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(quality, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
