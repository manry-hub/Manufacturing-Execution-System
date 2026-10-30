import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ClipboardList,
  Plus,
  RefreshCw,
  Play,
  BarChart2,
  Info,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useTelemetrySocket } from '../../hooks/useTelemetrySocket.js';
import type { ProductionRun } from '../../types/production.js';
import type {
  InspectionPlan,
  QualityCheck,
  FirstPieceReleaseStatus,
  CpkAnalyticsResponse,
  CpkMetric,
} from '../../types/quality.js';

interface QualityViewProps {
  runs: ProductionRun[];
  onRefreshRuns?: () => Promise<void> | void;
}

export const QualityView: React.FC<QualityViewProps> = ({ runs, onRefreshRuns }) => {
  const [selectedRunId, setSelectedRunId] = useState<string>(runs[0]?.id ?? '');
  const [plans, setPlans] = useState<InspectionPlan[]>([]);
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [firstPieceStatus, setFirstPieceStatus] = useState<FirstPieceReleaseStatus | null>(null);
  const [cpkData, setCpkData] = useState<CpkAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isReleasingRun, setIsReleasingRun] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [isCheckModalOpen, setIsCheckModalOpen] = useState<boolean>(false);
  const [checkType, setCheckType] = useState<'FIRST_PIECE' | 'HOURLY_PATROL' | 'CONTAINMENT'>('FIRST_PIECE');
  const [checkNotes, setCheckNotes] = useState<string>('');
  const [sampleValues, setSampleValues] = useState<Record<string, { measuredValue?: number; isPassed?: boolean }>>({});
  const [autoReleaseRunOnPass, setAutoReleaseRunOnPass] = useState<boolean>(true);

  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? runs[0];
  const targetProductId = selectedRun?.productionOrder?.productId;

  const loadQualityData = useCallback(async () => {
    if (!selectedRunId) return;
    setIsLoading(true);
    setFeedbackMessage(null);
    try {
      const [plansData, checksData, statusData, cpkAnalytics] = await Promise.all([
        api.getInspectionPlans(targetProductId),
        api.getRunQualityChecks(selectedRunId),
        api.getFirstPieceStatus(selectedRunId),
        api.getCpkAnalytics({ runId: selectedRunId, productId: targetProductId }),
      ]);
      setPlans(plansData);
      setChecks(checksData);
      setFirstPieceStatus(statusData);
      setCpkData(cpkAnalytics);
    } catch (err) {
      console.error('Failed to load quality data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRunId, targetProductId]);

  useEffect(() => {
    if (selectedRunId) {
      void loadQualityData();
    }
  }, [selectedRunId, loadQualityData]);

  // Sync selected run if runs prop changes
  useEffect(() => {
    if (runs.length > 0 && !selectedRunId) {
      setSelectedRunId(runs[0].id);
    }
  }, [runs, selectedRunId]);

  const handleQualityCheckRecorded = useCallback(
    ({ runId, check }: { runId: string; check: QualityCheck }) => {
      if (runId === selectedRunId) {
        setChecks((prev) => [check, ...prev.filter((c) => c.id !== check.id)]);
        void api.getFirstPieceStatus(runId).then(setFirstPieceStatus).catch(console.error);
        void api.getCpkAnalytics({ runId, productId: targetProductId }).then(setCpkData).catch(console.error);
      }
    },
    [selectedRunId, targetProductId],
  );

  const handleFirstPieceStatusChanged = useCallback(
    (statusData: FirstPieceReleaseStatus & { runId?: string }) => {
      if (statusData.runId === selectedRunId || !statusData.runId) {
        setFirstPieceStatus(statusData);
      }
    },
    [selectedRunId],
  );

  const handleProductionRunReleased = useCallback(
    ({ runId }: { runId: string }) => {
      if (runId === selectedRunId) {
        void loadQualityData();
        void onRefreshRuns?.();
      }
    },
    [selectedRunId, loadQualityData, onRefreshRuns],
  );

  const { connected, subscribeModule, unsubscribeModule } = useTelemetrySocket({
    onQualityCheckRecorded: handleQualityCheckRecorded,
    onFirstPieceStatusChanged: handleFirstPieceStatusChanged,
    onProductionRunReleased: handleProductionRunReleased,
  });

  useEffect(() => {
    subscribeModule('quality');
    subscribeModule('production');
    return () => {
      unsubscribeModule('quality');
      unsubscribeModule('production');
    };
  }, [subscribeModule, unsubscribeModule]);

  const activePlan = plans[0];

  const handleOpenModal = () => {
    const initialSamples: Record<string, { measuredValue?: number; isPassed?: boolean }> = {};
    if (activePlan?.items) {
      for (const item of activePlan.items) {
        if (item.measurementType === 'VARIABLE') {
          initialSamples[item.id] = { measuredValue: item.targetValue ? Number(item.targetValue) : 0 };
        } else {
          initialSamples[item.id] = { isPassed: true };
        }
      }
    }
    setSampleValues(initialSamples);
    setCheckNotes('');
    setAutoReleaseRunOnPass(true);
    setIsCheckModalOpen(true);
  };

  const handleReleaseRun = async () => {
    if (!selectedRunId) return;
    setIsReleasingRun(true);
    setFeedbackMessage(null);
    try {
      await api.releaseRunToActive(selectedRunId);
      setFeedbackMessage({
        type: 'success',
        text: 'Production run successfully released to ACTIVE! Serial cycle counting and good parts accumulation enabled.',
      });
      await loadQualityData();
      await onRefreshRuns?.();
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to release run to ACTIVE.',
      });
    } finally {
      setIsReleasingRun(false);
    }
  };

  const handleSubmitCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRunId || !activePlan) return;

    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      const samplesPayload = activePlan.items.map((item) => {
        const val = sampleValues[item.id];
        return {
          planItemId: item.id,
          measuredValue: item.measurementType === 'VARIABLE' ? Number(val?.measuredValue) : undefined,
          isPassed: item.measurementType === 'ATTRIBUTE' ? val?.isPassed : undefined,
        };
      });

      const recordedCheck = await api.recordQualityCheck({
        runId: selectedRunId,
        checkType,
        notes: checkNotes.trim() || undefined,
        samples: samplesPayload,
      });

      let releaseMsg = '';
      if (
        checkType === 'FIRST_PIECE' &&
        autoReleaseRunOnPass &&
        recordedCheck.disposition === 'RELEASED' &&
        selectedRun?.status === 'SETUP'
      ) {
        try {
          await api.releaseRunToActive(selectedRunId);
          await onRefreshRuns?.();
          releaseMsg = ' Machine run automatically released from SETUP to ACTIVE!';
        } catch (releaseErr) {
          console.warn('Auto release warning:', releaseErr);
        }
      }

      setFeedbackMessage({
        type: 'success',
        text: `Inspection check (${checkType.toLowerCase().replace('_', ' ')}) recorded: ${recordedCheck.disposition}.${releaseMsg}`,
      });
      setIsCheckModalOpen(false);
      await loadQualityData();
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to record quality check.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isQuarantined =
    checks.some((c) => c.checkType === 'FIRST_PIECE' && c.disposition === 'QUARANTINE') &&
    !firstPieceStatus?.isReleased;

  return (
    <div className="space-y-6">
      {/* Page Title & Landmark */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#0B120E24]">
        <div>
          <h1 className="text-xl font-bold text-[#292A2E] tracking-tight">Quality control & first-piece gate</h1>
          <p className="text-sm text-[#505258] mt-0.5">
            Hard first-piece run gating, variable dimension CPK capability analytics, and serial release enforcement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              connected
                ? 'bg-[#EFFFD6] text-[#37471F] border border-[#6A9A23]'
                : 'bg-[#F1F2F4] text-[#505258] border border-[#DCDFE4]'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? 'bg-[#5B7F24] animate-pulse' : 'bg-[#8C8F97]'
              }`}
            />
            {connected ? 'Live Sync' : 'Connecting'}
          </span>
          <button
            type="button"
            onClick={() => void loadQualityData()}
            className="min-h-[32px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] border border-[#0B120E24] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleOpenModal}
            disabled={!selectedRunId || !activePlan}
            className="min-h-[32px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1868DB] hover:bg-[#1558BC] text-white shadow-xs transition-colors disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Record quality check</span>
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

      {/* Run Selector & Machine Meta Bar */}
      <div className="p-4 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="quality-run-select" className="text-xs font-semibold text-[#505258] uppercase tracking-wider shrink-0">
            Active production run:
          </label>
          <select
            id="quality-run-select"
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="min-h-[32px] px-3 py-1 text-sm rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-medium"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.machine?.code ?? 'Machine'} — {r.productionOrder?.orderNumber ?? 'Order'} ({r.productionOrder?.product?.name ?? 'Part'}) [{r.status}]
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
              <span className="text-[#6B6E76]">Status:</span>{' '}
              <span
                className={`font-bold px-2 py-0.5 rounded-[3px] border ${
                  selectedRun.status === 'ACTIVE'
                    ? 'bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]'
                    : selectedRun.status === 'SETUP'
                    ? 'bg-[#FFF5DB] text-[#693200] border-[#E06C00]'
                    : 'bg-[#F1F2F4] text-[#505258] border-[#DCDFE4]'
                }`}
              >
                {selectedRun.status}
              </span>
            </div>
            <div>
              <span className="text-[#6B6E76]">Mold:</span>{' '}
              <span className="font-semibold text-[#292A2E]">{selectedRun.mold?.code ?? selectedRun.moldId}</span>
            </div>
            <div>
              <span className="text-[#6B6E76]">Output:</span>{' '}
              <span className="font-semibold text-[#216E4E]">{selectedRun.goodQuantity}</span> good /{' '}
              <span className="font-semibold text-[#AE2E24]">{selectedRun.rejectQuantity}</span> scrap
            </div>
          </div>
        )}
      </div>

      {/* First-Piece Release Gate Alert Banner */}
      {isQuarantined ? (
        <div className="p-4 rounded-lg border bg-[#FFECEB] border-[#E2483D] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <XCircle className="h-6 w-6 text-[#E2483D] shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#292A2E]">First-piece inspection failed — machine interlocked</span>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-[3px] border bg-[#FFECEB] text-[#5D1F1A] border-[#E2483D]">
                  Quarantine / Interlocked
                </span>
              </div>
              <p className="text-xs text-[#505258] mt-0.5">
                Out-of-tolerance dimensions detected. Machine transition to serial running is BLOCKED by quality interlock. Adjust mold process and re-sample.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setCheckType('FIRST_PIECE');
              handleOpenModal();
            }}
            className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#E2483D] hover:bg-[#C9372C] text-white shadow-xs transition-colors shrink-0"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Re-inspect first-piece</span>
          </button>
        </div>
      ) : selectedRun?.status === 'SETUP' && firstPieceStatus?.isReleased ? (
        <div className="p-4 rounded-lg border bg-[#EFFFD6] border-[#6A9A23] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-[#6A9A23] shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#292A2E]">First-piece verified & approved</span>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-[3px] border bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]">
                  Gated setup ready for release
                </span>
              </div>
              <p className="text-xs text-[#505258] mt-0.5">
                Sample passed all variable and attribute tolerances. Authorize machine to transition from SETUP to ACTIVE serial production.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReleaseRun}
            disabled={isReleasingRun}
            className="min-h-[36px] inline-flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold bg-[#5B7F24] hover:bg-[#4C6B1F] text-white shadow-xs transition-colors shrink-0 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{isReleasingRun ? 'Releasing run...' : 'Release machine to serial production'}</span>
          </button>
        </div>
      ) : selectedRun?.status === 'SETUP' && !firstPieceStatus?.isReleased ? (
        <div className="p-4 rounded-lg border bg-[#FFF5DB] border-[#E06C00] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-[#E06C00] shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#292A2E]">First-piece sign-off gated</span>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-[3px] border bg-[#FFF5DB] text-[#693200] border-[#E06C00]">
                  Gated / In setup
                </span>
              </div>
              <p className="text-xs text-[#505258] mt-0.5">
                Serial production is blocked until an inspector verifies sample dimensions (IATF 16949 / ISO 9001 governance).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setCheckType('FIRST_PIECE');
              handleOpenModal();
            }}
            className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#E06C00] hover:bg-[#C25E00] text-white shadow-xs transition-colors shrink-0"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Perform first-piece sign-off</span>
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-lg border bg-[#EFFFD6] border-[#6A9A23] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#6A9A23] shrink-0" />
            <div>
              <span className="text-sm font-bold text-[#292A2E]">Active serial production authorized</span>
              <span className="text-xs text-[#505258] ml-2">
                First-piece inspection released by {firstPieceStatus?.firstPieceCheck?.inspector?.username ?? 'QC'}. Machine cycle tracking is active.
              </span>
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-[3px] border bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]">
            Serial running
          </span>
        </div>
      )}

      {/* Statistical Process Capability (Cpk) Scorecards Card */}
      <div className="p-5 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#0B120E24]">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-[#1868DB]" />
            <div>
              <h2 className="text-sm font-bold text-[#292A2E]">Statistical process capability (Cp & Cpk)</h2>
              <p className="text-xs text-[#505258]">
                IATF 16949 automotive benchmark capability metrics computed across inspection checks
              </p>
            </div>
          </div>
          {cpkData && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B6E76]">Overall status:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  cpkData.overallStatus === 'CAPABLE'
                    ? 'bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]'
                    : cpkData.overallStatus === 'MARGINAL'
                    ? 'bg-[#FFF5DB] text-[#693200] border-[#E06C00]'
                    : cpkData.overallStatus === 'INCAPABLE'
                    ? 'bg-[#FFECEB] text-[#5D1F1A] border-[#E2483D]'
                    : 'bg-[#F1F2F4] text-[#505258] border-[#DCDFE4]'
                }`}
              >
                {cpkData.overallStatus === 'CAPABLE' ? (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5 text-[#6A9A23]" />
                    <span>Process capable (Cpk ≥ 1.33)</span>
                  </>
                ) : cpkData.overallStatus === 'MARGINAL' ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-[#E06C00]" />
                    <span>Marginally capable (1.00 ≤ Cpk &lt; 1.33)</span>
                  </>
                ) : cpkData.overallStatus === 'INCAPABLE' ? (
                  <>
                    <XCircle className="h-3.5 w-3.5 text-[#E2483D]" />
                    <span>Incapable / high defect risk (Cpk &lt; 1.00)</span>
                  </>
                ) : (
                  <>
                    <Info className="h-3.5 w-3.5 text-[#6B6E76]" />
                    <span>Insufficient samples (N &lt; 2)</span>
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        {cpkData && cpkData.metrics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cpkData.metrics.map((metric: CpkMetric) => (
              <div
                key={metric.planItemId}
                className="p-4 rounded-md bg-[#F8F8F8] border border-[#0B120E24] flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#292A2E] truncate">
                      {metric.parameterName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        metric.status === 'CAPABLE'
                          ? 'bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]'
                          : metric.status === 'MARGINAL'
                          ? 'bg-[#FFF5DB] text-[#693200] border-[#E06C00]'
                          : metric.status === 'INCAPABLE'
                          ? 'bg-[#FFECEB] text-[#5D1F1A] border-[#E2483D]'
                          : 'bg-[#F1F2F4] text-[#505258] border-[#DCDFE4]'
                      }`}
                    >
                      {metric.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-[#6B6E76] mt-0.5">
                    Target: <strong className="text-[#292A2E]">{metric.targetValue ?? '—'}</strong> [
                    {metric.lowerTolerance ?? '—'} to {metric.upperTolerance ?? '—'}]
                  </div>
                </div>

                {/* Big Cpk Metric Display */}
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-xs text-[#6B6E76] block">Process capability</span>
                    <span className="text-2xl font-bold font-mono text-[#292A2E]">
                      {metric.cpk !== null ? metric.cpk.toFixed(2) : '—'}
                    </span>
                    <span className="text-xs text-[#505258] ml-1 font-mono">Cpk</span>
                  </div>
                  <div className="text-right text-xs font-mono text-[#505258] space-y-0.5">
                    <div>Cp: <span className="font-semibold text-[#292A2E]">{metric.cp !== null ? metric.cp.toFixed(2) : '—'}</span></div>
                    <div>μ: <span className="font-semibold text-[#292A2E]">{metric.mean.toFixed(3)}</span></div>
                    <div>σ: <span className="font-semibold text-[#292A2E]">{metric.standardDeviation.toFixed(3)}</span></div>
                    <div>N: <span className="font-semibold text-[#292A2E]">{metric.sampleCount}</span></div>
                  </div>
                </div>

                {/* Tolerance Distribution Visual Gauge */}
                {metric.upperTolerance !== null && metric.lowerTolerance !== null && (
                  <div className="space-y-1 pt-1">
                    <div className="relative h-6 bg-[#FFFFFF] rounded border border-[#0B120E24] overflow-hidden flex items-center px-1">
                      {/* Tolerance spec zone */}
                      <div className="absolute inset-y-1 left-2 right-2 bg-[#EFFFD6]/50 rounded-xs border border-[#6A9A23]/30" />

                      {/* Mean marker indicator */}
                      {(() => {
                        const lsl = metric.lowerTolerance!;
                        const usl = metric.upperTolerance!;
                        const spread = usl - lsl || 1;
                        const pct = Math.max(0, Math.min(100, ((metric.mean - lsl) / spread) * 100));
                        return (
                          <div
                            className="absolute top-0 bottom-0 w-1 bg-[#1868DB] z-10"
                            style={{ left: `${pct}%` }}
                            title={`Mean: ${metric.mean.toFixed(3)}`}
                          />
                        );
                      })()}
                    </div>
                    <div className="flex justify-between text-[10px] text-[#6B6E76] font-mono">
                      <span>LSL: {metric.lowerTolerance}</span>
                      <span>Target: {metric.targetValue}</span>
                      <span>USL: {metric.upperTolerance}</span>
                    </div>
                  </div>
                )}

                {/* Recent Sample Strips */}
                {metric.sampleValues.length > 0 && (
                  <div className="pt-1 border-t border-[#0B120E24] flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[#6B6E76]">Recent:</span>
                    {metric.sampleValues.slice(-6).map((val, idx) => {
                      const inSpec =
                        (metric.lowerTolerance === null || val >= metric.lowerTolerance) &&
                        (metric.upperTolerance === null || val <= metric.upperTolerance);
                      return (
                        <span
                          key={`${metric.planItemId}-sample-${idx}-${val}`}
                          className={`text-[10px] font-mono px-1 py-0.2 rounded border ${
                            inSpec
                              ? 'bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]/50'
                              : 'bg-[#FFECEB] text-[#5D1F1A] border-[#E2483D]/50 font-bold'
                          }`}
                        >
                          {val.toFixed(2)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[#6B6E76]">
            No variable dimensional inspection parameters available for this product.
          </div>
        )}
      </div>

      {/* Grid: Active Inspection Plan & Quality History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Inspection Plan Specification */}
        <div className="p-5 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#0B120E24]">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[#1868DB]" />
              <h2 className="text-sm font-bold text-[#292A2E]">Active inspection plan</h2>
            </div>
            {activePlan && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-[3px] bg-[#E9F2FE] text-[#123263] border border-[#357DE8]">
                v{activePlan.version}
              </span>
            )}
          </div>

          {activePlan ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-[#6B6E76]">Plan name</p>
                <p className="text-sm font-bold text-[#292A2E]">{activePlan.name}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-[#6B6E76]">Target product</p>
                <p className="text-xs font-medium text-[#292A2E]">
                  {activePlan.product?.partNumber} — {activePlan.product?.name}
                </p>
              </div>

              <div className="pt-2">
                <p className="text-xs font-semibold text-[#6B6E76] mb-2">Tolerance parameters ({activePlan.items.length})</p>
                <div className="space-y-2">
                  {activePlan.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-md bg-[#F8F8F8] border border-[#0B120E24] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#292A2E]">{item.sequence}. {item.parameterName}</span>
                        <span className="px-1.5 py-0.2 rounded text-xs bg-[#F1F2F4] text-[#505258] border border-[#DCDFE4]">
                          {item.inspectionStage}
                        </span>
                      </div>
                      {item.measurementType === 'VARIABLE' ? (
                        <div className="text-xs text-[#505258] flex items-center justify-between">
                          <span>Target: <strong className="text-[#292A2E]">{Number(item.targetValue)}</strong></span>
                          <span>Tol: [{Number(item.lowerTolerance)} to {Number(item.upperTolerance)}]</span>
                        </div>
                      ) : (
                        <p className="text-xs text-[#6B6E76]">Visual attribute check (Pass / Fail)</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#6B6E76] py-6 text-center">No inspection plan linked to this product.</p>
          )}
        </div>

        {/* Right Columns: Inspection History Logs */}
        <div className="lg:col-span-2 p-5 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#0B120E24]">
            <h2 className="text-sm font-bold text-[#292A2E]">Run inspection logs ({checks.length})</h2>
            <span className="text-xs text-[#6B6E76]">Ordered by most recent</span>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center text-xs text-[#505258]">
              <RefreshCw className="h-5 w-5 animate-spin text-[#1868DB] mr-2" />
              <span>Loading checks...</span>
            </div>
          ) : checks.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#6B6E76]">
              No quality checks recorded for this production run yet.
            </div>
          ) : (
            <div className="divide-y divide-[#0B120E24]">
              {checks.map((chk) => (
                <div key={chk.id} className="py-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#292A2E]">
                        {chk.checkType.replace('_', ' ')}
                      </span>
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-[3px] border ${
                          chk.disposition === 'RELEASED'
                            ? 'bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]'
                            : chk.disposition === 'QUARANTINE'
                            ? 'bg-[#FFECEB] text-[#5D1F1A] border-[#E2483D]'
                            : 'bg-[#FFF5DB] text-[#693200] border-[#E06C00]'
                        }`}
                      >
                        {chk.disposition}
                      </span>
                    </div>
                    <span className="text-xs text-[#6B6E76]">
                      {new Date(chk.checkedAt).toLocaleTimeString()} by {chk.inspector?.username ?? 'Inspector'}
                    </span>
                  </div>

                  {chk.notes && (
                    <p className="text-xs text-[#505258] italic bg-[#F8F8F8] px-2.5 py-1 rounded border border-[#0B120E24]">
                      Note: {chk.notes}
                    </p>
                  )}

                  {/* Samples Table */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                    {chk.samples.map((s) => (
                      <div
                        key={String(s.id)}
                        className={`p-2 rounded border text-xs flex items-center justify-between ${
                          s.isPassed
                            ? 'bg-[#EFFFD6]/50 border-[#6A9A23]/40 text-[#37471F]'
                            : 'bg-[#FFECEB]/50 border-[#E2483D]/40 text-[#5D1F1A]'
                        }`}
                      >
                        <span className="truncate pr-2 font-medium">{s.planItem?.parameterName ?? 'Parameter'}</span>
                        <div className="flex items-center gap-1 shrink-0 font-bold">
                          {s.measuredValue !== null && s.measuredValue !== undefined ? (
                            <span>{Number(s.measuredValue)}</span>
                          ) : null}
                          {s.isPassed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#6A9A23]" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-[#E2483D]" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Record Check Modal */}
      {isCheckModalOpen && activePlan && (
        <dialog
          open
          className="fixed inset-0 z-50 m-0 h-full w-full max-w-none max-h-none bg-[#050C1F75] backdrop-blur-xs flex items-center justify-center p-4 border-none"
        >
          <div className="max-w-xl w-full bg-[#FFFFFF] rounded-lg border border-[#0B120E24] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#FFFFFF] border-b border-[#0B120E24] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#292A2E]">Record quality inspection</h3>
                <p className="text-xs text-[#505258]">Product: {activePlan.product?.name} ({activePlan.name})</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckModalOpen(false)}
                className="text-[#6B6E76] hover:text-[#292A2E] p-1 rounded-md text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCheck} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label htmlFor="check-type-select" className="block text-xs font-semibold text-[#505258] mb-1">Check type</label>
                <select
                  id="check-type-select"
                  value={checkType}
                  onChange={(e) => setCheckType(e.target.value as 'FIRST_PIECE' | 'HOURLY_PATROL' | 'CONTAINMENT')}
                  className="w-full min-h-[32px] px-3 py-1.5 text-xs rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-medium"
                >
                  <option value="FIRST_PIECE">First-piece sign-off (Pre-production release)</option>
                  <option value="HOURLY_PATROL">Hourly patrol inspection</option>
                  <option value="CONTAINMENT">Containment / Defect verification</option>
                </select>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-[#292A2E] border-b border-[#0B120E24] pb-1">
                  Sample measurements & parameters
                </p>

                {activePlan.items.map((item) => {
                  const currentVal = sampleValues[item.id];
                  const numVal = currentVal?.measuredValue !== undefined ? Number(currentVal.measuredValue) : 0;
                  const isWithin =
                    item.measurementType === 'VARIABLE' && item.lowerTolerance && item.upperTolerance
                      ? numVal >= Number(item.lowerTolerance) && numVal <= Number(item.upperTolerance)
                      : true;
                  const delta =
                    item.measurementType === 'VARIABLE' && item.targetValue
                      ? numVal - Number(item.targetValue)
                      : 0;

                  return (
                    <div key={item.id} className="p-3 rounded-md bg-[#F8F8F8] border border-[#0B120E24] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#292A2E]">{item.sequence}. {item.parameterName}</span>
                        {item.measurementType === 'VARIABLE' && (
                          <span className={`text-xs font-bold px-1.5 py-0.2 rounded border ${
                            isWithin
                              ? 'bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]'
                              : 'bg-[#FFECEB] text-[#5D1F1A] border-[#E2483D]'
                          }`}>
                            {isWithin ? 'In spec' : 'Out of spec'}
                          </span>
                        )}
                      </div>

                      {item.measurementType === 'VARIABLE' ? (
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <input
                              id={`sample-val-${item.id}`}
                              type="number"
                              step="0.001"
                              value={currentVal?.measuredValue ?? ''}
                              onChange={(e) =>
                                setSampleValues((prev) => ({
                                  ...prev,
                                  [item.id]: { measuredValue: parseFloat(e.target.value) || 0 },
                                }))
                              }
                              className="w-full min-h-[32px] px-3 py-1 text-xs rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden font-medium"
                              placeholder="Enter measured value"
                              required
                            />
                          </div>
                          <span className="text-xs text-[#6B6E76] whitespace-nowrap">
                            Nominal: {Number(item.targetValue)} [{Number(item.lowerTolerance)} - {Number(item.upperTolerance)}]
                            <span className={`ml-1.5 font-mono font-bold ${isWithin ? 'text-[#37471F]' : 'text-[#AE2E24]'}`}>
                              (Δ {delta >= 0 ? `+${delta.toFixed(3)}` : delta.toFixed(3)})
                            </span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 pt-1">
                          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#292A2E] cursor-pointer">
                            <input
                              type="radio"
                              name={`attr-${item.id}`}
                              checked={currentVal?.isPassed === true}
                              onChange={() =>
                                setSampleValues((prev) => ({
                                  ...prev,
                                  [item.id]: { isPassed: true },
                                }))
                              }
                            />
                            <span>Pass (No defects)</span>
                          </label>
                          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#AE2E24] cursor-pointer">
                            <input
                              type="radio"
                              name={`attr-${item.id}`}
                              checked={currentVal?.isPassed === false}
                              onChange={() =>
                                setSampleValues((prev) => ({
                                  ...prev,
                                  [item.id]: { isPassed: false },
                                }))
                              }
                            />
                            <span>Fail (Defect present)</span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {checkType === 'FIRST_PIECE' && selectedRun?.status === 'SETUP' && (
                <div className="p-3 rounded-md bg-[#EFFFD6] border border-[#6A9A23] flex items-center gap-2">
                  <input
                    id="auto-release-checkbox"
                    type="checkbox"
                    checked={autoReleaseRunOnPass}
                    onChange={(e) => setAutoReleaseRunOnPass(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#1868DB] focus:ring-[#4688EC]"
                  />
                  <label htmlFor="auto-release-checkbox" className="text-xs font-medium text-[#37471F] cursor-pointer">
                    Release machine from <strong>SETUP</strong> to <strong>ACTIVE</strong> serial production immediately if all tolerances pass
                  </label>
                </div>
              )}

              <div>
                <label htmlFor="check-notes-textarea" className="block text-xs font-semibold text-[#505258] mb-1">Inspector remarks / notes</label>
                <textarea
                  id="check-notes-textarea"
                  rows={2}
                  value={checkNotes}
                  onChange={(e) => setCheckNotes(e.target.value)}
                  placeholder="Optional observations or tool calibration references..."
                  className="w-full px-3 py-2 text-xs rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#0B120E24]">
                <button
                  type="button"
                  onClick={() => setIsCheckModalOpen(false)}
                  className="min-h-[32px] px-3 py-1.5 rounded-md text-xs font-medium bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] border border-[#0B120E24] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[32px] px-4 py-1.5 rounded-md text-xs font-semibold bg-[#1868DB] hover:bg-[#1558BC] text-white shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Submit check & evaluate'}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
};
