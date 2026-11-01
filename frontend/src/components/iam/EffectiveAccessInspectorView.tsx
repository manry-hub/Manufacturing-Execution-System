import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type {
  ScopeNode,
  EffectiveAccessResponse,
  CanCheckResponse,
  IamPermission,
} from '../../types/iam.js';
import type { ManagedUser } from '../../types/user-admin.js';

export const EffectiveAccessInspectorView: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [scopeNodes, setScopeNodes] = useState<ScopeNode[]>([]);
  const [catalogPermissions, setCatalogPermissions] = useState<IamPermission[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');

  const [effectiveAccess, setEffectiveAccess] = useState<EffectiveAccessResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // can() Debugger state
  const [testPermission, setTestPermission] = useState<string>('workorder:start');
  const [evalResult, setEvalResult] = useState<CanCheckResponse | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [fetchedUsers, fetchedTree, fetchedPerms] = await Promise.all([
          api.getManagedUsers(),
          api.getScopeTree(false),
          api.getIamPermissions(),
        ]);
        setUsers(fetchedUsers);
        setCatalogPermissions(fetchedPerms);

        const flatNodes: ScopeNode[] = [];
        const traverse = (nodes: ScopeNode[]) => {
          nodes.forEach((n) => {
            flatNodes.push(n);
            if (n.children) traverse(n.children);
          });
        };
        traverse(fetchedTree);
        setScopeNodes(flatNodes);

        if (fetchedUsers.length > 0) setSelectedUserId(fetchedUsers[0].id);
        if (flatNodes.length > 0) setSelectedNodeId(flatNodes[0].id);
      } catch (err: any) {
        setError(err?.message || 'Failed to initialize inspector');
      }
    };
    void init();
  }, []);

  const handleInspect = async () => {
    if (!selectedUserId || !selectedNodeId) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.getEffectiveAccess(selectedUserId, selectedNodeId);
      setEffectiveAccess(res);
      setEvalResult(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to inspect effective access');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvaluateCan = async () => {
    if (!selectedUserId || !selectedNodeId || !testPermission) return;
    try {
      setIsEvaluating(true);
      const res = await api.checkIamPermission({
        userId: selectedUserId,
        permission: testPermission,
        nodeId: selectedNodeId,
      });
      setEvalResult(res);
    } catch (err: any) {
      setError(err?.message || 'Evaluation request failed');
    } finally {
      setIsEvaluating(false);
    }
  };

  const selectedUserObj = users.find((u) => u.id === selectedUserId);

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs space-y-5">
      {/* Header controls */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-[#DEEBFF] text-[#1868DB] rounded-md">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <h2 className="text-base font-bold text-[#292A2E]">
            Effective Access Inspector & Authorization Debugger
          </h2>
        </div>
        <p className="text-xs text-[#505258] mt-1">
          Simulate and audit real-time downward permission inheritance for any user across any node in the enterprise hierarchy.
        </p>
      </div>

      {/* Target Selection Bar */}
      <div className="p-4 bg-[#FAFBFC] border border-[#0B120E15] rounded-md grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-5">
          <label className="block text-xs font-semibold text-[#505258] mb-1">
            Principal User
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-[#0B120E24] rounded-md focus:outline-hidden focus:border-[#1868DB]"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username} ({u.email})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-5">
          <label className="block text-xs font-semibold text-[#505258] mb-1">
            Target Scope Node
          </label>
          <select
            value={selectedNodeId}
            onChange={(e) => setSelectedNodeId(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-[#0B120E24] rounded-md focus:outline-hidden focus:border-[#1868DB] font-mono text-[11px]"
          >
            {scopeNodes.map((n) => (
              <option key={n.id} value={n.id}>
                [{n.type}] {n.path}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <button
            onClick={() => void handleInspect()}
            disabled={isLoading}
            className="w-full px-3.5 py-1.5 bg-[#1868DB] hover:bg-[#0747A6] disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5"
          >
            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Inspect Access
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FFEBE6] border border-[#FF8F73] text-[#BF2600] rounded-md text-xs">
          {error}
        </div>
      )}

      {/* Main Results Grid */}
      {effectiveAccess && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1">
          {/* Left: Matching Assignments & Live Debugger */}
          <div className="md:col-span-5 space-y-4">
            {/* Matching Assignments */}
            <div className="border border-[#0B120E15] rounded-md p-3.5 bg-[#FAFBFC] space-y-2">
              <span className="text-xs font-bold text-[#505258] uppercase tracking-wider block">
                Matching Active Assignments ({effectiveAccess.matchingAssignments.length})
              </span>
              <p className="text-[11px] text-[#6B778C]">
                Assignments whose scope path is a segment prefix of the target node path.
              </p>

              {effectiveAccess.matchingAssignments.length === 0 ? (
                <div className="p-3 bg-[#FFFFFF] border border-[#0B120E15] rounded text-xs text-[#505258] text-center">
                  No active assignments cover this scope node. Access defaults to <strong>DENY</strong>.
                </div>
              ) : (
                <div className="space-y-2">
                  {effectiveAccess.matchingAssignments.map((asgn) => (
                    <div
                      key={asgn.id}
                      className="p-2.5 bg-[#FFFFFF] border border-[#0B120E15] rounded-md shadow-2xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#1868DB]">{asgn.roleName}</span>
                        <span className="text-[10px] text-[#00875A] font-semibold bg-[#E3FCEF] px-1.5 py-0.2 rounded">
                          Active
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[#505258]">{asgn.scopeNodePath}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live can() Debugger */}
            <div className="border border-[#0B120E15] rounded-md p-3.5 bg-[#FFFFFF] space-y-3">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-[#1868DB]" />
                <span className="text-xs font-bold text-[#292A2E]">
                  Live can(user, permission, node) Test
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#505258] mb-1">
                  Test Permission Code
                </label>
                <div className="flex gap-2">
                  <select
                    value={testPermission}
                    onChange={(e) => setTestPermission(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-[#0B120E24] rounded-md font-mono"
                  >
                    {catalogPermissions.map((p) => (
                      <option key={p.id} value={p.code}>
                        {p.code} ({p.module})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => void handleEvaluateCan()}
                    disabled={isEvaluating}
                    className="px-3 py-1.5 bg-[#292A2E] hover:bg-[#172B4D] text-white text-xs rounded-md font-semibold"
                  >
                    Test
                  </button>
                </div>
              </div>

              {evalResult && (
                <div
                  className={`p-3 rounded-md border text-xs space-y-1 ${
                    evalResult.allowed
                      ? 'bg-[#E3FCEF] border-[#57D9A3] text-[#006644]'
                      : 'bg-[#FFEBE6] border-[#FF8F73] text-[#BF2600]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {evalResult.allowed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#00875A]" />
                        <span>ALLOW — Access Granted</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-[#DE350B]" />
                        <span>DENY — Access Denied</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px]">{evalResult.reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Effective Permissions Union */}
          <div className="md:col-span-7 border border-[#0B120E15] rounded-md p-4 bg-[#FFFFFF] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#0B120E15]">
              <div>
                <span className="text-xs font-bold text-[#505258] uppercase tracking-wider block">
                  Union of Effective Permissions ({effectiveAccess.permissions.length})
                </span>
                <span className="text-[11px] text-[#6B778C]">
                  Cumulative permissions active for @{selectedUserObj?.username} on {effectiveAccess.targetNodePath}
                </span>
              </div>
            </div>

            {effectiveAccess.permissions.length === 0 ? (
              <div className="text-center py-12 text-[#505258] text-xs">
                No effective permissions resolved at this scope.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {effectiveAccess.permissions.map((p) => (
                  <div
                    key={p.code}
                    className="p-2.5 rounded-md border border-[#0B120E15] bg-[#FAFBFC] flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[#292A2E]">{p.code}</span>
                        {p.isCritical && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FFEBE6] text-[#DE350B]">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            CRITICAL
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#505258] mt-0.5">{p.description}</p>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[10px] text-[#6B778C]">Granted via:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5 justify-end">
                        {p.grantedByRoles.map((roleName) => (
                          <span
                            key={roleName}
                            className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[#DEEBFF] text-[#0747A6]"
                          >
                            {roleName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
