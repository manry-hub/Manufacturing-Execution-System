import React, { useState } from 'react';
import {
  PlaySquare,
  PlusCircle,
  CheckCircle,
  Pause,
  Trash2,
  Layers,
  ArrowRight,
  Clock,
} from 'lucide-react';
import type { ProductionOrder, ProductionRun } from '../../types/production.js';
import { StatusBadge } from '../common/StatusBadge.js';
import { RecordScrapModal } from './RecordScrapModal.js';
import { CreateOrderModal } from './CreateOrderModal.js';
import { useAuth } from '../../context/AuthContext.js';

interface ProductionOrdersViewProps {
  orders: ProductionOrder[];
  runs: ProductionRun[];
  onCreateOrder: (dto: {
    orderNumber: string;
    productId: string;
    targetQuantity: number;
    plannedStartTime: string;
  }) => Promise<void>;
  onReleaseOrder: (id: string) => Promise<void>;
  onPauseRun: (id: string) => Promise<void>;
  onCompleteRun: (id: string) => Promise<void>;
  onRecordScrap: (runId: string, dto: { quantity: number; defectCode: string; notes?: string }) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const ProductionOrdersView: React.FC<ProductionOrdersViewProps> = ({
  orders,
  runs,
  onCreateOrder,
  onReleaseOrder,
  onPauseRun,
  onCompleteRun,
  onRecordScrap,
}) => {
  const { role } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'runs' | 'orders'>('runs');
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedRunForScrap, setSelectedRunForScrap] = useState<ProductionRun | null>(null);

  const canRelease =
    role === 'production_supervisor' ||
    role === 'planner' ||
    role === 'admin' ||
    role === 'plant_manager';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <PlaySquare className="h-6 w-6 text-[#1868DB]" />
            <h2 className="text-xl font-bold text-[#292A2E] tracking-tight">
              Production execution & run management
            </h2>
          </div>
          <p className="text-xs text-[#505258] mt-1">
            Order lifecycle execution (Draft → Released → In progress → Completed) and shop floor scrap logging
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sub-tab Switcher */}
          <div className="bg-[#F1F2F4] p-1 rounded-md border border-[#0B120E24] flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveSubTab('runs')}
              className={`px-3.5 py-1.5 rounded-sm text-xs font-semibold transition-all ${
                activeSubTab === 'runs'
                  ? 'bg-[#FFFFFF] text-[#1868DB] shadow-xs'
                  : 'text-[#505258] hover:text-[#292A2E]'
              }`}
            >
              Active machine runs ({runs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('orders')}
              className={`px-3.5 py-1.5 rounded-sm text-xs font-semibold transition-all ${
                activeSubTab === 'orders'
                  ? 'bg-[#FFFFFF] text-[#1868DB] shadow-xs'
                  : 'text-[#505258] hover:text-[#292A2E]'
              }`}
            >
              Production orders ({orders.length})
            </button>
          </div>

          {/* Create Order Button */}
          {canRelease && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-[#1868DB] hover:bg-[#1558BC] active:bg-[#144794] text-white shadow-xs transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create order</span>
            </button>
          )}
        </div>
      </div>

      {/* View 1: Active Production Runs */}
      {activeSubTab === 'runs' && (
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#0B120E24] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#292A2E] flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#1868DB]" />
              <span>Shop floor machine dispatch & runs</span>
            </h3>
            <span className="text-xs text-[#505258] font-mono">
              {runs.filter((r) => r.status === 'ACTIVE').length} active executions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFFFFF] text-[#505258] font-bold border-b-2 border-[#0B120E24]">
                <tr>
                  <th className="py-3 px-4">Machine</th>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Part & mold</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Progress / output</th>
                  <th className="py-3 px-4">Scrap rate</th>
                  <th className="py-3 px-4 text-right">Run actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0B120E24]">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#6B6E76]">
                      No active production runs found. Start a run from an approved order.
                    </td>
                  </tr>
                ) : (
                  runs.map((run) => {
                    const targetQty = run.productionOrder?.targetQuantity ?? 1000;
                    const progress = Math.min(Math.round((run.goodQuantity / targetQty) * 100), 100);
                    const totalParts = run.goodQuantity + run.rejectQuantity;
                    const scrapPct = totalParts > 0 ? ((run.rejectQuantity / totalParts) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={run.id} className="hover:bg-[#F8F8F8] transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-[#292A2E] block text-sm">
                            {run.machine?.code ?? run.machineId}
                          </span>
                          <span className="text-[11px] text-[#505258]">{run.machine?.name}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-[#292A2E]">
                          {run.productionOrder?.orderNumber ?? 'PO-ACTIVE'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[#292A2E] block">
                            {run.productionOrder?.product?.partNumber ?? 'PART-01'}
                          </span>
                          <span className="text-[11px] text-[#505258]">
                            {run.mold?.code ?? 'MLD-01'} ({run.mold?.cavityCount ?? 4} cavities)
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={run.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 min-w-[180px]" aria-label="Production progress">
                          <div className="flex justify-between text-[11px] text-[#292A2E] mb-1 font-mono">
                            <span>{run.goodQuantity.toLocaleString()} pcs</span>
                            <span className="text-[#505258]">/ {targetQty.toLocaleString()} ({progress}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#091E4214] rounded-full overflow-hidden border border-[#0B120E24]">
                            <div
                              className="h-full bg-[#1868DB] rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className={Number(scrapPct) > 3.0 ? 'text-[#AE2E24] font-bold' : 'text-[#292A2E]'}>
                            {scrapPct}%
                          </span>
                          <span className="text-[10px] text-[#6B6E76] block">({run.rejectQuantity} rej)</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Report Scrap button */}
                            <button
                              type="button"
                              onClick={() => setSelectedRunForScrap(run)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#AE2E24] hover:bg-[#FFECEB] active:bg-[#FFD5D2] border border-[#FD9891] transition-colors"
                              title="Report scrap defect on this run"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Scrap</span>
                            </button>

                            {/* Pause / Resume */}
                            {run.status === 'ACTIVE' && (
                              <button
                                type="button"
                                onClick={() => void onPauseRun(run.id)}
                                aria-label="Pause run"
                                className="p-1.5 rounded-md bg-[#FFF5DB] text-[#693200] hover:bg-[#FCE4A6] border border-[#E06C00] transition-colors"
                                title="Pause run"
                              >
                                <Pause className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Complete Run */}
                            {run.status === 'ACTIVE' && (
                              <button
                                type="button"
                                onClick={() => void onCompleteRun(run.id)}
                                aria-label="Complete and reconcile run"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-[#5B7F24] hover:bg-[#4C6B1F] text-white transition-colors"
                                title="Complete and reconcile run"
                              >
                                <CheckCircle className="h-3 w-3" />
                                <span>Close</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: Production Orders List */}
      {activeSubTab === 'orders' && (
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#0B120E24] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#292A2E] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#1868DB]" />
              <span>Production orders schedule & status</span>
            </h3>
            <span className="text-xs text-[#505258] font-mono">
              {orders.length} total registered orders
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFFFFF] text-[#505258] font-bold border-b-2 border-[#0B120E24]">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Product part</th>
                  <th className="py-3 px-4">Target qty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Planned schedule</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0B120E24]">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#F8F8F8] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#292A2E] text-sm">
                      {ord.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[#292A2E] block">
                        {ord.product?.partNumber ?? ord.productId}
                      </span>
                      <span className="text-[11px] text-[#505258]">{ord.product?.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#292A2E] font-semibold">
                      {ord.targetQuantity.toLocaleString()} pcs
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={ord.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-[#505258] font-mono text-[11px]">
                      {new Date(ord.plannedStartTime).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {ord.status === 'DRAFT' && canRelease && (
                        <button
                          type="button"
                          onClick={() => void onReleaseOrder(ord.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1868DB] hover:bg-[#1558BC] text-white transition-colors"
                        >
                          <span>Release</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scrap Defect Modal */}
      <RecordScrapModal
        isOpen={Boolean(selectedRunForScrap)}
        onClose={() => setSelectedRunForScrap(null)}
        run={selectedRunForScrap}
        onSubmit={onRecordScrap}
      />

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={onCreateOrder}
      />
    </div>
  );
};
