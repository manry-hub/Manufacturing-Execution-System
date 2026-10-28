import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Layers,
  ArrowRight,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Box,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type { Material, MaterialLot, RunGenealogy, LotGenealogy } from '../../types/materials.js';
import type { ProductionRun } from '../../types/production.js';

interface MaterialsViewProps {
  runs: ProductionRun[];
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({ runs }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lots, setLots] = useState<MaterialLot[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'genealogy'>('inventory');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Hopper Modal state
  const [isHopperModalOpen, setIsHopperModalOpen] = useState<boolean>(false);
  const [selectedRunId, setSelectedRunId] = useState<string>(runs[0]?.id ?? '');
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [hopperQuantityKg, setHopperQuantityKg] = useState<number>(25);
  const [isSubmittingHopper, setIsSubmittingHopper] = useState<boolean>(false);

  // Genealogy Search state
  const [genealogyMode, setGenealogyMode] = useState<'run' | 'lot'>('run');
  const [searchLotQuery, setSearchLotQuery] = useState<string>('LOT-PP-202610-01');
  const [runGenealogy, setRunGenealogy] = useState<RunGenealogy | null>(null);
  const [lotGenealogy, setLotGenealogy] = useState<LotGenealogy | null>(null);
  const [isSearchingGenealogy, setIsSearchingGenealogy] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFeedbackMessage(null);
    try {
      const [materialsData, lotsData] = await Promise.all([
        api.getMaterials(),
        api.getMaterialLots(),
      ]);
      setMaterials(materialsData);
      setLots(lotsData);
      if (lotsData.length > 0 && !selectedLotId) {
        setSelectedLotId(lotsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load materials:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLotId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Handle Load Hopper
  const handleLoadHopper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRunId || !selectedLotId || hopperQuantityKg <= 0) return;

    setIsSubmittingHopper(true);
    setFeedbackMessage(null);
    try {
      await api.loadHopper({
        runId: selectedRunId,
        materialLotId: selectedLotId,
        quantityKg: Number(hopperQuantityKg),
      });

      setFeedbackMessage({
        type: 'success',
        text: `Loaded ${hopperQuantityKg} kg into active machine hopper successfully.`,
      });
      setIsHopperModalOpen(false);
      await loadData();
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load hopper.',
      });
    } finally {
      setIsSubmittingHopper(false);
    }
  };

  // Perform Genealogy Search
  const handleSearchGenealogy = async () => {
    setIsSearchingGenealogy(true);
    setFeedbackMessage(null);
    try {
      if (genealogyMode === 'run') {
        if (!selectedRunId) return;
        const res = await api.getRunGenealogy(selectedRunId);
        setRunGenealogy(res);
        setLotGenealogy(null);
      } else {
        if (!searchLotQuery.trim()) return;
        const res = await api.getLotGenealogy(searchLotQuery.trim());
        setLotGenealogy(res);
        setRunGenealogy(null);
      }
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Genealogy record not found.',
      });
    } finally {
      setIsSearchingGenealogy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Landmark */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#0B120E24]">
        <div>
          <h1 className="text-xl font-bold text-[#292A2E] tracking-tight">Raw materials & bidirectional genealogy</h1>
          <p className="text-sm text-[#505258] mt-0.5">
            Resin lots, hopper intake validation, and end-to-end forward/backward traceability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            className="min-h-[32px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] border border-[#0B120E24] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setIsHopperModalOpen(true)}
            className="min-h-[32px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1868DB] hover:bg-[#1558BC] text-white shadow-xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Load hopper (Intake)</span>
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

      {/* Sub-tab Navigation */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-[#505258] space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin text-[#1868DB]" />
          <p className="text-xs font-medium">Loading raw materials inventory and lot balances...</p>
        </div>
      ) : (
        <>
          <div className="flex items-center space-x-2 border-b border-[#0B120E24]">
            <button
              type="button"
              onClick={() => setActiveSubTab('inventory')}
              className={`min-h-[32px] px-3.5 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
                activeSubTab === 'inventory'
                  ? 'border-[#1868DB] text-[#1868DB]'
                  : 'border-transparent text-[#505258] hover:text-[#292A2E]'
              }`}
            >
              Material lots inventory ({lots.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('genealogy');
                void handleSearchGenealogy();
              }}
              className={`min-h-[32px] px-3.5 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
                activeSubTab === 'genealogy'
                  ? 'border-[#1868DB] text-[#1868DB]'
                  : 'border-transparent text-[#505258] hover:text-[#292A2E]'
              }`}
            >
              Bidirectional genealogy tree
            </button>
          </div>

      {/* View 1: Inventory & Lots Cards */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-6">
          {/* Raw Material Master Types */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {materials.map((m) => (
              <div key={m.id} className="p-4 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1868DB] bg-[#E9F2FE] px-2 py-0.5 rounded-[3px] border border-[#8FB8F6]">
                    {m.category.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-[#6B6E76]">{m._count?.lots ?? 0} lots</span>
                </div>
                <h3 className="text-sm font-bold text-[#292A2E] pt-1">{m.name}</h3>
                <p className="text-xs text-[#505258]">Code: {m.code}</p>
                <p className="text-xs text-[#6B6E76]">Density: {m.densityGcm3 ? `${Number(m.densityGcm3)} g/cm³` : 'Standard'}</p>
              </div>
            ))}
          </div>

          {/* Active Material Lots Table */}
          <div className="p-5 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#0B120E24]">
              <h2 className="text-sm font-bold text-[#292A2E]">Active raw material lots</h2>
              <span className="text-xs text-[#6B6E76]">Sorted by receipt date</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#0B120E24] text-xs">
                <thead>
                  <tr className="text-left font-semibold text-[#505258] bg-[#F8F8F8]">
                    <th className="py-2.5 px-3">Lot number</th>
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3">Supplier lot</th>
                    <th className="py-2.5 px-3">Remaining / Initial (kg)</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Expiration</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0B120E24] text-[#292A2E]">
                  {lots.map((lot) => {
                    const remaining = Number(lot.remainingQtyKg);
                    const initial = Number(lot.initialQtyKg);
                    const pct = initial > 0 ? Math.round((remaining / initial) * 100) : 0;

                    return (
                      <tr key={lot.id} className="hover:bg-[#F8F8F8]/50">
                        <td className="py-2.5 px-3 font-bold text-[#1868DB]">{lot.lotNumber}</td>
                        <td className="py-2.5 px-3 font-medium">
                          {lot.material?.name ?? lot.materialId} ({lot.material?.code})
                        </td>
                        <td className="py-2.5 px-3 text-[#505258]">{lot.supplierLot ?? '—'}</td>
                        <td className="py-2.5 px-3" aria-label={`Remaining ${remaining} kg of ${initial} kg`}>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-bold">{remaining} kg</span>
                              <span className="text-[#6B6E76]">{initial} kg ({pct}%)</span>
                            </div>
                            <div className="w-28 bg-[#F1F2F4] rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct > 25 ? 'bg-[#22A06B]' : pct > 10 ? 'bg-[#E06C00]' : 'bg-[#E2483D]'
                                }`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-[3px] border ${
                              lot.status === 'AVAILABLE'
                                ? 'bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]'
                                : lot.status === 'CONSUMED'
                                ? 'bg-[#F1F2F4] text-[#505258] border-[#DCDFE4]'
                                : 'bg-[#FFECEB] text-[#5D1F1A] border-[#E2483D]'
                            }`}
                          >
                            {lot.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#505258]">
                          {lot.expirationDate ? new Date(lot.expirationDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSearchLotQuery(lot.lotNumber);
                              setGenealogyMode('lot');
                              setActiveSubTab('genealogy');
                              void api.getLotGenealogy(lot.lotNumber).then((res) => {
                                setLotGenealogy(res);
                                setRunGenealogy(null);
                              });
                            }}
                            className="min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1868DB] hover:bg-[#E9F2FE] rounded-md transition-colors"
                          >
                            <span>Trace</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Bidirectional Genealogy Explorer */}
      {activeSubTab === 'genealogy' && (
        <div className="p-5 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#0B120E24]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#505258]">Trace mode:</span>
              <div className="inline-flex rounded-md border border-[#0B120E24] p-0.5 bg-[#F8F8F8]">
                <button
                  type="button"
                  onClick={() => setGenealogyMode('run')}
                  className={`min-h-[28px] px-3 py-1 text-xs font-semibold rounded transition-colors ${
                    genealogyMode === 'run'
                      ? 'bg-[#FFFFFF] text-[#1868DB] shadow-xs'
                      : 'text-[#505258] hover:text-[#292A2E]'
                  }`}
                >
                  Backward (By Run / Order)
                </button>
                <button
                  type="button"
                  onClick={() => setGenealogyMode('lot')}
                  className={`min-h-[28px] px-3 py-1 text-xs font-semibold rounded transition-colors ${
                    genealogyMode === 'lot'
                      ? 'bg-[#FFFFFF] text-[#1868DB] shadow-xs'
                      : 'text-[#505258] hover:text-[#292A2E]'
                  }`}
                >
                  Forward (By Raw Lot Number)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {genealogyMode === 'run' ? (
                <select
                  value={selectedRunId}
                  onChange={(e) => setSelectedRunId(e.target.value)}
                  className="min-h-[32px] px-3 py-1 text-xs rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-medium"
                >
                  {runs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.machine?.code} — {r.productionOrder?.orderNumber} ({r.productionOrder?.product?.name})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={searchLotQuery}
                  onChange={(e) => setSearchLotQuery(e.target.value)}
                  placeholder="e.g. LOT-PP-202610-01"
                  className="min-h-[32px] px-3 py-1 text-xs rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-medium"
                />
              )}
              <button
                type="button"
                onClick={() => void handleSearchGenealogy()}
                disabled={isSearchingGenealogy}
                className="min-h-[32px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1868DB] hover:bg-[#1558BC] text-white shadow-xs transition-colors disabled:opacity-50"
              >
                <Search className="h-3.5 w-3.5" />
                <span>{isSearchingGenealogy ? 'Tracing...' : 'Trace genealogy'}</span>
              </button>
            </div>
          </div>

          {/* Backward Trace Tree Display (Run -> Materials & Cartons) */}
          {genealogyMode === 'run' && runGenealogy && (
            <div className="space-y-6">
              {/* Top Node: Finished Part Run */}
              <div className="p-4 rounded-lg bg-[#E9F2FE] border border-[#357DE8] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-[#1868DB] text-white flex items-center justify-center shrink-0">
                    <Box className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#123263]">{runGenealogy.orderNumber}</span>
                      <span className="text-xs px-2 py-0.5 rounded-[3px] bg-[#FFFFFF] text-[#123263] border border-[#357DE8]">
                        Run: {runGenealogy.runStatus}
                      </span>
                    </div>
                    <p className="text-xs text-[#505258]">
                      Product: <strong>{runGenealogy.product.partNumber}</strong> ({runGenealogy.product.name}) | Machine: <strong>{runGenealogy.machine.code}</strong> | Mold: <strong>{runGenealogy.mold.code}</strong>
                    </p>
                  </div>
                </div>
                <div className="text-xs text-right">
                  <p className="text-[#505258]">Good output: <strong className="text-[#216E4E]">{runGenealogy.goodQuantity}</strong> parts</p>
                  <p className="text-[#6B6E76]">Total shots: {runGenealogy.totalShots} | Scrap: {runGenealogy.rejectQuantity}</p>
                </div>
              </div>

              {/* Inward Arrows & Consumed Lots */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#1868DB]" />
                  <h3 className="text-xs font-bold text-[#292A2E] uppercase tracking-wider">
                    Raw materials loaded into hopper ({runGenealogy.rawMaterialsConsumed.length})
                  </h3>
                </div>

                {runGenealogy.rawMaterialsConsumed.length === 0 ? (
                  <p className="text-xs text-[#6B6E76] italic p-3 bg-[#F8F8F8] rounded border border-[#0B120E24]">
                    No material consumption records associated with this run yet. Use "Load hopper" to assign resin lots.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {runGenealogy.rawMaterialsConsumed.map((c) => (
                      <div
                        key={c.consumptionId}
                        className="p-3.5 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1868DB]">{c.lotNumber}</span>
                          <span className="text-xs font-bold text-[#216E4E] bg-[#EFFFD6] px-1.5 py-0.5 rounded border border-[#6A9A23]">
                            {c.quantityKg} kg
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#292A2E]">{c.materialName}</p>
                        <div className="text-xs text-[#6B6E76] flex justify-between pt-1 border-t border-[#0B120E24]">
                          <span>Supplier: {c.supplierLot ?? 'Internal'}</span>
                          <span>Loaded by {c.loadedBy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Downstream Packaging Barcodes */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-[#803FA5]" />
                  <h3 className="text-xs font-bold text-[#292A2E] uppercase tracking-wider">
                    Verified finished packaging cartons ({runGenealogy.packagingUnits.length})
                  </h3>
                </div>

                {runGenealogy.packagingUnits.length === 0 ? (
                  <p className="text-xs text-[#6B6E76] italic p-3 bg-[#F8F8F8] rounded border border-[#0B120E24]">
                    No packaging units scanned for this run yet. Cartons will appear here once verified at packaging station.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {runGenealogy.packagingUnits.map((p) => (
                      <div
                        key={p.barcode}
                        className="p-3 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[#292A2E]">{p.barcode}</span>
                          <span className="text-xs font-bold text-[#803FA5] bg-[#F3E8FF] px-1.5 py-0.2 rounded border border-[#D8A0F7]">
                            {p.partCount} pcs
                          </span>
                        </div>
                        <p className="text-[#6B6E76]">Pallet: {p.palletId ?? 'Standard'}</p>
                        <p className="text-[#6B6E76]">Packer: {p.packager} at {new Date(p.packedAt).toLocaleTimeString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Forward Trace Display (Lot -> Produced Runs & Products) */}
          {genealogyMode === 'lot' && lotGenealogy && (
            <div className="space-y-6">
              {/* Origin Node: Raw Material Lot */}
              <div className="p-4 rounded-lg bg-[#EFFFD6] border border-[#6A9A23] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-[#22A06B] text-white flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#37471F]">{lotGenealogy.lotNumber}</span>
                      <span className="text-xs px-2 py-0.5 rounded-[3px] bg-[#FFFFFF] text-[#37471F] border border-[#6A9A23]">
                        {lotGenealogy.material.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#505258]">
                      Resin: <strong>{lotGenealogy.material.name}</strong> ({lotGenealogy.material.code}) | Supplier Lot: <strong>{lotGenealogy.supplierLot ?? 'Internal'}</strong>
                    </p>
                  </div>
                </div>
                <div className="text-xs text-right">
                  <p className="text-[#505258]">Remaining: <strong className="text-[#37471F]">{lotGenealogy.remainingQtyKg}</strong> / {lotGenealogy.initialQtyKg} kg</p>
                  <p className="text-[#6B6E76]">Lot status: {lotGenealogy.status}</p>
                </div>
              </div>

              {/* Forward Consumer Runs */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-[#22A06B]" />
                  <h3 className="text-xs font-bold text-[#292A2E] uppercase tracking-wider">
                    Downstream production runs consumed ({lotGenealogy.producedRuns.length})
                  </h3>
                </div>

                {lotGenealogy.producedRuns.length === 0 ? (
                  <p className="text-xs text-[#6B6E76] italic p-3 bg-[#F8F8F8] rounded border border-[#0B120E24]">
                    This material lot has not yet been loaded into any machine hoppers.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lotGenealogy.producedRuns.map((r) => (
                      <div
                        key={r.runId}
                        className="p-4 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1868DB]">{r.orderNumber}</span>
                          <span className="font-bold text-[#216E4E] bg-[#EFFFD6] px-1.5 py-0.5 rounded border border-[#6A9A23]">
                            Consumed: {r.quantityConsumedKg} kg
                          </span>
                        </div>
                        <p className="font-semibold text-[#292A2E]">{r.partNumber} — {r.productName}</p>
                        <div className="flex justify-between text-[#6B6E76] pt-1 border-t border-[#0B120E24]">
                          <span>Machine: {r.machineCode}</span>
                          <span>Output: {r.producedGoodQty} parts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* Load Hopper Modal */}
      {isHopperModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050C1F75] backdrop-blur-xs">
          <div className="max-w-md w-full bg-[#FFFFFF] rounded-lg border border-[#0B120E24] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#FFFFFF] border-b border-[#0B120E24] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#292A2E]">Load material to hopper</h3>
                <p className="text-xs text-[#505258]">Record resin intake for active machine run</p>
              </div>
              <button
                type="button"
                onClick={() => setIsHopperModalOpen(false)}
                className="text-[#6B6E76] hover:text-[#292A2E] p-1 rounded-md text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLoadHopper} className="p-5 space-y-4">
              <div>
                <label htmlFor="hopper-target-run-select" className="block text-xs font-semibold text-[#505258] mb-1">Target active run / machine</label>
                <select
                  id="hopper-target-run-select"
                  value={selectedRunId}
                  onChange={(e) => setSelectedRunId(e.target.value)}
                  className="w-full min-h-[32px] px-3 py-1.5 text-xs rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-medium"
                  required
                >
                  {runs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.machine?.code} — {r.productionOrder?.orderNumber} ({r.productionOrder?.product?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="hopper-resin-lot-select" className="block text-xs font-semibold text-[#505258] mb-1">Select available resin lot</label>
                <select
                  id="hopper-resin-lot-select"
                  value={selectedLotId}
                  onChange={(e) => setSelectedLotId(e.target.value)}
                  className="w-full min-h-[32px] px-3 py-1.5 text-xs rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-medium"
                  required
                >
                  {lots
                    .filter((l) => l.status === 'AVAILABLE')
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.lotNumber} ({l.material?.name}) — {Number(l.remainingQtyKg)} kg left
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="hopper-intake-weight-input" className="block text-xs font-semibold text-[#505258] mb-1">Intake weight (kg)</label>
                <input
                  id="hopper-intake-weight-input"
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={hopperQuantityKg}
                  onChange={(e) => setHopperQuantityKg(parseFloat(e.target.value) || 0)}
                  className="w-full min-h-[32px] px-3 py-1.5 text-xs rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-medium"
                  placeholder="e.g. 25.0"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#0B120E24]">
                <button
                  type="button"
                  onClick={() => setIsHopperModalOpen(false)}
                  className="min-h-[32px] px-3 py-1.5 rounded-md text-xs font-medium bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] border border-[#0B120E24] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHopper}
                  className="min-h-[32px] px-4 py-1.5 rounded-md text-xs font-semibold bg-[#1868DB] hover:bg-[#1558BC] text-white shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmittingHopper ? 'Loading...' : 'Confirm hopper intake'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
