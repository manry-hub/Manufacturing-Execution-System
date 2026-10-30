import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  PlusCircle,
  Activity,
} from 'lucide-react';
import type { AndonTicket, AndonCategory } from '../../types/andon.js';
import type { Machine } from '../../types/machine.js';
import { StatusBadge } from '../common/StatusBadge.js';
import { ResolveAndonModal } from './ResolveAndonModal.js';
import { CreateAndonModal } from './CreateAndonModal.js';
import { useAuth } from '../../context/AuthContext.js';

interface AndonBoardViewProps {
  tickets: AndonTicket[];
  machines: Machine[];
  onAcknowledgeTicket: (id: string) => Promise<void>;
  onResolveTicket: (id: string, dto: { downtimeClassification: string; correctiveAction?: string }) => Promise<void>;
  onCreateTicket: (dto: {
    machineId: string;
    category: AndonCategory;
    description: string;
    priority?: string;
  }) => Promise<void>;
}

export const AndonBoardView: React.FC<AndonBoardViewProps> = ({
  tickets,
  machines,
  onAcknowledgeTicket,
  onResolveTicket,
  onCreateTicket,
}) => {
  const { role } = useAuth();
  const [selectedTicketForResolve, setSelectedTicketForResolve] = useState<AndonTicket | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedMachineForCreate, setSelectedMachineForCreate] = useState<Machine | null>(null);

  const canAcknowledgeOrResolve =
    role === 'maintenance_technician' ||
    role === 'maintenance_lead' ||
    role === 'production_supervisor' ||
    role === 'admin';

  // Group tickets into 3 Kanban columns
  const openTickets = tickets.filter((t) => t.status === 'OPEN');
  const ackTickets = tickets.filter((t) => t.status === 'ACKNOWLEDGED');
  const resolvedTickets = tickets.filter((t) => t.status === 'RESOLVED');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-[#C9372C]" />
            <h1 className="text-xl font-bold text-[#292A2E] tracking-tight">
              Digital andon incident response center
            </h1>
          </div>
          <p className="text-xs text-[#505258] mt-1">
            Real-time problem dispatch, technician assignment, root-cause downtime classification, and MTTR tracking
          </p>
        </div>

        {/* Trigger Andon Button */}
        <button
          type="button"
          onClick={() => {
            setSelectedMachineForCreate(machines[0] ?? null);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-[#C9372C] hover:bg-[#AE2E24] active:bg-[#872821] text-white shadow-xs transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Dispatch andon alert</span>
        </button>
      </div>

      {/* Andon Response KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Mean Time to Respond */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#505258] mb-1">
            <span>Mean response time</span>
            <Clock className="h-4 w-4 text-[#1868DB]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-[#292A2E]">2.4</span>
            <span className="text-xs text-[#505258]">minutes</span>
          </div>
          <span className="text-xs text-[#216E4E] mt-1">Within target (&lt;5 min)</span>
        </div>

        {/* Mean Time to Resolve */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#505258] mb-1">
            <span>Mean resolution time (MTTR)</span>
            <Activity className="h-4 w-4 text-[#803FA5]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-[#292A2E]">14.8</span>
            <span className="text-xs text-[#505258]">minutes</span>
          </div>
          <span className="text-xs text-[#505258] mt-1">Directly fed into OEE downtime</span>
        </div>

        {/* Active Open Incidents */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#5D1F1A] mb-1">
            <span>Open incidents</span>
            <AlertOctagon className="h-4 w-4 text-[#C9372C]" />
          </div>
          <span className="text-2xl font-bold font-mono text-[#5D1F1A]">{openTickets.length}</span>
          <span className="text-xs text-[#505258] mt-1">Awaiting technician response</span>
        </div>

        {/* Resolved Today */}
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#37471F] mb-1">
            <span>Resolved incidents</span>
            <CheckCircle2 className="h-4 w-4 text-[#6A9A23]" />
          </div>
          <span className="text-2xl font-bold font-mono text-[#37471F]">{resolvedTickets.length}</span>
          <span className="text-xs text-[#505258] mt-1">Closed and verified</span>
        </div>
      </div>

      {/* 3-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: OPEN */}
        <div className="bg-[#F8F8F8] border border-[#0B120E24] rounded-lg p-4 flex flex-col shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#0B120E24]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E2483D]" />
              <h3 className="text-xs font-bold text-[#292A2E]">
                1. Open / pending response ({openTickets.length})
              </h3>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
            {openTickets.length === 0 ? (
              <div className="text-center py-12 text-[#6B6E76] text-xs">
                No open andon alarms. All machines operating without active alerts.
              </div>
            ) : (
              openTickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-[#FFFFFF] border border-[#FD9891] rounded-md p-3.5 space-y-2 shadow-xs hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-[#292A2E] text-sm block">
                        {t.machine?.code ?? t.machineId}
                      </span>
                      <span className="text-xs font-mono text-[#AE2E24] font-semibold">
                        {t.category.replace('_', ' ')}
                      </span>
                    </div>
                    <StatusBadge status="FAULT" size="sm" />
                  </div>

                  <p className="text-xs text-[#292A2E] line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-[#505258] font-mono pt-2 border-t border-[#0B120E24]">
                    <span>{new Date(t.createdAt).toLocaleTimeString()}</span>
                    {canAcknowledgeOrResolve && (
                      <button
                        type="button"
                        onClick={() => void onAcknowledgeTicket(t.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#1868DB] hover:bg-[#1558BC] text-white shadow-xs transition-colors"
                      >
                        <span>Acknowledge</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: ACKNOWLEDGED */}
        <div className="bg-[#F8F8F8] border border-[#0B120E24] rounded-lg p-4 flex flex-col shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#0B120E24]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E06C00]" />
              <h3 className="text-xs font-bold text-[#292A2E]">
                2. In-progress / technician on-site ({ackTickets.length})
              </h3>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
            {ackTickets.length === 0 ? (
              <div className="text-center py-12 text-[#6B6E76] text-xs">
                No tickets currently under active troubleshooting.
              </div>
            ) : (
              ackTickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-[#FFFFFF] border border-[#FBC828] rounded-md p-3.5 space-y-2 shadow-xs hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-[#292A2E] text-sm block">
                        {t.machine?.code ?? t.machineId}
                      </span>
                      <span className="text-xs font-mono text-[#9E4C00] font-semibold">
                        {t.category.replace('_', ' ')}
                      </span>
                    </div>
                    <StatusBadge status="IDLE" size="sm" />
                  </div>

                  <p className="text-xs text-[#292A2E] line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-[#505258] font-mono pt-2 border-t border-[#0B120E24]">
                    <span>Ack: {t.acknowledgedAt ? new Date(t.acknowledgedAt).toLocaleTimeString() : '--'}</span>
                    {canAcknowledgeOrResolve && (
                      <button
                        type="button"
                        onClick={() => setSelectedTicketForResolve(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#5B7F24] hover:bg-[#4C6B1F] text-white shadow-xs transition-colors"
                      >
                        <span>Resolve</span>
                        <CheckCircle2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: RESOLVED */}
        <div className="bg-[#F8F8F8] border border-[#0B120E24] rounded-lg p-4 flex flex-col shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#0B120E24]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#22A06B]" />
              <h3 className="text-xs font-bold text-[#292A2E]">
                3. Resolved & classified ({resolvedTickets.length})
              </h3>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
            {resolvedTickets.length === 0 ? (
              <div className="text-center py-12 text-[#6B6E76] text-xs">
                No resolved incidents recorded today.
              </div>
            ) : (
              resolvedTickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-[#FFFFFF] border border-[#B3DF72] rounded-md p-3.5 space-y-2 shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-[#292A2E] text-sm block">
                        {t.machine?.code ?? t.machineId}
                      </span>
                      <span className="text-xs font-mono text-[#216E4E]">
                        {t.downtimeClassification ?? 'RESOLVED'}
                      </span>
                    </div>
                    <StatusBadge status="COMPLETED" size="sm" />
                  </div>

                  {t.correctiveAction && (
                    <p className="text-xs text-[#505258] italic line-clamp-2">
                      &quot;{t.correctiveAction}&quot;
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-[#505258] font-mono pt-2 border-t border-[#0B120E24]">
                    <span>Duration: {t.resolutionTimeSeconds ? `${Math.round(t.resolutionTimeSeconds / 60)} min` : '15 min'}</span>
                    <span className="text-[#216E4E] font-medium">Closed</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Resolve Modal */}
      <ResolveAndonModal
        isOpen={Boolean(selectedTicketForResolve)}
        onClose={() => setSelectedTicketForResolve(null)}
        ticket={selectedTicketForResolve}
        onSubmit={onResolveTicket}
      />

      {/* Operator Call-for-Help Modal */}
      <CreateAndonModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        machine={selectedMachineForCreate}
        onSubmit={onCreateTicket}
      />
    </div>
  );
};
