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
  { code: 'FLASH', label: 'Flash / Parting Line Burrs', category: 'Clamping / Pressure' },
  { code: 'SHORT_SHOT', label: 'Short Shot / Incomplete Fill', category: 'Injection / Cushion' },
  { code: 'WARPAGE', label: 'Warpage / Shrinkage Distortion', category: 'Cooling / Mold Temp' },
  { code: 'SINK_MARK', label: 'Sink Mark on Thick Ribs', category: 'Holding Pressure' },
  { code: 'CONTAMINATION', label: 'Black Specks / Resin Contamination', category: 'Material / Barrel' },
  { code: 'BURN_MARK', label: 'Burn Mark / Trapped Air Dieseling', category: 'Venting / Speed' },
  { code: 'DIMENSIONAL_OUT_OF_SPEC', label: 'Dimensional Out-of-Spec', category: 'Quality / Tooling' },
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
      title={`Log Defect Scrap — ${run.productionOrder?.orderNumber ?? 'Active Run'}`}
      maxWidth="md"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {/* Run Details */}
        <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-xs flex items-center justify-between">
          <div>
            <span className="text-slate-400">Machine: </span>
            <span className="font-bold text-slate-200">{run.machine?.code ?? run.machineId}</span>
            <span className="text-slate-400 ml-2">Part: </span>
            <span className="font-mono text-slate-200">{run.productionOrder?.product?.partNumber ?? 'PART-01'}</span>
          </div>
          <span className="font-mono text-slate-400">Cavities: {run.mold?.cavityCount ?? 4}</span>
        </div>

        {/* Defect Code Selector */}
        <div>
          <label htmlFor="scrap-defect-code" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Defect Classification
          </label>
          <select
            id="scrap-defect-code"
            value={defectCode}
            onChange={(e) => setDefectCode(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {DEFECT_CODES.map((d) => (
              <option key={d.code} value={d.code} className="bg-slate-900 text-slate-100">
                {d.label} ({d.category})
              </option>
            ))}
          </select>
        </div>

        {/* Scrap Quantity */}
        <div>
          <label htmlFor="scrap-quantity" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Scrap Quantity (Pieces)
          </label>
          <input
            id="scrap-quantity"
            type="number"
            min={1}
            max={10000}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="scrap-notes" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Inspection Notes (Optional)
          </label>
          <textarea
            id="scrap-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Excessive burrs observed on Cavity #3 during first-off sampling..."
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Actions */}
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
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isSubmitting ? 'Recording...' : 'Record Scrap Defect'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
