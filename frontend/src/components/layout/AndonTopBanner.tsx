import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { AndonTicket } from '../../types/andon.js';
import { useAuth } from '../../context/AuthContext.js';

interface AndonTopBannerProps {
  tickets: AndonTicket[];
  onAcknowledge: (id: string) => Promise<void>;
  onNavigateToAndon: () => void;
}

export const AndonTopBanner: React.FC<AndonTopBannerProps> = ({
  tickets,
  onAcknowledge,
  onNavigateToAndon,
}) => {
  const { role } = useAuth();
  const openTickets = tickets.filter((t) => t.status === 'OPEN');

  if (openTickets.length === 0) return null;

  const first = openTickets[0];
  const canAcknowledge =
    role === 'maintenance_technician' ||
    role === 'maintenance_lead' ||
    role === 'production_supervisor' ||
    role === 'admin';

  return (
    <div
      role="alert"
      className="bg-gradient-to-r from-rose-950/90 via-rose-900/80 to-slate-900/90 border-b border-rose-500/40 text-rose-200 px-4 py-2.5 shadow-md shadow-rose-950/30"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-wide">
                ACTIVE ANDON ALERT: {first.machine?.code || first.machineId}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 uppercase border border-rose-500/50">
                {first.category.replace('_', ' ')}
              </span>
              {openTickets.length > 1 && (
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                  +{openTickets.length - 1} more
                </span>
              )}
            </div>
            <p className="text-xs text-rose-300/90 line-clamp-1">{first.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canAcknowledge && (
            <button
              type="button"
              onClick={() => void onAcknowledge(first.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Acknowledge</span>
            </button>
          )}
          <button
            type="button"
            onClick={onNavigateToAndon}
            className="inline-flex items-center gap-1 text-xs font-medium text-rose-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-rose-800/40 transition-colors"
          >
            <span>View Board</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
