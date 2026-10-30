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

  const categories: Array<{ id: AndonCategory; label: string; icon: React.ReactNode }> = [
    {
      id: 'MACHINE_FAULT',
      label: 'Machine breakdown',
      icon: <Wrench className="h-4 w-4" />,
    },
    {
      id: 'QUALITY_ISSUE',
      label: 'Quality defect',
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    {
      id: 'MATERIAL_SHORTAGE',
      label: 'Material starvation',
      icon: <Package className="h-4 w-4" />,
    },
    {
      id: 'SAFETY',
      label: 'Safety hazard',
      icon: <ShieldAlert className="h-4 w-4" />,
    },
    {
      id: 'PROCESS_DEVIATION',
      label: 'Process deviation',
      icon: <Sliders className="h-4 w-4" />,
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
      title={`Dispatch andon help — ${machine.code}`}
      maxWidth="lg"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {/* Machine banner well */}
        <div className="bg-[#F8F8F8] rounded-md p-3 border border-[#0B120E14] flex items-center justify-between text-xs text-[#292A2E]">
          <div>
            <span className="text-[#505258]">Machine: </span>
            <span className="font-bold text-[#292A2E]">{machine.code}</span>
            <span className="text-[#505258] ml-2">({machine.name})</span>
          </div>
          <span className="text-[#505258] font-mono">{machine.tonnage} Ton</span>
        </div>

        {/* Category Selection */}
        <div>
          <span className="block text-xs font-semibold text-[#505258] mb-2">
            Select issue category
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-md border text-xs font-medium transition-colors text-left ${
                    isSelected
                      ? 'bg-[#E9F2FE] border-[#1868DB] text-[#123263] shadow-xs'
                      : 'border-[#0B120E24] bg-[#FFFFFF] text-[#505258] hover:bg-[#F8F8F8] hover:text-[#292A2E]'
                  }`}
                >
                  <span className={isSelected ? 'text-[#1868DB]' : 'text-[#6B6E76]'}>
                    {cat.icon}
                  </span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description Input */}
        <div>
          <label htmlFor="andon-desc" className="block text-xs font-semibold text-[#505258] mb-1.5">
            Problem description
          </label>
          <textarea
            id="andon-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Mold nozzle freeze-up, hydraulic pressure leak, or high flash detected..."
            className="w-full bg-[#FFFFFF] border border-[#8C8F97] hover:bg-[#F8F8F8] rounded-md p-3 text-sm text-[#292A2E] placeholder-[#6B6E76] focus:border-[#4688EC] focus:ring-2 focus:ring-[#4688EC]/30 outline-none"
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
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md text-xs font-semibold bg-[#C9372C] hover:bg-[#AE2E24] active:bg-[#872821] text-white shadow-xs transition-colors disabled:opacity-50"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>{isSubmitting ? 'Dispatching...' : 'Dispatch andon alert'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
