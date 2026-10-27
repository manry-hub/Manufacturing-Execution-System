import React from 'react';
import { Gauge, Sliders, Droplets, ThermometerSnowflake, Activity } from 'lucide-react';
import type { TelemetryMetrics } from '../../../types/machine.js';

interface TelemetryGaugesProps {
  metrics?: TelemetryMetrics;
}

export const TelemetryGauges: React.FC<TelemetryGaugesProps> = ({ metrics }) => {
  const pressure = metrics?.injectionPressureBar ?? 132.5;
  const cushion = metrics?.cushionPositionMm ?? 14.8;
  const oilTemp = metrics?.hydraulicOilTempCelsius ?? 49.2;
  const moldFixed = metrics?.moldTempFixedCelsius ?? 40.5;
  const moldMoving = metrics?.moldTempMovingCelsius ?? 42.1;
  const plasticizingTime = metrics?.plasticizingTimeSeconds ?? 6.8;

  // Percentage calculations for gauges
  const pressurePercent = Math.min(Math.round((pressure / 200) * 100), 100);
  const cushionPercent = Math.min(Math.round((cushion / 150) * 100), 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Injection Pressure Gauge */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-blue-400" />
              <span>Injection Pressure</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              0 - 200 bar
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Hydraulic ram injection line pressure during fill stroke
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-slate-100 tracking-tight">
                {pressure.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-slate-400">bar</span>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Hold: 90 bar
            </span>
          </div>

          {/* Visual bar gauge with threshold indicator */}
          <div className="relative h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${pressurePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1.5">
            <span>0 bar</span>
            <span className="text-slate-400">Target: 130 bar</span>
            <span>200 bar</span>
          </div>
        </div>
      </div>

      {/* 2. Cushion Position Gauge */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-cyan-400" />
              <span>Cushion Position</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              0 - 150 mm
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Melt buffer remaining at end of holding phase to avoid short shots
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-slate-100 tracking-tight">
                {cushion.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-slate-400">mm</span>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Min: 10 mm
            </span>
          </div>

          {/* Visual bar gauge */}
          <div className="relative h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-300"
              style={{ width: `${cushionPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1.5">
            <span>0 mm</span>
            <span className="text-slate-400">Ideal: 12 - 16 mm</span>
            <span>150 mm</span>
          </div>
        </div>
      </div>

      {/* 3. Auxiliary Sensors & Mold Thermals */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-amber-400" />
              <span>Auxiliary Sensors</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              Hydraulics & Tooling
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Oil temperature, recovery duration, and dual-side mold chillers
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Hydraulic Oil */}
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-1 text-slate-400 mb-0.5">
              <Droplets className="h-3.5 w-3.5 text-blue-400" />
              <span>Hydraulic Oil</span>
            </div>
            <span className="font-mono font-bold text-slate-100 text-sm">
              {oilTemp.toFixed(1)}°C
            </span>
          </div>

          {/* Plasticizing Recovery Time */}
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-1 text-slate-400 mb-0.5">
              <Gauge className="h-3.5 w-3.5 text-purple-400" />
              <span>Recovery Time</span>
            </div>
            <span className="font-mono font-bold text-slate-100 text-sm">
              {plasticizingTime.toFixed(1)}s
            </span>
          </div>

          {/* Fixed Mold Platen */}
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-1 text-slate-400 mb-0.5">
              <ThermometerSnowflake className="h-3.5 w-3.5 text-cyan-400" />
              <span>Mold Fixed</span>
            </div>
            <span className="font-mono font-bold text-slate-100 text-sm">
              {moldFixed.toFixed(1)}°C
            </span>
          </div>

          {/* Moving Mold Platen */}
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-1 text-slate-400 mb-0.5">
              <ThermometerSnowflake className="h-3.5 w-3.5 text-cyan-400" />
              <span>Mold Moving</span>
            </div>
            <span className="font-mono font-bold text-slate-100 text-sm">
              {moldMoving.toFixed(1)}°C
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
