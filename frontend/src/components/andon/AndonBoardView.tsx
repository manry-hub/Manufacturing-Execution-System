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
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-rose-400" />
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              Digital Andon Incident Response Center
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
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
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Dispatch Andon Alert</span>
        </button>
      </div>

      {/* Andon Response KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Mean Time to Respond */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Mean Response Time</span>
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-100">2.4</span>
            <span className="text-xs text-slate-400">minutes</span>
          </div>
          <span className="text-[10px] text-emerald-400 mt-1">Within target (&lt;5 min)</span>
        </div>

        {/* Mean Time to Resolve */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Mean Resolution Time (MTTR)</span>
            <Activity className="h-4 w-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-100">14.8</span>
            <span className="text-xs text-slate-400">minutes</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Directly fed into OEE downtime</span>
        </div>

        {/* Active Open Incidents */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-rose-400 mb-1">
            <span>Open Incidents</span>
            <AlertOctagon className="h-4 w-4 text-rose-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-rose-400">{openTickets.length}</span>
          <span className="text-[10px] text-slate-400 mt-1">Awaiting technician response</span>
        </div>

        {/* Resolved Today */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
            <span>Resolved Incidents</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-400">{resolvedTickets.length}</span>
          <span className="text-[10px] text-slate-400 mt-1">Closed and verified</span>
        </div>
      </div>

      {/* 3-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: OPEN */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                1. Open / Pending Response ({openTickets.length})
              </h3>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
            {openTickets.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No open Andon alarms. All machines operating without active alerts.
              </div>
            ) : (
              openTickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-slate-950/80 border border-rose-500/40 rounded-xl p-3.5 space-y-2 shadow-md hover:border-rose-500 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-100 text-sm block">
                        {t.machine?.code ?? t.machineId}
                      </span>
                      <span className="text-[11px] font-mono text-rose-400 font-semibold uppercase">
                        {t.category.replace('_', ' ')}
                      </span>
                    </div>
                    <StatusBadge status="FAULT" size="sm" />
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80">
                    <span>{new Date(t.createdAt).toLocaleTimeString()}</span>
                    {canAcknowledgeOrResolve && (
                      <button
                        type="button"
                        onClick={() => void onAcknowledgeTicket(t.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow transition-colors"
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                2. In-Progress / Technician On-Site ({ackTickets.length})
              </h3>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
            {ackTickets.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No tickets currently under active troubleshooting.
              </div>
            ) : (
              ackTickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-slate-950/80 border border-amber-500/40 rounded-xl p-3.5 space-y-2 shadow-md hover:border-amber-500 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-100 text-sm block">
                        {t.machine?.code ?? t.machineId}
                      </span>
                      <span className="text-[11px] font-mono text-amber-300 font-semibold uppercase">
                        {t.category.replace('_', ' ')}
                      </span>
                    </div>
                    <StatusBadge status="IDLE" size="sm" />
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80">
                    <span>Ack: {t.acknowledgedAt ? new Date(t.acknowledgedAt).toLocaleTimeString() : '--'}</span>
                    {canAcknowledgeOrResolve && (
                      <button
                        type="button"
                        onClick={() => setSelectedTicketForResolve(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow transition-colors"
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                3. Resolved & Classified ({resolvedTickets.length})
              </h3>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
            {resolvedTickets.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No resolved incidents recorded today.
              </div>
            ) : (
              resolvedTickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3.5 space-y-2 opacity-90 hover:opacity-100 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-100 text-sm block">
                        {t.machine?.code ?? t.machineId}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        {t.downtimeClassification ?? 'RESOLVED'}
                      </span>
                    </div>
                    <StatusBadge status="COMPLETED" size="sm" />
                  </div>

                  {t.correctiveAction && (
                    <p className="text-xs text-slate-300 italic line-clamp-2">
                      &quot;{t.correctiveAction}&quot;
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-800/80">
                    <span>Duration: {t.resolutionTimeSeconds ? `${Math.round(t.resolutionTimeSeconds / 60)} min` : '15 min'}</span>
                    <span className="text-emerald-400">Closed</span>
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
