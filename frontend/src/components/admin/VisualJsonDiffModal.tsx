import React, { useState } from 'react';
import type { AuditLogEntry } from '../../types/user-admin.js';
import { X, Plus, Minus, RefreshCw, FileText, Split, AlignJustify } from 'lucide-react';

interface VisualJsonDiffModalProps {
  entry: AuditLogEntry | null;
  onClose: () => void;
}

export const VisualJsonDiffModal: React.FC<VisualJsonDiffModalProps> = ({ entry, onClose }) => {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');

  if (!entry) return null;

  const oldVals: Record<string, unknown> = entry.oldValues ?? {};
  const newVals: Record<string, unknown> = entry.newValues ?? {};

  // Extract all unique keys
  const allKeys = Array.from(new Set([...Object.keys(oldVals), ...Object.keys(newVals)]));

  const getDiffStatus = (key: string): 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED' => {
    const hasOld = key in oldVals;
    const hasNew = key in newVals;

    if (!hasOld && hasNew) return 'ADDED';
    if (hasOld && !hasNew) return 'REMOVED';

    const oldStr = JSON.stringify(oldVals[key]);
    const newStr = JSON.stringify(newVals[key]);
    if (oldStr !== newStr) return 'MODIFIED';

    return 'UNCHANGED';
  };

  const formatVal = (val: unknown): string => {
    if (val === undefined) return '<undefined>';
    if (val === null) return 'null';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#0B120E24] flex items-center justify-between bg-[#F4F5F7]">
          <div className="flex items-center gap-3">
            <span className="p-1.5 bg-[#DEEBFF] text-[#1558BC] rounded-md">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#292A2E]">
                  Audit Log Mutation Diff #{entry.id}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-[#1868DB] text-[#FFFFFF]">
                  {entry.action}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-[#EBECF0] text-[#505258]">
                  {entry.entityType} ({entry.entityId})
                </span>
              </div>
              <div className="text-[11px] text-[#505258] mt-0.5">
                Actor: <strong className="text-[#292A2E]">{entry.username}</strong> • Recorded:{' '}
                {new Date(entry.createdAt).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#FFFFFF] border border-[#0B120E24] rounded-md p-0.5 text-xs">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-semibold ${
                  viewMode === 'side-by-side'
                    ? 'bg-[#1868DB] text-[#FFFFFF]'
                    : 'text-[#505258] hover:text-[#292A2E]'
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                <span>Side-by-Side</span>
              </button>
              <button
                onClick={() => setViewMode('unified')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-semibold ${
                  viewMode === 'unified'
                    ? 'bg-[#1868DB] text-[#FFFFFF]'
                    : 'text-[#505258] hover:text-[#292A2E]'
                }`}
              >
                <AlignJustify className="w-3.5 h-3.5" />
                <span>Unified</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-[#505258] hover:bg-[#EBECF0] hover:text-[#292A2E]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="px-5 py-2.5 bg-[#FFFFFF] border-b border-[#0B120E24] flex items-center gap-4 text-[11px] font-medium text-[#505258]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#E3FCEF] border border-[#7EE2B8] inline-block" />
            <span className="text-[#216E4E]">Added Property</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#FFF0B3] border border-[#FBC828] inline-block" />
            <span className="text-[#9E4C00]">Modified Value</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#FFEBE6] border border-[#FD9891] inline-block" />
            <span className="text-[#AE2E24]">Deleted Property</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#F4F5F7] border border-[#0B120E24] inline-block" />
            <span className="text-[#505258]">Unchanged</span>
          </span>
        </div>

        {/* Diff Content Body */}
        <div className="p-5 overflow-y-auto flex-1 font-mono text-xs">
          {allKeys.length === 0 ? (
            <div className="p-8 text-center text-[#505258]">
              No structured payload changes recorded for this operation.
            </div>
          ) : viewMode === 'side-by-side' ? (
            /* Side-by-Side View */
            <div className="grid grid-cols-2 gap-4">
              {/* Old Values Column */}
              <div>
                <div className="text-[11px] font-bold text-[#AE2E24] mb-2 uppercase tracking-wide flex items-center gap-1">
                  <Minus className="w-3.5 h-3.5" />
                  <span>Previous State (Before Mutation)</span>
                </div>
                <div className="space-y-2">
                  {allKeys.map((key) => {
                    const status = getDiffStatus(key);
                    const val = oldVals[key];
                    if (status === 'ADDED') return null;

                    const bgCls =
                      status === 'REMOVED'
                        ? 'bg-[#FFEBE6] border-[#FD9891] text-[#5D1F1A]'
                        : status === 'MODIFIED'
                        ? 'bg-[#FFF0B3] border-[#FBC828] text-[#693200]'
                        : 'bg-[#F4F5F7] border-[#0B120E24] text-[#292A2E]';

                    return (
                      <div key={key} className={`p-2.5 rounded-sm border ${bgCls}`}>
                        <div className="font-bold text-[11px] text-[#505258] mb-0.5">{key}:</div>
                        <div className="whitespace-pre-wrap break-all">{formatVal(val)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* New Values Column */}
              <div>
                <div className="text-[11px] font-bold text-[#216E4E] mb-2 uppercase tracking-wide flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>New State (After Mutation)</span>
                </div>
                <div className="space-y-2">
                  {allKeys.map((key) => {
                    const status = getDiffStatus(key);
                    const val = newVals[key];
                    if (status === 'REMOVED') return null;

                    const bgCls =
                      status === 'ADDED'
                        ? 'bg-[#E3FCEF] border-[#7EE2B8] text-[#164B35]'
                        : status === 'MODIFIED'
                        ? 'bg-[#FFF0B3] border-[#FBC828] text-[#693200]'
                        : 'bg-[#F4F5F7] border-[#0B120E24] text-[#292A2E]';

                    return (
                      <div key={key} className={`p-2.5 rounded-sm border ${bgCls}`}>
                        <div className="font-bold text-[11px] text-[#505258] mb-0.5">{key}:</div>
                        <div className="whitespace-pre-wrap break-all">{formatVal(val)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Unified View */
            <div className="space-y-2.5">
              {allKeys.map((key) => {
                const status = getDiffStatus(key);
                const oldV = oldVals[key];
                const newV = newVals[key];

                if (status === 'ADDED') {
                  return (
                    <div
                      key={key}
                      className="p-3 rounded-sm border bg-[#E3FCEF] border-[#7EE2B8] text-[#164B35]"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[11px]">
                        <Plus className="w-3.5 h-3.5" />
                        <span>{key} [ADDED]</span>
                      </div>
                      <div className="mt-1 whitespace-pre-wrap break-all font-mono">
                        {formatVal(newV)}
                      </div>
                    </div>
                  );
                }

                if (status === 'REMOVED') {
                  return (
                    <div
                      key={key}
                      className="p-3 rounded-sm border bg-[#FFEBE6] border-[#FD9891] text-[#5D1F1A]"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[11px]">
                        <Minus className="w-3.5 h-3.5" />
                        <span>{key} [REMOVED]</span>
                      </div>
                      <div className="mt-1 whitespace-pre-wrap break-all font-mono">
                        {formatVal(oldV)}
                      </div>
                    </div>
                  );
                }

                if (status === 'MODIFIED') {
                  return (
                    <div
                      key={key}
                      className="p-3 rounded-sm border bg-[#FFF0B3] border-[#FBC828] text-[#693200]"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-[#9E4C00]">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{key} [MODIFIED]</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-[#FFFFFF]/70 p-2 rounded-xs border border-[#FBC828]/60">
                          <span className="text-[10px] text-[#AE2E24] font-bold block mb-0.5">
                            Before:
                          </span>
                          <span className="whitespace-pre-wrap break-all">{formatVal(oldV)}</span>
                        </div>
                        <div className="bg-[#FFFFFF]/70 p-2 rounded-xs border border-[#FBC828]/60">
                          <span className="text-[10px] text-[#216E4E] font-bold block mb-0.5">
                            After:
                          </span>
                          <span className="whitespace-pre-wrap break-all">{formatVal(newV)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={key}
                    className="p-2.5 rounded-sm border bg-[#F4F5F7] border-[#0B120E24] text-[#505258]"
                  >
                    <span className="font-bold text-[11px] text-[#292A2E]">{key}: </span>
                    <span className="whitespace-pre-wrap break-all">{formatVal(newV)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#F4F5F7] border-t border-[#0B120E24] flex items-center justify-between text-xs text-[#505258]">
          <span>Audit records are tamper-proof and immutable in MS SQL Server.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#FFFFFF] border border-[#0B120E24] text-[#292A2E] font-semibold hover:bg-[#EBECF0] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
