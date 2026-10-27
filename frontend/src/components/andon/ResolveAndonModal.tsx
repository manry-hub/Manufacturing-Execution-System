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
  { id: 'HEATER_BAND_FAILURE', label: 'Heater band / thermocouple runaway' },
  { id: 'MECHANICAL_FAILURE', label: 'Mechanical / hydraulic valve failure' },
  { id: 'MOLD_DAMAGE', label: 'Mold damage / ejector pin seizure' },
  { id: 'ELECTRICAL_FAULT', label: 'Electrical servo / drive trip' },
  { id: 'MATERIAL_STARVATION', label: 'Material starvation / hopper bridging' },
  { id: 'PROCESS_DEVIATION', label: 'Process deviation / barrel flush required' },
  { id: 'OPERATOR_ASSISTANCE', label: 'Operator assistance / setup alignment' },
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
      title={`Resolve andon incident — ${ticket.ticketNumber}`}
      maxWidth="md"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {/* Ticket Header Summary Well */}
        <div className="bg-[#F8F8F8] rounded-md p-3 border border-[#0B120E14] text-xs space-y-1 text-[#292A2E]">
          <div className="flex justify-between">
            <span className="text-[#505258]">Machine: </span>
            <span className="font-bold text-[#292A2E]">{ticket.machine?.code ?? ticket.machineId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#505258]">Category: </span>
            <span className="font-mono text-[#292A2E]">{ticket.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#505258]">Initial complaint: </span>
            <span className="text-[#505258] italic line-clamp-1">{ticket.description}</span>
          </div>
        </div>

        {/* Root Cause Downtime Classification */}
        <div>
          <label htmlFor="resolve-classification" className="block text-xs font-semibold text-[#505258] mb-1.5">
            Verified root cause / downtime classification
          </label>
          <select
            id="resolve-classification"
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#8C8F97] hover:bg-[#F8F8F8] rounded-md p-2.5 text-sm text-[#292A2E] focus:border-[#4688EC] focus:ring-2 focus:ring-[#4688EC]/30 outline-none cursor-pointer"
          >
            {DOWNTIME_CLASSIFICATIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-[#505258] mt-1">
            Links directly to ISO 22400-2 downtime Pareto analytics
          </p>
        </div>

        {/* Corrective Action Notes */}
        <div>
          <label htmlFor="resolve-notes" className="block text-xs font-semibold text-[#505258] mb-1.5">
            Corrective action taken
          </label>
          <textarea
            id="resolve-notes"
            rows={3}
            required
            value={correctiveAction}
            onChange={(e) => setCorrectiveAction(e.target.value)}
            placeholder="e.g. Replaced faulty thermocouple on Zone 4, verified PID loop reached 235°C setpoint, and cleared controller alarm..."
            className="w-full bg-[#FFFFFF] border border-[#8C8F97] hover:bg-[#F8F8F8] rounded-md p-2.5 text-xs text-[#292A2E] placeholder-[#6B6E76] focus:border-[#4688EC] focus:ring-2 focus:ring-[#4688EC]/30 outline-none"
          />
        </div>

        {error && (
          <div className="p-3 rounded-md bg-[#FFECEB] border border-[#E2483D] text-[#292A2E] text-xs">
            {error}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0B120E24]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md text-xs font-medium text-[#292A2E] hover:bg-[#091E420F] border border-[#0B120E24] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md text-xs font-semibold bg-[#5B7F24] hover:bg-[#4C6B1F] text-white shadow-xs transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isSubmitting ? 'Resolving...' : 'Confirm & resolve ticket'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
