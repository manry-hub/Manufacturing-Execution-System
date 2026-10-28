import React, { useState, useEffect, useCallback } from 'react';
import {
  PackageCheck,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useTelemetrySocket } from '../../hooks/useTelemetrySocket.js';
import type { PackagingUnit, RunReconciliation } from '../../types/packaging.js';
import type { ProductionRun } from '../../types/production.js';

interface PackagingViewProps {
  runs: ProductionRun[];
}

export const PackagingView: React.FC<PackagingViewProps> = ({ runs }) => {
  const [selectedRunId, setSelectedRunId] = useState<string>(runs[0]?.id ?? '');
  const [reconciliation, setReconciliation] = useState<RunReconciliation | null>(null);
  const [units, setUnits] = useState<PackagingUnit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pack Carton Form state
  const [partCount, setPartCount] = useState<number>(50);
  const [palletId, setPalletId] = useState<string>('PAL-01');
  const [customBarcode, setCustomBarcode] = useState<string>('');
  const [isPacking, setIsPacking] = useState<boolean>(false);

  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? runs[0];

  const loadPackagingData = useCallback(async () => {
    if (!selectedRunId) return;
    setIsLoading(true);
    setFeedbackMessage(null);
    try {
      const [recData, unitsData] = await Promise.all([
        api.reconcileRunPackaging(selectedRunId),
        api.getPackagingUnits(selectedRunId),
      ]);
      setReconciliation(recData);
      setUnits(unitsData);
    } catch (err) {
      console.error('Failed to load packaging data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRunId]);

  useEffect(() => {
    if (selectedRunId) {
      void loadPackagingData();
    }
  }, [selectedRunId, loadPackagingData]);

  // Sync selected run if runs prop changes
  useEffect(() => {
    if (runs.length > 0 && !selectedRunId) {
      setSelectedRunId(runs[0].id);
    }
  }, [runs, selectedRunId]);

  const handlePackagingUnitCreated = useCallback(
    ({ runId, unit }: { runId: string; unit: PackagingUnit }) => {
      if (runId === selectedRunId) {
        setUnits((prev) => [unit, ...prev.filter((u) => u.id !== unit.id)]);
        void api.reconcileRunPackaging(runId).then(setReconciliation).catch(console.error);
      }
    },
    [selectedRunId],
  );

  const handlePackagingReconciled = useCallback(
    (data: RunReconciliation) => {
      if (data.runId === selectedRunId) {
        setReconciliation(data);
      }
    },
    [selectedRunId],
  );

  const { connected, subscribeModule, unsubscribeModule } = useTelemetrySocket({
    onPackagingUnitCreated: handlePackagingUnitCreated,
    onPackagingReconciled: handlePackagingReconciled,
  });

  useEffect(() => {
    subscribeModule('packaging');
    return () => {
      unsubscribeModule('packaging');
    };
  }, [subscribeModule, unsubscribeModule]);

  const handleCreatePackagingUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRunId || partCount <= 0) return;

    setIsPacking(true);
    setFeedbackMessage(null);
    try {
      const unit = await api.createPackagingUnit({
        runId: selectedRunId,
        partCount: Number(partCount),
        palletId: palletId.trim() || undefined,
        barcode: customBarcode.trim() || undefined,
      });

      setFeedbackMessage({
        type: 'success',
        text: `Carton verified and barcode "${unit.barcode}" registered (${partCount} parts).`,
      });
      setCustomBarcode('');
      await loadPackagingData();
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to register packaging unit.',
      });
    } finally {
      setIsPacking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Landmark */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#0B120E24]">
        <div>
          <h1 className="text-xl font-bold text-[#292A2E] tracking-tight">
            Finished goods packaging & shot-to-pack reconciliation
          </h1>
          <p className="text-sm text-[#505258] mt-0.5">
            Carton serial barcode tracking, pallet aggregation, and automated shot-to-pack variance auditing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              connected
                ? 'bg-[#E3FCEF] text-[#006644] border border-[#ABF5D1]'
                : 'bg-[#F1F2F4] text-[#505258] border border-[#DCDFE4]'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? 'bg-[#00875A] animate-pulse' : 'bg-[#8C8F97]'
              }`}
            />
            {connected ? 'Live Sync' : 'Connecting'}
          </span>
          <button
            type="button"
            onClick={() => void loadPackagingData()}
            className="min-h-[32px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] border border-[#0B120E24] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-4 rounded-md border text-sm flex items-center gap-3 ${
            feedbackMessage.type === 'success'
              ? 'bg-[#EFFFD6] border-[#6A9A23] text-[#37471F]'
              : 'bg-[#FFECEB] border-[#E2483D] text-[#5D1F1A]'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-[#6A9A23] shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-[#C9372C] shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Target Run Selector */}
      <div className="p-4 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="packaging-run-select" className="text-xs font-semibold text-[#505258] uppercase tracking-wider shrink-0">
            Active production run:
          </label>
          <select
            id="packaging-run-select"
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="min-h-[32px] px-3 py-1 text-sm rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-medium"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.machine?.code} — {r.productionOrder?.orderNumber} ({r.productionOrder?.product?.name}) [{r.status}]
              </option>
            ))}
          </select>
        </div>

        {selectedRun && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#505258]">
            <div>
              <span className="text-[#6B6E76]">Machine:</span>{' '}
              <span className="font-semibold text-[#292A2E]">{selectedRun.machine?.name ?? selectedRun.machineId}</span>
            </div>
            <div>
              <span className="text-[#6B6E76]">Product:</span>{' '}
              <span className="font-semibold text-[#292A2E]">{selectedRun.productionOrder?.product?.name ?? '—'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Section 1: Reconciliation Scorecards */}
      {reconciliation && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* KPI 1: Target Quantity */}
            <div className="p-4 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-1">
              <span className="text-xs font-semibold text-[#6B6E76] uppercase tracking-wider">Target order</span>
              <p className="text-2xl font-bold text-[#292A2E]">{reconciliation.targetQuantity.toLocaleString()}</p>
              <p className="text-xs text-[#505258]">Ordered parts</p>
            </div>

            {/* KPI 2: Produced Good Parts */}
            <div className="p-4 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-1">
              <span className="text-xs font-semibold text-[#6B6E76] uppercase tracking-wider">Molding output</span>
              <p className="text-2xl font-bold text-[#216E4E]">{reconciliation.producedGoodQuantity.toLocaleString()}</p>
              <p className="text-xs text-[#505258]">Good parts from mold</p>
            </div>

            {/* KPI 3: Packed Cartons Count */}
            <div className="p-4 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-1">
              <span className="text-xs font-semibold text-[#6B6E76] uppercase tracking-wider">Packed into cartons</span>
              <p className="text-2xl font-bold text-[#1868DB]">{reconciliation.packedQuantity.toLocaleString()}</p>
              <p className="text-xs text-[#505258]">{reconciliation.packagingUnitsCount} cartons verified</p>
            </div>

            {/* KPI 4: Unpacked Variance */}
            <div
              className={`p-4 rounded-lg border shadow-xs space-y-1 ${
                reconciliation.varianceUnpacked === 0 && reconciliation.producedGoodQuantity > 0
                  ? 'bg-[#EFFFD6] border-[#6A9A23]'
                  : 'bg-[#FFF5DB] border-[#E06C00]'
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-[#693200]">Unpacked variance</span>
              <p className="text-2xl font-bold text-[#292A2E]">{reconciliation.varianceUnpacked.toLocaleString()}</p>
              <p className="text-xs text-[#505258]">
                {reconciliation.varianceUnpacked === 0
                  ? '100% matched to packaging'
                  : 'Pending packing & barcode scan'}
              </p>
            </div>
          </div>

          {/* Variance Status Banner */}
          <div
            className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              reconciliation.varianceUnpacked === 0 && reconciliation.producedGoodQuantity > 0
                ? 'bg-[#EFFFD6] border-[#6A9A23] text-[#37471F]'
                : 'bg-[#E9F2FE] border-[#357DE8] text-[#123263]'
            }`}
          >
            <div className="flex items-center gap-3">
              {reconciliation.varianceUnpacked === 0 && reconciliation.producedGoodQuantity > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-[#6A9A23] shrink-0" />
              ) : (
                <TrendingUp className="h-5 w-5 text-[#1868DB] shrink-0" />
              )}
              <div>
                <p className="text-sm font-bold">
                  {reconciliation.varianceUnpacked === 0 && reconciliation.producedGoodQuantity > 0
                    ? 'Shot-to-pack reconciled (Zero unboxed variance)'
                    : `Packaging in progress — ${reconciliation.varianceUnpacked} parts waiting to be packed`}
                </p>
                <p className="text-xs opacity-80 mt-0.5">
                  Order fulfillment completion: {reconciliation.completionPercentage}% ({reconciliation.packedQuantity} of {reconciliation.targetQuantity} parts packed)
                </p>
              </div>
            </div>

            <div className="w-48 bg-[#FFFFFF] rounded-full h-2 overflow-hidden border border-[#0B120E24]">
              <div
                className="h-full bg-[#1868DB] rounded-full transition-all"
                style={{ width: `${Math.min(100, reconciliation.completionPercentage)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Pack Carton Form & Verified Barcodes Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pack Carton Form */}
        <div className="p-5 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#0B120E24]">
            <PackageCheck className="h-4 w-4 text-[#1868DB]" />
            <h2 className="text-sm font-bold text-[#292A2E]">Scan / Pack carton</h2>
          </div>

          <form onSubmit={handleCreatePackagingUnit} className="space-y-4">
            <div>
              <label htmlFor="pack-part-count-input" className="block text-xs font-semibold text-[#505258] mb-1">Parts per carton (pcs)</label>
              <input
                id="pack-part-count-input"
                type="number"
                min="1"
                value={partCount}
                onChange={(e) => setPartCount(parseInt(e.target.value) || 0)}
                className="w-full min-h-[32px] px-3 py-1.5 text-xs rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-medium"
                required
              />
            </div>

            <div>
              <label htmlFor="pack-pallet-id-input" className="block text-xs font-semibold text-[#505258] mb-1">Pallet identifier</label>
              <input
                id="pack-pallet-id-input"
                type="text"
                value={palletId}
                onChange={(e) => setPalletId(e.target.value)}
                placeholder="e.g. PAL-01"
                className="w-full min-h-[32px] px-3 py-1.5 text-xs rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-medium"
              />
            </div>

            <div>
              <label htmlFor="pack-custom-barcode-input" className="block text-xs font-semibold text-[#505258] mb-1">
                Carton barcode (Optional — auto-generated if blank)
              </label>
              <input
                id="pack-custom-barcode-input"
                type="text"
                value={customBarcode}
                onChange={(e) => setCustomBarcode(e.target.value)}
                placeholder="Scan handheld barcode or leave empty"
                className="w-full min-h-[32px] px-3 py-1.5 text-xs rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isPacking || !selectedRunId}
              className="w-full min-h-[36px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-[#1868DB] hover:bg-[#1558BC] text-white shadow-xs transition-colors disabled:opacity-50"
            >
              <QrCode className="h-4 w-4" />
              <span>{isPacking ? 'Registering carton...' : 'Register packed carton'}</span>
            </button>
          </form>
        </div>

        {/* Verified Packaging Units Log */}
        <div className="lg:col-span-2 p-5 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#0B120E24]">
            <h2 className="text-sm font-bold text-[#292A2E]">Verified carton serial units ({units.length})</h2>
            <span className="text-xs text-[#6B6E76]">Registered barcodes</span>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center text-xs text-[#505258]">
              <RefreshCw className="h-5 w-5 animate-spin text-[#1868DB] mr-2" />
              <span>Loading packaging records...</span>
            </div>
          ) : units.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#6B6E76]">
              No carton serial units registered for this run yet. Use the form to scan or pack boxes.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#0B120E24] text-xs">
                <thead>
                  <tr className="text-left font-semibold text-[#505258] bg-[#F8F8F8]">
                    <th className="py-2.5 px-3">Carton barcode</th>
                    <th className="py-2.5 px-3">Part count</th>
                    <th className="py-2.5 px-3">Pallet</th>
                    <th className="py-2.5 px-3">Packer</th>
                    <th className="py-2.5 px-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0B120E24] text-[#292A2E]">
                  {units.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F8F8F8]/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#1868DB]">{u.barcode}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#216E4E]">
                        {u.partCount} pcs
                      </td>
                      <td className="py-2.5 px-3 text-[#505258]">{u.palletId ?? '—'}</td>
                      <td className="py-2.5 px-3 text-[#505258]">{u.packager?.username ?? 'Operator'}</td>
                      <td className="py-2.5 px-3 text-right text-[#6B6E76]">
                        {new Date(u.packedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
