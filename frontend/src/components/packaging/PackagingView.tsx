import React, { useState, useEffect, useCallback } from 'react';
import {
  PackageCheck,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Printer,
  Scan,
  Maximize2,
  Minimize2,
  Layers,
  Sparkles,
  Barcode as BarcodeIcon,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useTelemetrySocket } from '../../hooks/useTelemetrySocket.js';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner.js';
import { CartonLabelModal } from './CartonLabelModal.js';
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

  // Kiosk / Touchscreen Mode
  const [isKioskMode, setIsKioskMode] = useState<boolean>(false);

  // Scanner Simulator Modal / Drawer
  const [isScannerSimulatorOpen, setIsScannerSimulatorOpen] = useState<boolean>(false);
  const [simulatorInput, setSimulatorInput] = useState<string>('');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  // Label Printing Modal State
  const [labelModalOpen, setLabelModalOpen] = useState<boolean>(false);
  const [selectedUnitForLabel, setSelectedUnitForLabel] = useState<PackagingUnit | null>(null);
  const [isPalletMasterPrint, setIsPalletMasterPrint] = useState<boolean>(false);

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

  // Live WebSocket updates
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

  // Barcode Scanner Handler
  const handleScannedCode = useCallback(
    async (scannedCode: string) => {
      setLastScannedCode(scannedCode);

      // Check if it's a pallet scan (prefixed with PAL-)
      if (scannedCode.startsWith('PAL-')) {
        setPalletId(scannedCode);
        setFeedbackMessage({
          type: 'success',
          text: `Pallet set to "${scannedCode}" via barcode scan.`,
        });
        return;
      }

      // Auto-register carton with scanned code if selected run is active
      if (!selectedRunId) {
        setFeedbackMessage({
          type: 'error',
          text: `Barcode "${scannedCode}" scanned, but no active production run is selected.`,
        });
        return;
      }

      setIsPacking(true);
      try {
        const unit = await api.createPackagingUnit({
          runId: selectedRunId,
          partCount: Number(partCount),
          palletId: palletId.trim() || undefined,
          barcode: scannedCode,
        });

        setFeedbackMessage({
          type: 'success',
          text: `Scanned & registered carton "${unit.barcode}" (${partCount} parts on ${palletId}).`,
        });
        setSelectedUnitForLabel(unit);
        setLabelModalOpen(true);
        setIsPalletMasterPrint(false);
        await loadPackagingData();
      } catch (err) {
        setFeedbackMessage({
          type: 'error',
          text: err instanceof Error ? err.message : `Failed to register scanned barcode "${scannedCode}".`,
        });
      } finally {
        setIsPacking(false);
      }
    },
    [selectedRunId, partCount, palletId, loadPackagingData],
  );

  const { simulateScan } = useBarcodeScanner({
    onScan: handleScannedCode,
    enabled: true,
  });

  const handleCreatePackagingUnit = async (e: React.FormEvent, autoPrint: boolean = false) => {
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

      if (autoPrint) {
        setSelectedUnitForLabel(unit);
        setIsPalletMasterPrint(false);
        setLabelModalOpen(true);
      }

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

  const handleOpenPrintLabel = (unit: PackagingUnit) => {
    setSelectedUnitForLabel(unit);
    setIsPalletMasterPrint(false);
    setLabelModalOpen(true);
  };

  const handleOpenMasterPalletLabel = (pId: string) => {
    setSelectedUnitForLabel(null);
    setIsPalletMasterPrint(true);
    setPalletId(pId);
    setLabelModalOpen(true);
  };

  // Find active pallet stats
  const activePalletStats = reconciliation?.pallets?.find((p) => p.palletId === palletId) ?? {
    palletId,
    cartonCount: units.filter((u) => u.palletId === palletId).length,
    totalParts: units.filter((u) => u.palletId === palletId).reduce((acc, u) => acc + u.partCount, 0),
  };

  return (
    <div className={`space-y-6 ${isKioskMode ? 'p-2 bg-[#F4F5F7] rounded-xl' : ''}`}>
      {/* Page Title & Landmark */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#0B120E24]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#292A2E] tracking-tight">
              Industrial Barcode Packaging Station
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E9F2FE] text-[#1868DB] border border-[#1868DB]/20">
              AIAG B-10
            </span>
          </div>
          <p className="text-sm text-[#505258] mt-0.5">
            Carton serial label generation, USB HID scanner ingestion, pallet aggregation, and real-time shot-to-pack variance auditing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Scanner Status Badge */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E3FCEF] text-[#006644] border border-[#ABF5D1]">
            <Scan className="h-3.5 w-3.5 text-[#00875A] animate-pulse" />
            <span>Scanner Ready</span>
          </span>

          {/* WebSocket Status */}
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

          {/* Scanner Simulator Toggle */}
          <button
            type="button"
            onClick={() => setIsScannerSimulatorOpen(!isScannerSimulatorOpen)}
            className="min-h-[32px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#1868DB] border border-[#1868DB]/30 shadow-xs transition-colors"
          >
            <BarcodeIcon className="h-3.5 w-3.5" />
            <span>Scanner Sim</span>
          </button>

          {/* Kiosk Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsKioskMode(!isKioskMode)}
            className={`min-h-[32px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              isKioskMode
                ? 'bg-[#1868DB] text-white border-[#1868DB]'
                : 'bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] border-[#0B120E24]'
            }`}
          >
            {isKioskMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>{isKioskMode ? 'Exit Kiosk' : 'Touchscreen Kiosk'}</span>
          </button>

          {/* Refresh */}
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

      {/* Scanner Simulator Drawer / Card */}
      {isScannerSimulatorOpen && (
        <div className="p-4 rounded-lg bg-[#E9F2FE] border border-[#357DE8]/40 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scan className="h-4 w-4 text-[#1868DB]" />
              <span className="text-xs font-bold text-[#123263] uppercase tracking-wider">
                Virtual Hardware Barcode Scanner Simulator
              </span>
            </div>
            <span className="text-[11px] text-[#505258]">
              Simulates handheld USB HID keystroke bursts ending in &lt;CR&gt;
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={simulatorInput}
              onChange={(e) => setSimulatorInput(e.target.value)}
              placeholder="e.g. PKG-BUMP-2026-0042 or PAL-01"
              className="flex-1 min-h-[36px] px-3 py-1 text-xs rounded-md bg-white border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-mono"
            />
            <button
              type="button"
              onClick={() => {
                if (simulatorInput.trim()) {
                  simulateScan(simulatorInput);
                  setSimulatorInput('');
                }
              }}
              className="px-4 py-2 rounded-md text-xs font-semibold bg-[#1868DB] hover:bg-[#1558BC] text-white transition-colors"
            >
              Simulate Scan &lt;CR&gt;
            </button>
            <button
              type="button"
              onClick={() => {
                const autoCode = `PKG-${selectedRun?.productionOrder?.orderNumber?.replace(/[^a-zA-Z0-9]/g, '').slice(-4) ?? '001'}-${Date.now().toString(36).toUpperCase()}`;
                simulateScan(autoCode);
              }}
              className="px-3 py-2 rounded-md text-xs font-medium bg-white border border-[#357DE8]/40 text-[#123263] hover:bg-[#F8F9FA] transition-colors"
            >
              Random Carton Code
            </button>
            <button
              type="button"
              onClick={() => simulateScan('PAL-02')}
              className="px-3 py-2 rounded-md text-xs font-medium bg-white border border-[#357DE8]/40 text-[#123263] hover:bg-[#F8F9FA] transition-colors"
            >
              Scan Pallet PAL-02
            </button>
          </div>

          {lastScannedCode && (
            <div className="text-[11px] font-mono text-[#1868DB] flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              <span>Last Captured Scanner Payload: <strong>{lastScannedCode}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Feedback Alert */}
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
          <span className="font-medium">{feedbackMessage.text}</span>
        </div>
      )}

      {/* Active Run Selector */}
      <div className="p-4 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="packaging-run-select" className="text-xs font-semibold text-[#505258] uppercase tracking-wider shrink-0">
            Active production run:
          </label>
          <select
            id="packaging-run-select"
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="min-h-[36px] px-3 py-1 text-sm rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-medium"
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
            <div>
              <span className="text-[#6B6E76]">Part #:</span>{' '}
              <span className="font-mono font-bold text-[#1868DB]">{selectedRun.productionOrder?.product?.partNumber ?? '—'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Section 1: Shot-to-Pack Reconciliation Scorecards */}
      {reconciliation && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Target Order */}
            <div className="p-4 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-1">
              <span className="text-xs font-semibold text-[#6B6E76] uppercase tracking-wider">Target Order</span>
              <p className="text-2xl font-bold text-[#292A2E]">{reconciliation.targetQuantity.toLocaleString()}</p>
              <p className="text-xs text-[#505258]">Ordered parts ({reconciliation.orderNumber})</p>
            </div>

            {/* KPI 2: Molded Output (Good Parts) */}
            <div className="p-4 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-1">
              <span className="text-xs font-semibold text-[#6B6E76] uppercase tracking-wider">Molding Output</span>
              <p className="text-2xl font-bold text-[#216E4E]">{reconciliation.producedGoodQuantity.toLocaleString()}</p>
              <p className="text-xs text-[#505258]">
                {reconciliation.totalShots ? `${reconciliation.totalShots.toLocaleString()} shots × ${reconciliation.mold?.cavities ?? 1} cav` : 'Good parts off conveyor'}
              </p>
            </div>

            {/* KPI 3: Packed Cartons */}
            <div className="p-4 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-1">
              <span className="text-xs font-semibold text-[#6B6E76] uppercase tracking-wider">Packed & Serialized</span>
              <p className="text-2xl font-bold text-[#1868DB]">{reconciliation.packedQuantity.toLocaleString()}</p>
              <p className="text-xs text-[#505258]">{reconciliation.packagingUnitsCount} cartons verified</p>
            </div>

            {/* KPI 4: Unpacked Buffer / Discrepancy Status */}
            <div
              className={`p-4 rounded-lg border shadow-xs space-y-1 ${
                reconciliation.discrepancyAlert
                  ? 'bg-[#FFECEB] border-[#E2483D]'
                  : reconciliation.varianceUnpacked === 0 && reconciliation.producedGoodQuantity > 0
                  ? 'bg-[#EFFFD6] border-[#6A9A23]'
                  : 'bg-[#FFF5DB] border-[#E06C00]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    reconciliation.discrepancyAlert
                      ? 'text-[#AE2E24]'
                      : reconciliation.varianceUnpacked === 0
                      ? 'text-[#216E4E]'
                      : 'text-[#693200]'
                  }`}
                >
                  {reconciliation.discrepancyAlert ? 'Discrepancy Drift' : 'Unpacked Buffer'}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    reconciliation.discrepancyAlert
                      ? 'bg-[#C9372C] text-white'
                      : 'bg-white/80 text-[#292A2E]'
                  }`}
                >
                  {reconciliation.discrepancyStatus ?? 'BALANCED'}
                </span>
              </div>
              <p className="text-2xl font-bold text-[#292A2E]">{reconciliation.varianceUnpacked.toLocaleString()}</p>
              <p className="text-xs text-[#505258]">
                {reconciliation.discrepancyAlert
                  ? `Variance (${reconciliation.variancePercentage}%) exceeds 2% tolerance threshold!`
                  : reconciliation.varianceUnpacked === 0
                  ? '100% matched to packaging'
                  : 'Pending packing & barcode scan'}
              </p>
            </div>
          </div>

          {/* Shot-to-Pack Reconciliation Multi-Segment Gauge */}
          <div
            className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              reconciliation.discrepancyAlert
                ? 'bg-[#FFECEB] border-[#E2483D] text-[#5D1F1A]'
                : reconciliation.varianceUnpacked === 0 && reconciliation.producedGoodQuantity > 0
                ? 'bg-[#EFFFD6] border-[#6A9A23] text-[#37471F]'
                : 'bg-[#E9F2FE] border-[#357DE8] text-[#123263]'
            }`}
          >
            <div className="flex items-center gap-3">
              {reconciliation.discrepancyAlert ? (
                <AlertTriangle className="h-6 w-6 text-[#C9372C] shrink-0 animate-bounce" />
              ) : reconciliation.varianceUnpacked === 0 && reconciliation.producedGoodQuantity > 0 ? (
                <CheckCircle2 className="h-6 w-6 text-[#6A9A23] shrink-0" />
              ) : (
                <TrendingUp className="h-6 w-6 text-[#1868DB] shrink-0" />
              )}
              <div>
                <p className="text-sm font-bold">
                  {reconciliation.discrepancyAlert
                    ? `Shot-to-Pack Discrepancy Warning: Delta of ${reconciliation.varianceUnpacked} parts (${reconciliation.variancePercentage}%) exceeds ±2% threshold`
                    : reconciliation.varianceUnpacked === 0 && reconciliation.producedGoodQuantity > 0
                    ? 'Shot-to-pack reconciled (Zero unboxed variance across all shots)'
                    : `Packaging in progress — ${reconciliation.varianceUnpacked} molded parts in staging buffer`}
                </p>
                <p className="text-xs opacity-90 mt-0.5">
                  Order fulfillment: {reconciliation.completionPercentage}% ({reconciliation.packedQuantity} of {reconciliation.targetQuantity} parts packed) • Scrapped: {reconciliation.scrappedQuantity} pcs
                </p>
              </div>
            </div>

            {/* Visual Gauge Bar */}
            <div className="w-full md:w-64 space-y-1">
              <div className="flex justify-between text-[11px] font-mono font-semibold">
                <span>Packed: {reconciliation.packedQuantity}</span>
                <span>Output: {reconciliation.producedGoodQuantity}</span>
              </div>
              <div className="w-full bg-[#FFFFFF] rounded-full h-2.5 overflow-hidden border border-[#0B120E24]">
                <div
                  className={`h-full rounded-full transition-all ${
                    reconciliation.discrepancyAlert ? 'bg-[#E2483D]' : 'bg-[#1868DB]'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      reconciliation.producedGoodQuantity > 0
                        ? (reconciliation.packedQuantity / reconciliation.producedGoodQuantity) * 100
                        : 0,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Pack Carton Form, Pallet Staging, & Verified Barcodes Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Pack Form & Pallet Management */}
        <div className="space-y-6">
          {/* Pack Carton Form */}
          <div className="p-5 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#0B120E24]">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-[#1868DB]" />
                <h2 className="text-sm font-bold text-[#292A2E]">
                  {isKioskMode ? 'Touchscreen Packaging Station' : 'Scan / Pack Carton'}
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[#505258]">
                Mach: {selectedRun?.machine?.code}
              </span>
            </div>

            <form onSubmit={(e) => handleCreatePackagingUnit(e, false)} className="space-y-4">
              {/* Part Count with Quick Presets */}
              <div>
                <label htmlFor="pack-part-count-input" className="block text-xs font-semibold text-[#505258] mb-1">
                  Parts per carton (pcs)
                </label>
                <input
                  id="pack-part-count-input"
                  type="number"
                  min="1"
                  value={partCount}
                  onChange={(e) => setPartCount(parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-1.5 rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-bold ${
                    isKioskMode ? 'min-h-[48px] text-lg' : 'min-h-[36px] text-xs'
                  }`}
                  required
                />
                {/* Touch Preset Buttons */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-[#6B6E76] uppercase font-semibold">Presets:</span>
                  {[25, 50, 100, 250].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPartCount(preset)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                        partCount === preset
                          ? 'bg-[#1868DB] text-white shadow-xs'
                          : 'bg-[#F1F2F4] text-[#292A2E] hover:bg-[#EBECF0]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pallet Identifier */}
              <div>
                <label htmlFor="pack-pallet-id-input" className="block text-xs font-semibold text-[#505258] mb-1">
                  Target Pallet ID
                </label>
                <div className="flex gap-2">
                  <input
                    id="pack-pallet-id-input"
                    type="text"
                    value={palletId}
                    onChange={(e) => setPalletId(e.target.value)}
                    placeholder="e.g. PAL-01"
                    className={`flex-1 px-3 py-1.5 rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-medium font-mono ${
                      isKioskMode ? 'min-h-[48px] text-base' : 'min-h-[36px] text-xs'
                    }`}
                  />
                  {['PAL-01', 'PAL-02'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPalletId(p)}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                        palletId === p
                          ? 'bg-[#006644] text-white'
                          : 'bg-[#F1F2F4] text-[#292A2E] hover:bg-[#EBECF0]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Carton Barcode (Manual or Scanned) */}
              <div>
                <label htmlFor="pack-custom-barcode-input" className="block text-xs font-semibold text-[#505258] mb-1">
                  Carton barcode (Optional — auto-generated if blank)
                </label>
                <div className="relative">
                  <input
                    id="pack-custom-barcode-input"
                    type="text"
                    value={customBarcode}
                    onChange={(e) => setCustomBarcode(e.target.value)}
                    placeholder="Scan handheld 2D barcode or leave empty"
                    className={`w-full px-3 py-1.5 rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-mono ${
                      isKioskMode ? 'min-h-[48px] text-base' : 'min-h-[36px] text-xs'
                    }`}
                  />
                  <Scan className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8F97]" />
                </div>
              </div>

              {/* Primary Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isPacking || !selectedRunId}
                  className={`w-full inline-flex items-center justify-center gap-1.5 px-4 rounded-md font-semibold bg-[#1868DB] hover:bg-[#1558BC] text-white shadow-xs transition-colors disabled:opacity-50 ${
                    isKioskMode ? 'min-h-[48px] text-sm' : 'min-h-[38px] text-xs'
                  }`}
                >
                  <PackageCheck className="h-4 w-4" />
                  <span>{isPacking ? 'Registering...' : 'Pack Carton'}</span>
                </button>

                <button
                  type="button"
                  disabled={isPacking || !selectedRunId}
                  onClick={(e) => handleCreatePackagingUnit(e, true)}
                  className={`w-full inline-flex items-center justify-center gap-1.5 px-4 rounded-md font-semibold bg-[#006644] hover:bg-[#005236] text-white shadow-xs transition-colors disabled:opacity-50 ${
                    isKioskMode ? 'min-h-[48px] text-sm' : 'min-h-[38px] text-xs'
                  }`}
                >
                  <Printer className="h-4 w-4" />
                  <span>Pack & Print</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active Pallet Staging Card */}
          <div className="p-5 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#0B120E24]">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#006644]" />
                <h3 className="text-sm font-bold text-[#292A2E]">Active Pallet: {palletId}</h3>
              </div>
              <span className="text-xs font-mono font-semibold text-[#006644]">
                {activePalletStats.totalParts} pcs
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[#505258]">
                <span>Aggregated Cartons:</span>
                <span className="font-bold text-[#292A2E]">{activePalletStats.cartonCount} boxes</span>
              </div>
              <div className="flex justify-between text-[#505258]">
                <span>Total Finished Parts:</span>
                <span className="font-bold text-[#216E4E]">{activePalletStats.totalParts.toLocaleString()} pcs</span>
              </div>
            </div>

            <button
              type="button"
              disabled={activePalletStats.cartonCount === 0}
              onClick={() => handleOpenMasterPalletLabel(palletId)}
              className="w-full min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#006644] border border-[#006644]/40 shadow-xs transition-colors disabled:opacity-40"
            >
              <Printer className="h-4 w-4" />
              <span>Print Master Pallet Label (AIAG B-10)</span>
            </button>
          </div>
        </div>

        {/* Right Columns: Verified Packaging Units Log */}
        <div className="lg:col-span-2 p-5 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#0B120E24] gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#292A2E]">
                Verified Carton Serial Units ({units.length})
              </h2>
              <p className="text-xs text-[#6B6E76]">
                Traceable serialized barcodes registered for active production run
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#505258]">
                Total: <strong>{units.reduce((acc, u) => acc + u.partCount, 0).toLocaleString()}</strong> pcs
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center text-xs text-[#505258]">
              <RefreshCw className="h-5 w-5 animate-spin text-[#1868DB] mr-2" />
              <span>Loading packaging records...</span>
            </div>
          ) : units.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#6B6E76] space-y-2">
              <QrCode className="h-8 w-8 mx-auto text-[#8C8F97] opacity-50" />
              <p>No carton serial units registered for this run yet.</p>
              <p className="text-[11px] text-[#8C8F97]">
                Scan a barcode with your handheld scanner or click "Pack Carton".
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#0B120E24] text-xs">
                <thead>
                  <tr className="text-left font-semibold text-[#505258] bg-[#F8F8F8]">
                    <th className="py-2.5 px-3">Carton Serial Barcode</th>
                    <th className="py-2.5 px-3">Part Count</th>
                    <th className="py-2.5 px-3">Pallet</th>
                    <th className="py-2.5 px-3">Operator</th>
                    <th className="py-2.5 px-3 text-right">Packed Time</th>
                    <th className="py-2.5 px-3 text-right">Label Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0B120E24] text-[#292A2E]">
                  {units.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F8F8F8]/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#1868DB]">
                        <div className="flex items-center gap-1.5">
                          <BarcodeIcon className="h-3.5 w-3.5 text-[#505258]" />
                          <span>{u.barcode}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#216E4E]">
                        {u.partCount} pcs
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono px-1.5 py-0.5 rounded bg-[#F1F2F4] text-[#292A2E] text-[11px] font-semibold">
                          {u.palletId ?? '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#505258]">{u.packager?.username ?? 'Operator'}</td>
                      <td className="py-2.5 px-3 text-right text-[#6B6E76] font-mono">
                        {new Date(u.packedAt).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenPrintLabel(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#1868DB] border border-[#1868DB]/30 shadow-xs transition-colors"
                        >
                          <Printer className="h-3 w-3" />
                          <span>Print Label</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Industrial Carton & Pallet Barcode Label Modal */}
      <CartonLabelModal
        isOpen={labelModalOpen}
        onClose={() => setLabelModalOpen(false)}
        unit={selectedUnitForLabel}
        reconciliation={reconciliation}
        isPalletMaster={isPalletMasterPrint}
        palletId={palletId}
        palletCartonsCount={activePalletStats.cartonCount}
        palletTotalParts={activePalletStats.totalParts}
      />
    </div>
  );
};
