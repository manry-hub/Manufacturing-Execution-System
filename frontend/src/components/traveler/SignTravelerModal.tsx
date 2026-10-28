import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal.js';
import type { SignoffTravelerPayload } from '../../types/traveler.js';

interface SignTravelerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  partNumber: string;
  currentInspectorName?: string;
  onSignoff: (payload: SignoffTravelerPayload) => Promise<void>;
}

export const SignTravelerModal: React.FC<SignTravelerModalProps> = ({
  isOpen,
  onClose,
  orderNumber,
  partNumber,
  currentInspectorName,
  onSignoff,
}) => {
  const [inspectorName, setInspectorName] = useState<string>(
    currentInspectorName || 'Dr. Markus Vance, CQE',
  );
  const [status, setStatus] = useState<'RELEASED' | 'QUARANTINED' | 'CONCESSION'>('RELEASED');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectorName.trim()) {
      setErrorMessage('Inspector name or ID is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSignoff({
        inspectorName: inspectorName.trim(),
        status,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to sign off traveler.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Quality Authority Release — ${orderNumber} (${partNumber})`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-md bg-[#FFECEB] border border-[#FD9891] text-[#AE2E24] text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Disposition Selector */}
        <div>
          <span className="block text-xs font-bold text-[#292A2E] mb-1.5">
            Release Disposition Decision <span className="text-[#C9372C]">*</span>
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStatus('RELEASED')}
              className={`py-2 px-3 rounded-md border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                status === 'RELEASED'
                  ? 'bg-[#E3FCEF] border-[#36B37E] text-[#006644] ring-2 ring-[#36B37E]/30'
                  : 'bg-[#FFFFFF] border-[#DCDFE4] text-[#505258] hover:bg-[#F8F8F8]'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 text-[#00875A]" />
              <span>RELEASED</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus('QUARANTINED')}
              className={`py-2 px-3 rounded-md border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                status === 'QUARANTINED'
                  ? 'bg-[#FFECEB] border-[#E2483D] text-[#AE2E24] ring-2 ring-[#E2483D]/30'
                  : 'bg-[#FFFFFF] border-[#DCDFE4] text-[#505258] hover:bg-[#F8F8F8]'
              }`}
            >
              <AlertTriangle className="h-4 w-4 text-[#C9372C]" />
              <span>QUARANTINE</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus('CONCESSION')}
              className={`py-2 px-3 rounded-md border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                status === 'CONCESSION'
                  ? 'bg-[#FFF5DB] border-[#E06C00] text-[#693200] ring-2 ring-[#E06C00]/30'
                  : 'bg-[#FFFFFF] border-[#DCDFE4] text-[#505258] hover:bg-[#F8F8F8]'
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-[#E06C00]" />
              <span>CONCESSION</span>
            </button>
          </div>
        </div>

        {/* Inspector Name */}
        <div>
          <label htmlFor="inspector-name-input" className="block text-xs font-bold text-[#292A2E] mb-1">
            Authorized QA Officer Name / Title <span className="text-[#C9372C]">*</span>
          </label>
          <input
            id="inspector-name-input"
            type="text"
            required
            value={inspectorName}
            onChange={(e) => setInspectorName(e.target.value)}
            placeholder="e.g. Dr. Markus Vance, CQE"
            className="w-full text-xs rounded-md border border-[#8C8F97] bg-[#FFFFFF] px-3 py-2 text-[#292A2E] focus:border-[#4688EC] focus:ring-2 focus:ring-[#4688EC]/20 outline-none"
          />
        </div>

        {/* Audit Notes */}
        <div>
          <label htmlFor="audit-notes-input" className="block text-xs font-bold text-[#292A2E] mb-1">
            Inspection Findings & Conformance Notes
          </label>
          <textarea
            id="audit-notes-input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record any critical tolerance notes, customer waiver numbers, or quarantine containment details..."
            className="w-full text-xs rounded-md border border-[#8C8F97] bg-[#FFFFFF] px-3 py-2 text-[#292A2E] focus:border-[#4688EC] focus:ring-2 focus:ring-[#4688EC]/20 outline-none resize-none"
          />
        </div>

        {/* Tamper Proof Cryptographic Notice */}
        <div className="p-3 rounded-md bg-[#F4F5F7] border border-[#0B120E14] text-xs text-[#505258] space-y-1">
          <p className="font-semibold text-[#292A2E]">Cryptographic Audit Notice:</p>
          <p>
            Submitting this release decision computes an immutable SHA-256 digital digest over the batch parameters (good parts, scrap, resin lots, and dimensions) in conformance with 21 CFR Part 11 / IATF 16949 standards.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#0B120E14]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] border border-[#0B120E24] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold bg-[#1868DB] hover:bg-[#1558BC] text-white shadow-xs transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Generating Digital Seal...</span>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Execute Release & Seal</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
