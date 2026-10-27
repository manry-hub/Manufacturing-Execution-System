import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal.js';
import type { AndonTicket } from '../../types/andon.js';

interface ResolveAndonModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: AndonTicket | null;
  onSubmit: (id: string, dto: {
    downtimeClassification: string;
    correctiveAction?: string;
  }) => Promise<void>;
}

const DOWNTIME_CLASSIFICATIONS = [
  { id: 'HEATER_BAND_FAILURE', label: 'Heater Band / Thermocouple Runaway' },
  { id: 'MECHANICAL_FAILURE', label: 'Mechanical / Hydraulic Valve Failure' },
  { id: 'MOLD_DAMAGE', label: 'Mold Damage / Ejector Pin Seizure' },
  { id: 'ELECTRICAL_FAULT', label: 'Electrical Servo / Drive Trip' },
  { id: 'MATERIAL_STARVATION', label: 'Material Starvation / Hopper Bridging' },
  { id: 'PROCESS_DEVIATION', label: 'Process Deviation / Barrel Flush Required' },
  { id: 'OPERATOR_ASSISTANCE', label: 'Operator Assistance / Setup Alignment' },
];

export const ResolveAndonModal: React.FC<ResolveAndonModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onSubmit,
}) => {
  const [classification, setClassification] = useState<string>('HEATER_BAND_FAILURE');
  const [correctiveAction, setCorrectiveAction] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!ticket) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctiveAction.trim()) {
      setError('Please provide the corrective action performed.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(ticket.id, {
        downtimeClassification: classification,
        correctiveAction: correctiveAction.trim(),
      });
      setCorrectiveAction('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Resolve Andon Incident — ${ticket.ticketNumber}`}
      maxWidth="md"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {/* Ticket Header Summary */}
        <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Machine: </span>
            <span className="font-bold text-slate-200">{ticket.machine?.code ?? ticket.machineId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Category: </span>
            <span className="font-mono text-slate-300">{ticket.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Initial Complaint: </span>
            <span className="text-slate-300 italic line-clamp-1">{ticket.description}</span>
          </div>
        </div>

        {/* Root Cause Downtime Classification */}
        <div>
          <label htmlFor="resolve-classification" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Verified Root Cause / Downtime Classification
          </label>
          <select
            id="resolve-classification"
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {DOWNTIME_CLASSIFICATIONS.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                {c.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-1">
            Links directly to ISO 22400-2 downtime Pareto analytics
          </p>
        </div>

        {/* Corrective Action Notes */}
        <div>
          <label htmlFor="resolve-notes" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Corrective Action Taken
          </label>
          <textarea
            id="resolve-notes"
            rows={3}
            required
            value={correctiveAction}
            onChange={(e) => setCorrectiveAction(e.target.value)}
            placeholder="e.g. Replaced faulty thermocouple on Zone 4, verified PID loop reached 235°C setpoint, and cleared controller alarm..."
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isSubmitting ? 'Resolving...' : 'Confirm & Resolve Ticket'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
