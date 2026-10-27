import React, { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { Modal } from '../common/Modal.js';
import type { Product } from '../../types/production.js';
import { api } from '../../services/api.js';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: {
    orderNumber: string;
    productId: string;
    targetQuantity: number;
    plannedStartTime: string;
  }) => Promise<void>;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [targetQuantity, setTargetQuantity] = useState<number>(2000);
  const [plannedStartTime, setPlannedStartTime] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setPlannedStartTime(now.toISOString().slice(0, 16));

      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setOrderNumber(`PO-2026-${randomSuffix}`);

      void api.getProducts().then((data) => {
        setProducts(data);
        if (data.length > 0 && !productId) {
          setProductId(data[0].id);
        }
      });
    }
  }, [isOpen, productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) {
      setError('Please provide an order number.');
      return;
    }
    if (!productId) {
      setError('Please select a product.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        orderNumber: orderNumber.trim(),
        productId,
        targetQuantity: Number(targetQuantity),
        plannedStartTime: new Date(plannedStartTime).toISOString(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create production order"
      maxWidth="md"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {/* Order Number */}
        <div>
          <label htmlFor="order-number" className="block text-xs font-semibold text-[#505258] mb-1.5">
            Production order number
          </label>
          <input
            id="order-number"
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#8C8F97] hover:bg-[#F8F8F8] rounded-md p-2.5 text-sm font-mono text-[#292A2E] focus:border-[#4688EC] focus:ring-2 focus:ring-[#4688EC]/30 outline-none"
          />
        </div>

        {/* Product Selector */}
        <div>
          <label htmlFor="order-product" className="block text-xs font-semibold text-[#505258] mb-1.5">
            Product & part number
          </label>
          <select
            id="order-product"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#8C8F97] hover:bg-[#F8F8F8] rounded-md p-2.5 text-sm text-[#292A2E] focus:border-[#4688EC] focus:ring-2 focus:ring-[#4688EC]/30 outline-none cursor-pointer"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.partNumber} — {p.name} ({p.nominalCycleTimeSeconds}s nominal)
              </option>
            ))}
          </select>
        </div>

        {/* Target Quantity */}
        <div>
          <label htmlFor="order-qty" className="block text-xs font-semibold text-[#505258] mb-1.5">
            Target quantity (units)
          </label>
          <input
            id="order-qty"
            type="number"
            min={100}
            max={100000}
            step={100}
            value={targetQuantity}
            onChange={(e) => setTargetQuantity(Math.max(1, parseInt(e.target.value, 10) || 100))}
            className="w-full bg-[#FFFFFF] border border-[#8C8F97] hover:bg-[#F8F8F8] rounded-md p-2.5 text-sm font-mono text-[#292A2E] focus:border-[#4688EC] focus:ring-2 focus:ring-[#4688EC]/30 outline-none"
          />
        </div>

        {/* Planned Start Time */}
        <div>
          <label htmlFor="order-time" className="block text-xs font-semibold text-[#505258] mb-1.5">
            Planned start schedule
          </label>
          <input
            id="order-time"
            type="datetime-local"
            required
            value={plannedStartTime}
            onChange={(e) => setPlannedStartTime(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#8C8F97] hover:bg-[#F8F8F8] rounded-md p-2.5 text-sm font-mono text-[#292A2E] focus:border-[#4688EC] focus:ring-2 focus:ring-[#4688EC]/30 outline-none"
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
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md text-xs font-semibold bg-[#1868DB] hover:bg-[#1558BC] active:bg-[#144794] text-white shadow-xs transition-colors disabled:opacity-50"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{isSubmitting ? 'Creating...' : 'Create order'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
