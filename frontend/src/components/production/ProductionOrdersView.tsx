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
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <PlaySquare className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              Production Execution & Run Management
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Order lifecycle execution (DRAFT → RELEASED → IN_PROGRESS → COMPLETED) and shop floor scrap logging
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sub-tab Switcher */}
          <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveSubTab('runs')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'runs'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active Machine Runs ({runs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('orders')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Production Orders ({orders.length})
            </button>
          </div>

          {/* Create Order Button */}
          {canRelease && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Order</span>
            </button>
          )}
        </div>
      </div>

      {/* View 1: Active Production Runs */}
      {activeSubTab === 'runs' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-400" />
              <span>Shop Floor Machine Dispatch & Runs</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {runs.filter((r) => r.status === 'ACTIVE').length} Active Executions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Machine</th>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Part & Mold</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Progress / Output</th>
                  <th className="py-3 px-4">Scrap Rate</th>
                  <th className="py-3 px-4 text-right">Run Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
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
                      <tr key={run.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-100 block text-sm">
                            {run.machine?.code ?? run.machineId}
                          </span>
                          <span className="text-[11px] text-slate-400">{run.machine?.name}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                          {run.productionOrder?.orderNumber ?? 'PO-ACTIVE'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-slate-200 block">
                            {run.productionOrder?.product?.partNumber ?? 'PART-01'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {run.mold?.code ?? 'MLD-01'} ({run.mold?.cavityCount ?? 4} Cavities)
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={run.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 min-w-[180px]" aria-label="Production progress">
                          <div className="flex justify-between text-[11px] text-slate-300 mb-1 font-mono">
                            <span>{run.goodQuantity.toLocaleString()} pcs</span>
                            <span className="text-slate-400">/ {targetQty.toLocaleString()} ({progress}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className={Number(scrapPct) > 3.0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {scrapPct}%
                          </span>
                          <span className="text-[10px] text-slate-500 block">({run.rejectQuantity} rej)</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Report Scrap button */}
                            <button
                              type="button"
                              onClick={() => setSelectedRunForScrap(run)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                              title="Report Scrap Defect on this Run"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Scrap</span>
                            </button>

                            {/* Pause / Resume */}
                            {run.status === 'ACTIVE' && (
                              <button
                                type="button"
                                onClick={() => void onPauseRun(run.id)}
                                aria-label="Pause Run"
                                className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-colors"
                                title="Pause Run"
                              >
                                <Pause className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Complete Run */}
                            {run.status === 'ACTIVE' && (
                              <button
                                type="button"
                                onClick={() => void onCompleteRun(run.id)}
                                aria-label="Complete and Reconcile Run"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                                title="Complete and Reconcile Run"
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
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span>Production Orders Schedule & Status</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {orders.length} Total Registered Orders
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Product Part</th>
                  <th className="py-3 px-4">Target Qty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Planned Schedule</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100 text-sm">
                      {ord.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-slate-200 block">
                        {ord.product?.partNumber ?? ord.productId}
                      </span>
                      <span className="text-[11px] text-slate-400">{ord.product?.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-200 font-semibold">
                      {ord.targetQuantity.toLocaleString()} pcs
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={ord.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(ord.plannedStartTime).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {ord.status === 'DRAFT' && canRelease && (
                        <button
                          type="button"
                          onClick={() => void onReleaseOrder(ord.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
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
