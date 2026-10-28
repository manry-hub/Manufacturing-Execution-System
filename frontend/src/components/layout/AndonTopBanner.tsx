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
      className="bg-[#FFECEB] border-b border-[#E2483D] px-4 py-2.5 shadow-sm"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FFE0DD] text-[#C9372C] border border-[#FD9891]">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#AE2E24] text-xs uppercase tracking-wide">
                Active andon alert: {first.machine?.code || first.machineId}
              </span>
              <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-[3px] bg-[#FFFFFF] text-[#AE2E24] uppercase border border-[#E2483D]">
                {first.category.replace('_', ' ')}
              </span>
              {openTickets.length > 1 && (
                <span className="text-xs bg-[#FFFFFF] text-[#505258] px-2 py-0.5 rounded-full border border-[#0B120E24]">
                  +{openTickets.length - 1} more
                </span>
              )}
            </div>
            {/* Body text must be neutral text #292A2E per SectionMessage spec in DESIGN.md */}
            <p className="text-xs text-[#292A2E] line-clamp-1">{first.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canAcknowledge && (
            <button
              type="button"
              onClick={() => void onAcknowledge(first.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#C9372C] hover:bg-[#AE2E24] text-white shadow-sm transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Acknowledge</span>
            </button>
          )}
          <button
            type="button"
            onClick={onNavigateToAndon}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#1868DB] hover:text-[#1558BC] px-2.5 py-1.5 rounded-md hover:bg-[#091E420F] transition-colors"
          >
            <span>View board</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
