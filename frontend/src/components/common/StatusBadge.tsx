import React from 'react';
import type { NormalizedMachineStatus } from '../../types/machine.js';

interface StatusBadgeProps {
  status: NormalizedMachineStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showPulse = true,
}) => {
  const normalized = status.toUpperCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotColor = 'bg-slate-400';
  let pulseEffect = false;

  switch (normalized) {
    case 'RUNNING':
    case 'ACTIVE':
    case 'ONLINE':
      colorClasses = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      dotColor = 'bg-emerald-400';
      pulseEffect = true;
      break;
    case 'IDLE':
    case 'PAUSED':
    case 'PENDING':
      colorClasses = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      dotColor = 'bg-amber-400';
      break;
    case 'FAULT':
    case 'CRITICAL':
    case 'CANCELLED':
      colorClasses = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      dotColor = 'bg-rose-400';
      pulseEffect = true;
      break;
    case 'SETUP':
    case 'IN_PROGRESS':
    case 'RELEASED':
      colorClasses = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      dotColor = 'bg-cyan-400';
      break;
    case 'STOPPED':
    case 'COMPLETED':
    case 'RESOLVED':
      colorClasses = 'bg-slate-700/40 text-slate-300 border-slate-600/40';
      dotColor = 'bg-slate-400';
      break;
    case 'DISCONNECTED':
    case 'OFFLINE':
      colorClasses = 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50';
      dotColor = 'bg-zinc-500';
      break;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-all duration-200 tracking-wide ${colorClasses} ${sizeClasses}`}
    >
      <span className="relative flex h-2 w-2">
        {pulseEffect && showPulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
      </span>
      {normalized}
    </span>
  );
};
