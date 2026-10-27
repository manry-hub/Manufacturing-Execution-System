import React from 'react';
import { Flame, CheckCircle, AlertTriangle } from 'lucide-react';
import type { BarrelTemperatures } from '../../../types/machine.js';

interface BarrelHeatingZonesProps {
  temperatures?: BarrelTemperatures;
  hasHeaterFault?: boolean;
}

interface ZoneSpec {
  id: keyof BarrelTemperatures;
  name: string;
  setpoint: number;
  description: string;
}

const ZONES: ZoneSpec[] = [
  { id: 'zone1', name: 'Zone 1: Feed', setpoint: 210, description: 'Hopper throat / solid plastic intake' },
  { id: 'zone2', name: 'Zone 2: Compression', setpoint: 220, description: 'Plastic melting & air expulsion' },
  { id: 'zone3', name: 'Zone 3: Metering', setpoint: 230, description: 'Homogeneous melt homogenization' },
  { id: 'zone4', name: 'Zone 4: Nozzle', setpoint: 235, description: 'Direct injection into mold sprue' },
];

export const BarrelHeatingZones: React.FC<BarrelHeatingZonesProps> = ({
  temperatures,
  hasHeaterFault = false,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-400" />
            <span>Barrel Thermal Zones</span>
            <span className="text-[11px] font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60">
              Closed-Loop PID Control
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            4-Zone electric resistance heater band monitoring (210°C - 235°C melt profile)
          </p>
        </div>

        {hasHeaterFault && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            <span>THERMOCOUPLE FAULT DETECTED</span>
          </span>
        )}
      </div>

      {/* Grid of 4 Thermal Zones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ZONES.map((zone) => {
          // If heater fault is active, force zone 4 to overheat/underheat to demonstrate alarm
          let actual = temperatures?.[zone.id] ?? zone.setpoint;
          if (hasHeaterFault && zone.id === 'zone4') {
            actual = 265; // High temp runaway
          }

          const delta = actual - zone.setpoint;
          const absDelta = Math.abs(delta);
          const percent = Math.min(Math.round((actual / 300) * 100), 100);

          let statusBadge = (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
              <CheckCircle className="h-3 w-3" />
              <span>Optimal ({delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}°C)</span>
            </span>
          );
          let barColor = 'bg-emerald-500';
          let textColor = 'text-slate-100';

          if (absDelta > 15 || (hasHeaterFault && zone.id === 'zone4')) {
            statusBadge = (
              <span className="flex items-center gap-1 text-[11px] text-rose-400 font-mono font-bold">
                <AlertTriangle className="h-3 w-3" />
                <span>FAULT ({delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}°C)</span>
              </span>
            );
            barColor = 'bg-rose-500 animate-pulse';
            textColor = 'text-rose-400 font-bold';
          } else if (absDelta > 5) {
            statusBadge = (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                <AlertTriangle className="h-3 w-3" />
                <span>Adjusting ({delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}°C)</span>
              </span>
            );
            barColor = 'bg-amber-500';
            textColor = 'text-amber-300';
          }

          return (
            <div
              key={zone.id}
              className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-200">{zone.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">SP: {zone.setpoint}°C</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-2">{zone.description}</p>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className={`text-xl font-bold font-mono tracking-tight ${textColor}`}>
                    {actual.toFixed(1)}°C
                  </span>
                  {statusBadge}
                </div>

                {/* Temperature gauge bar */}
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                  <span>0°C</span>
                  <span>150°C</span>
                  <span>300°C</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
