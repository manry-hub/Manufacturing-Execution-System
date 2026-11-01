import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type { AuditLogEntry } from '../../types/user-admin.js';

export const IamAuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.getAuditLogs({
        page,
        limit: 25,
        entityType: entityTypeFilter || undefined,
        action: actionFilter || undefined,
      });
      setLogs(res.logs);
      setTotalCount(res.total);
    } catch (err: any) {
      setError(err?.message || 'Failed to load IAM audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, [page, entityTypeFilter, actionFilter]);

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#DEEBFF] text-[#1868DB] rounded-md">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-[#292A2E]">
              IAM Security Mutation Audit Trail
            </h2>
          </div>
          <p className="text-xs text-[#505258] mt-1">
            Tamper-evident operational audit logs recording all role, assignment, and scope tree mutations with before/after state diffs.
          </p>
        </div>

        <button
          onClick={() => void loadLogs()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#0B120E24] rounded-md text-xs font-semibold text-[#505258] hover:bg-[#F4F5F7] transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-[#FAFBFC] border border-[#0B120E15] rounded-md">
        <select
          value={entityTypeFilter}
          onChange={(e) => {
            setEntityTypeFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 text-xs bg-white border border-[#0B120E24] rounded-md focus:outline-hidden focus:border-[#1868DB] w-full sm:w-auto"
        >
          <option value="">All Entities</option>
          <option value="ScopeNode">ScopeNode</option>
          <option value="Role">Role</option>
          <option value="RoleAssignment">RoleAssignment</option>
          <option value="User">User</option>
        </select>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 text-xs bg-white border border-[#0B120E24] rounded-md focus:outline-hidden focus:border-[#1868DB] w-full sm:w-auto"
        >
          <option value="">All Actions</option>
          <option value="scope_node:create">scope_node:create</option>
          <option value="scope_node:update">scope_node:update</option>
          <option value="scope_node:deactivate">scope_node:deactivate</option>
          <option value="iam:role:create">iam:role:create</option>
          <option value="iam:role:update">iam:role:update</option>
          <option value="iam:role:delete">iam:role:delete</option>
          <option value="iam:assignment:create">iam:assignment:create</option>
          <option value="iam:assignment:revoke">iam:assignment:revoke</option>
        </select>

        <span className="text-xs text-[#6B778C] ml-auto">
          Showing {logs.length} of {totalCount} records
        </span>
      </div>

      {error && (
        <div className="p-3 bg-[#FFEBE6] border border-[#FF8F73] text-[#BF2600] rounded-md text-xs">
          {error}
        </div>
      )}

      {/* Audit Log Entries List */}
      <div className="border border-[#0B120E15] rounded-md overflow-hidden bg-[#FFFFFF]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-[#505258] text-xs">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-[#505258] text-xs">
            No IAM audit log records found for the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-[#0B120E15]">
            {logs.map((log) => {
              const oldVal = log.oldValues ? (typeof log.oldValues === 'string' ? JSON.parse(log.oldValues) : log.oldValues) : null;
              const newVal = log.newValues ? (typeof log.newValues === 'string' ? JSON.parse(log.newValues) : log.newValues) : null;

              return (
                <div key={log.id} className="p-3.5 hover:bg-[#FAFBFC] transition-colors space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#1868DB] bg-[#DEEBFF] px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                      <span className="text-xs font-semibold text-[#292A2E]">
                        Target: {log.entityType} ({log.entityId})
                      </span>
                      {log.scope && (
                        <span className="font-mono text-[11px] text-[#006644] bg-[#E3FCEF] px-1.5 py-0.2 rounded">
                          {log.scope}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#6B778C]">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-xs text-[#505258]">
                    Actor:{' '}
                    <span className="font-semibold text-[#292A2E]">
                      {log.actor || log.username || log.userId || 'system'}
                    </span>
                  </div>

                  {/* Visual Diff if available */}
                  {(oldVal || newVal) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                      {oldVal && (
                        <div className="p-2 bg-[#FFEBE6] border border-[#FF8F73] rounded text-[#BF2600] overflow-x-auto">
                          <span className="font-bold block mb-1">State Before:</span>
                          <pre>{JSON.stringify(oldVal, null, 2)}</pre>
                        </div>
                      )}
                      {newVal && (
                        <div className="p-2 bg-[#E3FCEF] border border-[#57D9A3] rounded text-[#006644] overflow-x-auto">
                          <span className="font-bold block mb-1">State After:</span>
                          <pre>{JSON.stringify(newVal, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 25 && (
        <div className="flex items-center justify-between text-xs text-[#505258] pt-2">
          <span>Page {page}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 border border-[#0B120E24] rounded hover:bg-[#F4F5F7] disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 25 >= totalCount}
              className="px-3 py-1 border border-[#0B120E24] rounded hover:bg-[#F4F5F7] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
