import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ClipboardList,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type { ProductionRun } from '../../types/production.js';
import type {
  InspectionPlan,
  QualityCheck,
  FirstPieceReleaseStatus,
} from '../../types/quality.js';

interface QualityViewProps {
  runs: ProductionRun[];
}

export const QualityView: React.FC<QualityViewProps> = ({ runs }) => {
  const [selectedRunId, setSelectedRunId] = useState<string>(runs[0]?.id ?? '');
  const [plans, setPlans] = useState<InspectionPlan[]>([]);
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [firstPieceStatus, setFirstPieceStatus] = useState<FirstPieceReleaseStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [isCheckModalOpen, setIsCheckModalOpen] = useState<boolean>(false);
  const [checkType, setCheckType] = useState<'FIRST_PIECE' | 'HOURLY_PATROL' | 'CONTAINMENT'>('FIRST_PIECE');
  const [checkNotes, setCheckNotes] = useState<string>('');
  const [sampleValues, setSampleValues] = useState<Record<string, { measuredValue?: number; isPassed?: boolean }>>({});

  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? runs[0];
  const targetProductId = selectedRun?.productionOrder?.productId;

  const loadQualityData = useCallback(async () => {
    if (!selectedRunId) return;
    setIsLoading(true);
    setFeedbackMessage(null);
    try {
      const [plansData, checksData, statusData] = await Promise.all([
        api.getInspectionPlans(targetProductId),
        api.getRunQualityChecks(selectedRunId),
        api.getFirstPieceStatus(selectedRunId),
      ]);
      setPlans(plansData);
      setChecks(checksData);
      setFirstPieceStatus(statusData);
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

  const activePlan = plans[0];

  const handleOpenModal = () => {
    // Reset sample values according to active plan
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
    setIsCheckModalOpen(true);
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

      await api.recordQualityCheck({
        runId: selectedRunId,
        checkType,
        notes: checkNotes.trim() || undefined,
        samples: samplesPayload,
      });

      setFeedbackMessage({
        type: 'success',
        text: `Inspection check (${checkType.toLowerCase().replace('_', ' ')}) recorded successfully.`,
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

  return (
    <div className="space-y-6">
      {/* Page Title & Landmark */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#0B120E24]">
        <div>
          <h1 className="text-xl font-bold text-[#292A2E] tracking-tight">Quality control & first-piece gate</h1>
          <p className="text-sm text-[#505258] mt-0.5">
            Statistical patrol checks, variable tolerance validation, and pre-run sign-off gates.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      {firstPieceStatus && (
        <div
          className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            firstPieceStatus.isReleased
              ? 'bg-[#EFFFD6] border-[#6A9A23]'
              : 'bg-[#FFF5DB] border-[#E06C00]'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            {firstPieceStatus.isReleased ? (
              <ShieldCheck className="h-6 w-6 text-[#6A9A23] shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-[#E06C00] shrink-0 mt-0.5 sm:mt-0" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#292A2E]">
                  {firstPieceStatus.isReleased
                    ? 'First-piece inspection released'
                    : 'First-piece release pending'}
                </span>
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-[3px] border ${
                    firstPieceStatus.isReleased
                      ? 'bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]'
                      : 'bg-[#FFF5DB] text-[#693200] border-[#E06C00]'
                  }`}
                >
                  {firstPieceStatus.isReleased ? 'Released' : 'Gated / In setup'}
                </span>
              </div>
              <p className="text-xs text-[#505258] mt-0.5">
                {firstPieceStatus.isReleased
                  ? `Approved by inspector ${firstPieceStatus.firstPieceCheck?.inspector?.username ?? 'QC'} at ${new Date(
                      firstPieceStatus.firstPieceCheck?.checkedAt ?? '',
                    ).toLocaleString()}. Machine authorized for serial production.`
                  : 'Serial production should not proceed without Quality Inspector dimensional verification.'}
              </p>
            </div>
          </div>

          {!firstPieceStatus.isReleased && (
            <button
              type="button"
              onClick={() => {
                setCheckType('FIRST_PIECE');
                handleOpenModal();
              }}
              className="min-h-[32px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#E06C00] hover:bg-[#C25E00] text-white shadow-xs transition-colors shrink-0"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Perform first-piece sign-off</span>
            </button>
          )}
        </div>
      )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050C1F75] backdrop-blur-xs">
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
        </div>
      )}
    </div>
  );
};
