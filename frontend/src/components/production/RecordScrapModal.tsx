import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal.js';
import type { ProductionRun } from '../../types/production.js';

interface RecordScrapModalProps {
  isOpen: boolean;
  onClose: () => void;
  run: ProductionRun | null;
  onSubmit: (runId: string, dto: { quantity: number; defectCode: string; notes?: string }) => Promise<void>;
}

const DEFECT_CODES = [
  { code: 'FLASH', label: 'Flash / parting line burrs', category: 'Clamping / pressure' },
  { code: 'SHORT_SHOT', label: 'Short shot / incomplete fill', category: 'Injection / cushion' },
  { code: 'WARPAGE', label: 'Warpage / shrinkage distortion', category: 'Cooling / mold temp' },
  { code: 'SINK_MARK', label: 'Sink mark on thick ribs', category: 'Holding pressure' },
  { code: 'CONTAMINATION', label: 'Black specks / resin contamination', category: 'Material / barrel' },
  { code: 'BURN_MARK', label: 'Burn mark / trapped air dieseling', category: 'Venting / speed' },
  { code: 'DIMENSIONAL_OUT_OF_SPEC', label: 'Dimensional out-of-spec', category: 'Quality / tooling' },
];

export const RecordScrapModal: React.FC<RecordScrapModalProps> = ({
  isOpen,
  onClose,
  run,
  onSubmit,
}) => {
  const [defectCode, setDefectCode] = useState<string>('FLASH');
  const [quantity, setQuantity] = useState<number>(4);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!run) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Scrap quantity must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(run.id, {
        quantity: Number(quantity),
        defectCode,
        notes: notes.trim() || undefined,
      });
      setNotes('');
      setQuantity(4);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record scrap');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log defect scrap — ${run.productionOrder?.orderNumber ?? 'Active run'}`}
      maxWidth="md"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {/* Run Details */}
        <div className="bg-[#F8F8F8] rounded-md p-3 border border-[#0B120E14] text-xs flex items-center justify-between text-[#292A2E]">
          <div>
            <span className="text-[#505258]">Machine: </span>
            <span className="font-bold text-[#292A2E]">{run.machine?.code ?? run.machineId}</span>
            <span className="text-[#505258] ml-2">Part: </span>
            <span className="font-mono text-[#292A2E]">{run.productionOrder?.product?.partNumber ?? 'PART-01'}</span>
          </div>
          <span className="font-mono text-[#505258]">Cavities: {run.mold?.cavityCount ?? 4}</span>
        </div>

        {/* Defect Code Selector */}
        <div>
          <label htmlFor="scrap-defect-code" className="block text-xs font-semibold text-[#505258] mb-1.5">
            Defect classification
          </label>
          <select
            id="scrap-defect-code"
            value={defectCode}
            onChange={(e) => setDefectCode(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#8C8F97] hover:bg-[#F8F8F8] rounded-md p-2.5 text-sm text-[#292A2E] focus:border-[#4688EC] focus:ring-2 focus:ring-[#4688EC]/30 outline-none cursor-pointer"
          >
            {DEFECT_CODES.map((d) => (
              <option key={d.code} value={d.code}>
                {d.label} ({d.category})
              </option>
            ))}
          </select>
        </div>

        {/* Scrap Quantity */}
        <div>
          <label htmlFor="scrap-quantity" className="block text-xs font-semibold text-[#505258] mb-1.5">
            Scrap quantity (pieces)
          </label>
          <input
            id="scrap-quantity"
            type="number"
            min={1}
            max={10000}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full bg-[#FFFFFF] border border-[#8C8F97] hover:bg-[#F8F8F8] rounded-md p-2.5 text-sm font-mono text-[#292A2E] focus:border-[#4688EC] focus:ring-2 focus:ring-[#4688EC]/30 outline-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="scrap-notes" className="block text-xs font-semibold text-[#505258] mb-1.5">
            Inspection notes (optional)
          </label>
          <textarea
            id="scrap-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Excessive burrs observed on Cavity #3 during first-off sampling..."
            className="w-full bg-[#FFFFFF] border border-[#8C8F97] hover:bg-[#F8F8F8] rounded-md p-2.5 text-xs text-[#292A2E] placeholder-[#6B6E76] focus:border-[#4688EC] focus:ring-2 focus:ring-[#4688EC]/30 outline-none"
          />
        </div>

        {error && (
          <div className="p-3 rounded-md bg-[#FFECEB] border border-[#E2483D] text-[#292A2E] text-xs">
            {error}
          </div>
        )}

        {/* Actions */}
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
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md text-xs font-semibold bg-[#C9372C] hover:bg-[#AE2E24] active:bg-[#872821] text-white shadow-xs transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isSubmitting ? 'Recording...' : 'Record scrap defect'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
