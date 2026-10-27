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
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#292A2E] flex items-center gap-2">
            <Flame className="h-4 w-4 text-[#E06C00]" />
            <span>Barrel thermal zones</span>
            <span className="text-[11px] font-mono font-normal text-[#505258] bg-[#F1F2F4] px-2 py-0.5 rounded-[3px] border border-[#DCDFE4]">
              Closed-loop PID control
            </span>
          </h3>
          <p className="text-xs text-[#505258] mt-0.5">
            4-zone electric resistance heater band monitoring (210°C - 235°C melt profile)
          </p>
        </div>

        {hasHeaterFault && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-xs font-bold bg-[#FFECEB] text-[#5D1F1A] border border-[#E2483D]">
            <AlertTriangle className="h-3.5 w-3.5 text-[#C9372C]" />
            <span>Thermocouple fault detected</span>
          </span>
        )}
      </div>

      {/* Grid of 4 Thermal Zones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ZONES.map((zone) => {
          let actual = temperatures?.[zone.id] ?? zone.setpoint;
          if (hasHeaterFault && zone.id === 'zone4') {
            actual = 265;
          }

          const delta = actual - zone.setpoint;
          const absDelta = Math.abs(delta);
          const percent = Math.min(Math.round((actual / 300) * 100), 100);

          let statusBadge = (
            <span className="flex items-center gap-1 text-[11px] text-[#37471F] font-mono bg-[#EFFFD6] border border-[#6A9A23] px-1.5 py-0.5 rounded-[3px]">
              <CheckCircle className="h-3 w-3" />
              <span>Optimal ({delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}°C)</span>
            </span>
          );
          let barColor = 'bg-[#22A06B]';
          let textColor = 'text-[#292A2E]';

          if (absDelta > 15 || (hasHeaterFault && zone.id === 'zone4')) {
            statusBadge = (
              <span className="flex items-center gap-1 text-[11px] text-[#5D1F1A] font-mono font-bold bg-[#FFECEB] border border-[#E2483D] px-1.5 py-0.5 rounded-[3px]">
                <AlertTriangle className="h-3 w-3" />
                <span>Fault ({delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}°C)</span>
              </span>
            );
            barColor = 'bg-[#C9372C]';
            textColor = 'text-[#5D1F1A] font-bold';
          } else if (absDelta > 5) {
            statusBadge = (
              <span className="flex items-center gap-1 text-[11px] text-[#693200] font-mono bg-[#FFF5DB] border border-[#E06C00] px-1.5 py-0.5 rounded-[3px]">
                <AlertTriangle className="h-3 w-3" />
                <span>Adjusting ({delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}°C)</span>
              </span>
            );
            barColor = 'bg-[#E06C00]';
            textColor = 'text-[#693200]';
          }

          return (
            <div
              key={zone.id}
              className="bg-[#F8F8F8] border border-[#0B120E24] rounded-md p-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#292A2E]">{zone.name}</span>
                  <span className="text-[10px] text-[#505258] font-mono">SP: {zone.setpoint}°C</span>
                </div>
                <p className="text-[10px] text-[#505258] mb-2">{zone.description}</p>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className={`text-xl font-bold font-mono tracking-tight ${textColor}`}>
                    {actual.toFixed(1)}°C
                  </span>
                  {statusBadge}
                </div>

                {/* Temperature gauge bar */}
                <div className="h-2 w-full bg-[#091E4214] rounded-full overflow-hidden border border-[#0B120E24]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-[#6B6E76] font-mono mt-1">
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
