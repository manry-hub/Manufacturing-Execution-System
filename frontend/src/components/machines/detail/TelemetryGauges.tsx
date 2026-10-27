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
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 flex flex-col justify-between shadow-xs">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-[#292A2E] flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-[#1868DB]" />
              <span>Injection pressure</span>
            </span>
            <span className="text-[11px] font-mono text-[#505258] bg-[#F1F2F4] border border-[#DCDFE4] px-2 py-0.5 rounded-[3px]">
              0 - 200 bar
            </span>
          </div>
          <p className="text-xs text-[#505258] mb-4">
            Hydraulic ram injection line pressure during fill stroke
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-[#292A2E] tracking-tight">
                {pressure.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-[#505258]">bar</span>
            </div>
            <span className="text-xs font-mono text-[#37471F] bg-[#EFFFD6] px-2 py-0.5 rounded-[3px] border border-[#6A9A23]">
              Hold: 90 bar
            </span>
          </div>

          {/* Visual bar gauge */}
          <div className="relative h-2.5 w-full bg-[#091E4214] rounded-full overflow-hidden border border-[#0B120E24]">
            <div
              className="h-full rounded-full bg-[#1868DB] transition-all duration-300"
              style={{ width: `${pressurePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#6B6E76] font-mono mt-1.5">
            <span>0 bar</span>
            <span className="text-[#505258]">Target: 130 bar</span>
            <span>200 bar</span>
          </div>
        </div>
      </div>

      {/* 2. Cushion Position Gauge */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 flex flex-col justify-between shadow-xs">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-[#292A2E] flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-[#206A83]" />
              <span>Cushion position</span>
            </span>
            <span className="text-[11px] font-mono text-[#505258] bg-[#F1F2F4] border border-[#DCDFE4] px-2 py-0.5 rounded-[3px]">
              0 - 150 mm
            </span>
          </div>
          <p className="text-xs text-[#505258] mb-4">
            Melt buffer remaining at end of holding phase to avoid short shots
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-[#292A2E] tracking-tight">
                {cushion.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-[#505258]">mm</span>
            </div>
            <span className="text-xs font-mono text-[#164555] bg-[#E7F9FF] px-2 py-0.5 rounded-[3px] border border-[#2898BD]">
              Min: 10 mm
            </span>
          </div>

          {/* Visual bar gauge */}
          <div className="relative h-2.5 w-full bg-[#091E4214] rounded-full overflow-hidden border border-[#0B120E24]">
            <div
              className="h-full rounded-full bg-[#206A83] transition-all duration-300"
              style={{ width: `${cushionPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#6B6E76] font-mono mt-1.5">
            <span>0 mm</span>
            <span className="text-[#505258]">Ideal: 12 - 16 mm</span>
            <span>150 mm</span>
          </div>
        </div>
      </div>

      {/* 3. Auxiliary Sensors & Mold Thermals */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 flex flex-col justify-between shadow-xs">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-[#292A2E] flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-[#E06C00]" />
              <span>Auxiliary sensors</span>
            </span>
            <span className="text-[11px] font-mono text-[#505258] bg-[#F1F2F4] border border-[#DCDFE4] px-2 py-0.5 rounded-[3px]">
              Hydraulics & tooling
            </span>
          </div>
          <p className="text-xs text-[#505258] mb-3">
            Oil temperature, recovery duration, and dual-side mold chillers
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Hydraulic Oil */}
          <div className="bg-[#F8F8F8] p-2.5 rounded-md border border-[#0B120E24]">
            <div className="flex items-center gap-1 text-[#505258] mb-0.5">
              <Droplets className="h-3.5 w-3.5 text-[#1868DB]" />
              <span>Hydraulic oil</span>
            </div>
            <span className="font-mono font-bold text-[#292A2E] text-sm">
              {oilTemp.toFixed(1)}°C
            </span>
          </div>

          {/* Plasticizing Recovery Time */}
          <div className="bg-[#F8F8F8] p-2.5 rounded-md border border-[#0B120E24]">
            <div className="flex items-center gap-1 text-[#505258] mb-0.5">
              <Gauge className="h-3.5 w-3.5 text-[#803FA5]" />
              <span>Recovery time</span>
            </div>
            <span className="font-mono font-bold text-[#292A2E] text-sm">
              {plasticizingTime.toFixed(1)}s
            </span>
          </div>

          {/* Fixed Mold Platen */}
          <div className="bg-[#F8F8F8] p-2.5 rounded-md border border-[#0B120E24]">
            <div className="flex items-center gap-1 text-[#505258] mb-0.5">
              <ThermometerSnowflake className="h-3.5 w-3.5 text-[#206A83]" />
              <span>Mold fixed</span>
            </div>
            <span className="font-mono font-bold text-[#292A2E] text-sm">
              {moldFixed.toFixed(1)}°C
            </span>
          </div>

          {/* Moving Mold Platen */}
          <div className="bg-[#F8F8F8] p-2.5 rounded-md border border-[#0B120E24]">
            <div className="flex items-center gap-1 text-[#505258] mb-0.5">
              <ThermometerSnowflake className="h-3.5 w-3.5 text-[#206A83]" />
              <span>Mold moving</span>
            </div>
            <span className="font-mono font-bold text-[#292A2E] text-sm">
              {moldMoving.toFixed(1)}°C
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
