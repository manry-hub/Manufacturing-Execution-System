import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  CheckSquare,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type { MoldPmSchedule, MaintenanceWorkOrder } from '../../types/maintenance.js';
import type { Mold } from '../../types/production.js';

interface MaintenanceViewProps {
  // Can take molds or fetch them
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = () => {
  const [molds, setMolds] = useState<Mold[]>([]);
  const [schedules, setSchedules] = useState<Record<string, MoldPmSchedule[]>>({});
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Complete WO Modal state
  const [completingWo, setCompletingWo] = useState<MaintenanceWorkOrder | null>(null);
  const [techNotes, setTechNotes] = useState<string>('');
  const [isSubmittingComplete, setIsSubmittingComplete] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFeedbackMessage(null);
    try {
      const [moldsData, woData] = await Promise.all([
        api.getMolds(),
        api.getMaintenanceWorkOrders(),
      ]);
      setMolds(moldsData);
      setWorkOrders(woData);

      // Fetch PM schedules for each mold
      const scheduleMap: Record<string, MoldPmSchedule[]> = {};
      for (const m of moldsData) {
        try {
          const scheds = await api.getMoldPmSchedules(m.id);
          scheduleMap[m.id] = scheds;
        } catch {
          scheduleMap[m.id] = [];
        }
      }
      setSchedules(scheduleMap);
    } catch (err) {
      console.error('Failed to load maintenance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingWo) return;

    setIsSubmittingComplete(true);
    setFeedbackMessage(null);
    try {
      await api.updateWorkOrderStatus(completingWo.id, {
        status: 'COMPLETED',
        checklistPayload: techNotes ? JSON.stringify({ notes: techNotes, completedAt: new Date().toISOString() }) : undefined,
      });

      setFeedbackMessage({
        type: 'success',
        text: `Work order "${completingWo.orderNumber}" marked COMPLETED. Mold stroke service counter reset.`,
      });
      setCompletingWo(null);
      setTechNotes('');
      await loadData();
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to complete work order.',
      });
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  const filteredWorkOrders = workOrders.filter((wo) => {
    if (statusFilter === 'ALL') return true;
    return wo.status === statusFilter;
  });

  const openWorkOrdersCount = workOrders.filter((wo) => wo.status === 'OPEN' || wo.status === 'IN_PROGRESS').length;

  return (
    <div className="space-y-6">
      {/* Page Title & Landmark */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#0B120E24]">
        <div>
          <h1 className="text-xl font-bold text-[#292A2E] tracking-tight">Tooling health & mold preventive maintenance</h1>
          <p className="text-sm text-[#505258] mt-0.5">
            Automatic stroke counter accumulation, PM interval thresholds, and tooling repair work orders.
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

      {/* Summary Alert Banner */}
      {openWorkOrdersCount > 0 && (
        <div className="p-4 rounded-lg bg-[#FFF5DB] border border-[#E06C00] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-[#E06C00] shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#693200]">
                {openWorkOrdersCount} active maintenance work order{openWorkOrdersCount > 1 ? 's' : ''} require attention
              </p>
              <p className="text-xs text-[#505258]">
                Preventive maintenance thresholds reached based on live injection mold stroke accumulation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('OPEN')}
            className="min-h-[32px] px-3 py-1 text-xs font-semibold rounded bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#693200] border border-[#E06C00] transition-colors shrink-0"
          >
            View pending PM
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-[#505258] space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin text-[#1868DB]" />
          <p className="text-xs font-medium">Loading tooling PM metrics and work orders...</p>
        </div>
      ) : (
        <>
          {/* Section 1: Mold Health Scorecards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-[#1868DB]" />
            <h2 className="text-sm font-bold text-[#292A2E] uppercase tracking-wider">
              Mold tooling health & stroke intervals
            </h2>
          </div>
          <span className="text-xs text-[#6B6E76]">Auto-accumulated from telemetry cycle events</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {molds.map((mold) => {
            const moldSchedules = schedules[mold.id] ?? [];
            const totalShots = Number(mold.totalShots ?? 0);

            return (
              <div
                key={mold.id}
                className="p-5 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#1868DB] uppercase tracking-wider">
                      {mold.code}
                    </span>
                    <h3 className="text-sm font-bold text-[#292A2E]">{mold.name}</h3>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-[3px] bg-[#F1F2F4] text-[#505258] border border-[#DCDFE4]">
                    {mold.cavityCount} cavities
                  </span>
                </div>

                <div className="p-3 rounded-md bg-[#F8F8F8] border border-[#0B120E24] flex items-center justify-between">
                  <span className="text-xs text-[#505258]">Cumulative shots:</span>
                  <span className="text-base font-bold text-[#292A2E]">{totalShots.toLocaleString()}</span>
                </div>

                {/* Schedules list */}
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-semibold text-[#6B6E76]">Preventive maintenance intervals:</p>
                  {moldSchedules.length === 0 ? (
                    <p className="text-xs text-[#6B6E76] italic">No active PM schedules defined.</p>
                  ) : (
                    moldSchedules.map((s) => {
                      const interval = Number(s.intervalShots);
                      const lastServiced = Number(s.lastServicedShot);
                      const currentShotsInCycle = Math.max(0, totalShots - lastServiced);
                      const pct = interval > 0 ? Math.min(100, Math.round((currentShotsInCycle / interval) * 100)) : 0;
                      const isOverdue = currentShotsInCycle >= interval;

                      return (
                        <div key={s.id} className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#292A2E]">
                              {s.pmLevel.replace('LEVEL_', 'L').replace('_', ' ')}
                            </span>
                            <span
                              className={`text-xs font-bold px-1.5 py-0.2 rounded border ${
                                isOverdue
                                  ? 'bg-[#FFECEB] text-[#5D1F1A] border-[#E2483D]'
                                  : pct > 80
                                  ? 'bg-[#FFF5DB] text-[#693200] border-[#E06C00]'
                                  : 'bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]'
                              }`}
                            >
                              {pct}% ({currentShotsInCycle.toLocaleString()} / {interval.toLocaleString()})
                            </span>
                          </div>
                          <div className="w-full bg-[#F1F2F4] rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOverdue ? 'bg-[#E2483D]' : pct > 80 ? 'bg-[#E06C00]' : 'bg-[#22A06B]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Maintenance Work Orders Table */}
      <div className="p-5 rounded-lg bg-[#FFFFFF] border border-[#0B120E24] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#0B120E24]">
          <div>
            <h2 className="text-sm font-bold text-[#292A2E]">Maintenance work orders ({workOrders.length})</h2>
            <p className="text-xs text-[#505258]">Tooling PM orders generated from shot threshold rules</p>
          </div>

          {/* Status Filter Chips */}
          <div className="inline-flex rounded-md border border-[#0B120E24] p-0.5 bg-[#F8F8F8]">
            {['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`min-h-[28px] px-3 py-1 text-xs font-semibold rounded transition-colors ${
                  statusFilter === st
                    ? 'bg-[#FFFFFF] text-[#1868DB] shadow-xs'
                    : 'text-[#505258] hover:text-[#292A2E]'
                }`}
              >
                {st === 'ALL' ? 'All' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#0B120E24] text-xs">
            <thead>
              <tr className="text-left font-semibold text-[#505258] bg-[#F8F8F8]">
                <th className="py-2.5 px-3">Order number</th>
                <th className="py-2.5 px-3">Work type</th>
                <th className="py-2.5 px-3">Equipment / Mold</th>
                <th className="py-2.5 px-3">Trigger shots</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Technician</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0B120E24] text-[#292A2E]">
              {filteredWorkOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#6B6E76]">
                    No maintenance work orders found matching filter.
                  </td>
                </tr>
              ) : (
                filteredWorkOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-[#F8F8F8]/50">
                    <td className="py-2.5 px-3 font-bold text-[#1868DB]">{wo.orderNumber}</td>
                    <td className="py-2.5 px-3 font-medium">
                      <span className="px-1.5 py-0.5 rounded text-xs bg-[#E9F2FE] text-[#123263] border border-[#8FB8F6]">
                        {wo.workType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {wo.mold ? (
                        <span className="font-semibold">{wo.mold.code}</span>
                      ) : wo.machine ? (
                        <span className="font-semibold">{wo.machine.code}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[#505258]">
                      {wo.triggerShots ? Number(wo.triggerShots).toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-[3px] border ${
                          wo.status === 'COMPLETED'
                            ? 'bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]'
                            : wo.status === 'IN_PROGRESS'
                            ? 'bg-[#E9F2FE] text-[#123263] border-[#357DE8]'
                            : 'bg-[#FFF5DB] text-[#693200] border-[#E06C00]'
                        }`}
                      >
                        {wo.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#505258]">
                      {wo.assignedTech?.username ?? 'Unassigned'}
                    </td>
                    <td className="py-2.5 px-3 text-[#6B6E76]">
                      {new Date(wo.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {wo.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => setCompletingWo(wo)}
                          className="min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#1868DB] hover:bg-[#E9F2FE] rounded-md transition-colors"
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                          <span>Sign off & complete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Complete WO Modal */}
      {completingWo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050C1F75] backdrop-blur-xs">
          <div className="max-w-md w-full bg-[#FFFFFF] rounded-lg border border-[#0B120E24] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#FFFFFF] border-b border-[#0B120E24] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#292A2E]">Sign off maintenance work order</h3>
                <p className="text-xs text-[#505258]">Order: {completingWo.orderNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setCompletingWo(null)}
                className="text-[#6B6E76] hover:text-[#292A2E] p-1 rounded-md text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCompleteOrder} className="p-5 space-y-4">
              <div className="p-3 rounded-md bg-[#EFFFD6] border border-[#6A9A23] text-xs text-[#37471F] space-y-1">
                <p className="font-bold">Service counter reset confirmation:</p>
                <p>
                  Completing this work order will record the service timestamp and reset the mold interval counter to current shots.
                </p>
              </div>

              <div>
                <label htmlFor="tech-service-notes" className="block text-xs font-semibold text-[#505258] mb-1">
                  Technician service notes & checklist
                </label>
                <textarea
                  id="tech-service-notes"
                  rows={3}
                  value={techNotes}
                  onChange={(e) => setTechNotes(e.target.value)}
                  placeholder="e.g. Cavities cleaned, vents purged, parting lines checked, lubricant applied..."
                  className="w-full px-3 py-2 text-xs rounded-md bg-[#FFFFFF] border border-[#8C8F97] focus:border-[#4688EC] text-[#292A2E] outline-hidden"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#0B120E24]">
                <button
                  type="button"
                  onClick={() => setCompletingWo(null)}
                  className="min-h-[32px] px-3 py-1.5 rounded-md text-xs font-medium bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] border border-[#0B120E24] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingComplete}
                  className="min-h-[32px] px-4 py-1.5 rounded-md text-xs font-semibold bg-[#22A06B] hover:bg-[#1E8E5F] text-white shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmittingComplete ? 'Saving...' : 'Confirm completion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
