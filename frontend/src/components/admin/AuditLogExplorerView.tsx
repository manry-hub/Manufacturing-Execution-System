import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.js';
import type { AuditLogEntry, AuditStats, AuditFilterParams } from '../../types/user-admin.js';
import { VisualJsonDiffModal } from './VisualJsonDiffModal.js';
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export const AuditLogExplorerView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageLimit, setPageLimit] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Diff Modal State
  const [selectedLogForDiff, setSelectedLogForDiff] = useState<AuditLogEntry | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: AuditFilterParams = {
        page: currentPage,
        limit: pageLimit,
        search: search || undefined,
        entityType: selectedEntity || undefined,
        action: selectedAction || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      };

      const [logsRes, statsRes, entitiesRes, actionsRes] = await Promise.all([
        api.getAuditLogs(params),
        api.getAuditStats(),
        api.getAuditEntityTypes(),
        api.getAuditActions(),
      ]);

      setLogs(logsRes.logs);
      setTotalPages(logsRes.totalPages);
      setTotalRecords(logsRes.total);
      setStats(statsRes);
      setEntityTypes(entitiesRes);
      setActions(actionsRes);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err instanceof Error ? err.message : 'Error retrieving security audit records');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageLimit, search, selectedEntity, selectedAction, startDate, endDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleClearFilters = () => {
    setSearch('');
    setSelectedEntity('');
    setSelectedAction('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('RELEASE')) {
      return 'bg-[#E3FCEF] text-[#216E4E] border-[#7EE2B8]';
    }
    if (action.includes('DELETE') || action.includes('FAULT') || action.includes('RESET')) {
      return 'bg-[#FFEBE6] text-[#AE2E24] border-[#FD9891]';
    }
    if (action.includes('UPDATE') || action.includes('CHANGE')) {
      return 'bg-[#FFF0B3] text-[#9E4C00] border-[#FBC828]';
    }
    return 'bg-[#DEEBFF] text-[#1558BC] border-[#B3D4FF]';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Total Audit Mutations
          </div>
          <div className="text-3xl font-bold font-mono text-[#292A2E] mt-1">
            {stats?.totalMutations ?? totalRecords}
          </div>
          <div className="text-[11px] text-[#505258] mt-1">Immutable change trail records</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Today's Mutations
          </div>
          <div className="text-3xl font-bold font-mono text-[#1558BC] mt-1">
            {stats?.todayMutations ?? 0}
          </div>
          <div className="text-[11px] text-[#505258] mt-1">Operations executed in last 24h</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Most Mutated Entity
          </div>
          <div className="text-xl font-bold text-[#292A2E] mt-1 truncate">
            {stats?.entityBreakdown?.[0]?.entityType ?? 'None'}
          </div>
          <div className="text-[11px] text-[#505258] mt-1">
            {stats?.entityBreakdown?.[0]?.count ?? 0} historical mutations logged
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Top Active Actor
          </div>
          <div className="text-xl font-bold text-[#292A2E] mt-1 truncate">
            {stats?.topActors?.[0]?.username ?? 'System'}
          </div>
          <div className="text-[11px] text-[#505258] mt-1">
            {stats?.topActors?.[0]?.count ?? 0} recorded transactions
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-[#FFEBE6] border border-[#FF8F73] text-[#AE2A19] rounded-md text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Filter & Table Card */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg shadow-xs overflow-hidden">
        {/* Advanced Filters Toolbar */}
        <div className="p-4 border-b border-[#0B120E24] space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px] flex-1">
              <Search className="w-4 h-4 text-[#505258] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search action, entity ID, or actor..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#FFFFFF] border border-[#0B120E24] rounded-md text-xs text-[#292A2E] placeholder-[#6B6E76] focus:outline-none focus:ring-2 focus:ring-[#1868DB]"
              />
            </div>

            {/* Entity Type Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <label htmlFor="audit-entity-select" className="text-[#505258] font-semibold">Entity:</label>
              <select
                id="audit-entity-select"
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#FFFFFF] border border-[#0B120E24] rounded-md px-2.5 py-1.5 text-xs text-[#292A2E] focus:outline-none focus:ring-2 focus:ring-[#1868DB]"
              >
                <option value="">All Entities ({entityTypes.length})</option>
                {entityTypes.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <label htmlFor="audit-action-select" className="text-[#505258] font-semibold">Action:</label>
              <select
                id="audit-action-select"
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#FFFFFF] border border-[#0B120E24] rounded-md px-2.5 py-1.5 text-xs text-[#292A2E] focus:outline-none focus:ring-2 focus:ring-[#1868DB]"
              >
                <option value="">All Actions ({actions.length})</option>
                {actions.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-1.5 text-xs">
              <label htmlFor="audit-start-date" className="text-[#505258] font-semibold">From:</label>
              <input
                id="audit-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#FFFFFF] border border-[#0B120E24] rounded-md px-2 py-1 text-xs text-[#292A2E]"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <label htmlFor="audit-end-date" className="text-[#505258] font-semibold">To:</label>
              <input
                id="audit-end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#FFFFFF] border border-[#0B120E24] rounded-md px-2 py-1 text-xs text-[#292A2E]"
              />
            </div>

            {/* Refresh and Clear */}
            <div className="flex items-center gap-1.5 ml-auto">
              {(search || selectedEntity || selectedAction || startDate || endDate) && (
                <button
                  onClick={handleClearFilters}
                  className="px-2.5 py-1 text-xs font-semibold text-[#AE2E24] hover:bg-[#FFEBE6] rounded-md transition-colors"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => void loadData()}
                disabled={isLoading}
                className="p-1.5 rounded-md border border-[#0B120E24] text-[#505258] hover:bg-[#F4F5F7]"
                title="Refresh logs"
                aria-label="Refresh logs"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F4F5F7] text-[#505258] uppercase font-semibold text-[11px] border-b border-[#0B120E24]">
                <th className="py-2.5 px-4">#ID</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-4">Entity Target</th>
                <th className="py-2.5 px-4">Changes Preview</th>
                <th className="py-2.5 px-4 text-right">Diff Inspector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0B120E24]">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#505258]">
                    Loading audit trail records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#505258]">
                    No audit records found matching active criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-[#F4F5F7]/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#505258]">#{log.id}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#292A2E]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4" aria-label={log.username || 'System'}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#DEEBFF] text-[#1558BC] font-bold text-[10px] flex items-center justify-center shrink-0">
                            {log.username?.substring(0, 2).toUpperCase() || 'SY'}
                          </div>
                          <span className="font-semibold text-[#292A2E]">{log.username}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${getActionBadgeColor(
                            log.action,
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#292A2E]">{log.entityType}</div>
                        <div className="text-[10px] text-[#6B6E76] font-mono truncate max-w-[120px]">
                          {log.entityId}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#505258] font-mono text-[11px] max-w-xs truncate">
                        {log.newValues
                          ? Object.keys(log.newValues).join(', ')
                          : log.oldValues
                          ? 'State purged'
                          : 'No body recorded'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLogForDiff(log);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#DEEBFF] text-[#1558BC] hover:bg-[#B3D4FF] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Diff</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#0B120E24] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#505258]">
          <div className="flex items-center gap-2">
            <span>Showing {logs.length} of {totalRecords} total entries</span>
            <span>•</span>
            <label htmlFor="audit-rows-select">Rows per page:</label>
            <select
              id="audit-rows-select"
              value={pageLimit}
              onChange={(e) => {
                setPageLimit(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#FFFFFF] border border-[#0B120E24] rounded-md px-2 py-0.5 text-xs text-[#292A2E]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-md border border-[#0B120E24] hover:bg-[#F4F5F7] disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <span className="font-mono px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-md border border-[#0B120E24] hover:bg-[#F4F5F7] disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Visual Diff Modal */}
      <VisualJsonDiffModal
        entry={selectedLogForDiff}
        onClose={() => setSelectedLogForDiff(null)}
      />
    </div>
  );
};
