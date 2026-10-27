import React, { useState } from 'react';
import { AlertTriangle, Wrench, ShieldAlert, Package, Sliders } from 'lucide-react';
import { Modal } from '../common/Modal.js';
import type { Machine } from '../../types/machine.js';
import type { AndonCategory } from '../../types/andon.js';

interface CreateAndonModalProps {
  isOpen: boolean;
  onClose: () => void;
  machine: Machine | null;
  onSubmit: (dto: {
    machineId: string;
    category: AndonCategory;
    description: string;
    priority?: string;
  }) => Promise<void>;
}

export const CreateAndonModal: React.FC<CreateAndonModalProps> = ({
  isOpen,
  onClose,
  machine,
  onSubmit,
}) => {
  const [category, setCategory] = useState<AndonCategory>('MACHINE_FAULT');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!machine) return null;

  const categories: Array<{ id: AndonCategory; label: string; icon: React.ReactNode; color: string }> = [
    {
      id: 'MACHINE_FAULT',
      label: 'Machine Breakdown',
      icon: <Wrench className="h-4 w-4" />,
      color: 'border-rose-500/50 bg-rose-500/10 text-rose-300',
    },
    {
      id: 'QUALITY_ISSUE',
      label: 'Quality Defect',
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
    },
    {
      id: 'MATERIAL_SHORTAGE',
      label: 'Material Starvation',
      icon: <Package className="h-4 w-4" />,
      color: 'border-blue-500/50 bg-blue-500/10 text-blue-300',
    },
    {
      id: 'SAFETY',
      label: 'Safety Hazard',
      icon: <ShieldAlert className="h-4 w-4" />,
      color: 'border-red-500/50 bg-red-500/10 text-red-300',
    },
    {
      id: 'PROCESS_DEVIATION',
      label: 'Process Deviation',
      icon: <Sliders className="h-4 w-4" />,
      color: 'border-purple-500/50 bg-purple-500/10 text-purple-300',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a brief problem description.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        machineId: machine.id,
        category,
        description,
        priority: category === 'SAFETY' || category === 'MACHINE_FAULT' ? 'CRITICAL' : 'HIGH',
      });
      setDescription('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dispatch Andon Help — ${machine.code}`}
      maxWidth="lg"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {/* Machine banner */}
        <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Machine: </span>
            <span className="font-bold text-slate-100">{machine.code}</span>
            <span className="text-slate-400 ml-2">({machine.name})</span>
          </div>
          <span className="text-slate-400 font-mono">{machine.tonnage} Ton</span>
        </div>

        {/* Category Selection */}
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Select Issue Category
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                    isSelected
                      ? `${cat.color} ring-2 ring-blue-500/50 shadow-md`
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description Input */}
        <div>
          <label htmlFor="andon-desc" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Problem Description
          </label>
          <textarea
            id="andon-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Mold nozzle freeze-up, hydraulic pressure leak, or high flash detected..."
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition-colors disabled:opacity-50"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>{isSubmitting ? 'Dispatching...' : 'Dispatch Andon Alert'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
