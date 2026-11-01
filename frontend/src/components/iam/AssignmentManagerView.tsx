import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type { IamRoleAssignment, IamRole, ScopeNode } from '../../types/iam.js';
import type { ManagedUser } from '../../types/user-admin.js';

export const AssignmentManagerView: React.FC = () => {
  const [assignments, setAssignments] = useState<IamRoleAssignment[]>([]);
  const [roles, setRoles] = useState<IamRole[]>([]);
  const [scopeNodes, setScopeNodes] = useState<ScopeNode[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchUser, setSearchUser] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('');
  const [activeOnly, setActiveOnly] = useState<boolean>(true);

  // New assignment modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    userId: '',
    roleId: '',
    scopeNodeId: '',
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '',
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [asgns, fetchedRoles, fetchedNodes, fetchedUsers] = await Promise.all([
        api.getRoleAssignments({ activeOnly }),
        api.getIamRoles(),
        api.getScopeTree(false),
        api.getManagedUsers(),
      ]);
      setAssignments(asgns);
      setRoles(fetchedRoles);

      // Flatten tree nodes for easy selection
      const flatNodes: ScopeNode[] = [];
      const traverse = (nodes: ScopeNode[]) => {
        nodes.forEach((n) => {
          flatNodes.push(n);
          if (n.children) traverse(n.children);
        });
      };
      traverse(fetchedNodes);
      setScopeNodes(flatNodes);

      setUsers(fetchedUsers);
    } catch (err: any) {
      setError(err?.message || 'Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [activeOnly]);

  const handleRevoke = async (assignment: IamRoleAssignment) => {
    if (
      !window.confirm(
        `Revoke role "${assignment.role.name}" for user "${assignment.user.username}" on scope "${assignment.scopeNode.path}"?`,
      )
    ) {
      return;
    }
    try {
      setError(null);
      await api.revokeRoleAssignment(assignment.id);
      setSuccessMsg(`Assignment revoked successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke assignment');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await api.createRoleAssignment({
        userId: formData.userId,
        roleId: formData.roleId,
        scopeNodeId: formData.scopeNodeId,
        validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : undefined,
        validTo: formData.validTo ? new Date(formData.validTo).toISOString() : null,
      });
      setSuccessMsg('Role assignment granted successfully.');
      setIsModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create assignment');
    }
  };

  // Check applicable node type validation for form
  const selectedRoleObj = roles.find((r) => r.id === formData.roleId);
  const selectedNodeObj = scopeNodes.find((n) => n.id === formData.scopeNodeId);
  let isNodeAllowed = true;
  if (selectedRoleObj && selectedNodeObj) {
    try {
      const allowed = JSON.parse(selectedRoleObj.applicableNodeTypes || '[]');
      isNodeAllowed = allowed.includes(selectedNodeObj.type);
    } catch {
      isNodeAllowed = true;
    }
  }

  // Filtered assignments
  const filteredAssignments = assignments.filter((a) => {
    if (searchUser) {
      const query = searchUser.toLowerCase();
      const matchName = a.user.name?.toLowerCase().includes(query);
      const matchUsername = a.user.username.toLowerCase().includes(query);
      const matchPath = a.scopeNode.path.toLowerCase().includes(query);
      if (!matchName && !matchUsername && !matchPath) return false;
    }
    if (selectedRoleFilter && a.role.id !== selectedRoleFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#DEEBFF] text-[#1868DB] rounded-md">
              <UserCheck className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-[#292A2E]">
              Scoped Role Assignment Manager
            </h2>
          </div>
          <p className="text-xs text-[#505258] mt-1">
            Scope attaches strictly to assignments. A user can hold multiple roles at identical or distinct nodes, and assignments inherit downward automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFormData({
                userId: users[0]?.id || '',
                roleId: roles[0]?.id || '',
                scopeNodeId: scopeNodes[0]?.id || '',
                validFrom: new Date().toISOString().split('T')[0],
                validTo: '',
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1868DB] text-white rounded-md text-xs font-semibold hover:bg-[#0747A6] transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Role Assignment
          </button>

          <button
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#0B120E24] rounded-md text-xs font-semibold text-[#505258] hover:bg-[#F4F5F7] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-[#FFEBE6] border border-[#FF8F73] text-[#BF2600] rounded-md text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-[#E3FCEF] border border-[#57D9A3] text-[#006644] rounded-md text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-[#FAFBFC] border border-[#0B120E15] rounded-md">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#6B778C]" />
          <input
            type="text"
            placeholder="Filter by user or scope path..."
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#0B120E24] rounded-md focus:outline-hidden focus:border-[#1868DB]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-[#0B120E24] rounded-md focus:outline-hidden focus:border-[#1868DB]"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-[#505258] whitespace-nowrap cursor-pointer">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded text-[#1868DB]"
            />
            <span>Active only</span>
          </label>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="border border-[#0B120E15] rounded-md overflow-hidden bg-[#FFFFFF]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-[#505258] text-xs">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading role assignments...
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-12 text-[#505258] text-xs">
            No role assignments match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F4F5F7] text-[#505258] border-b border-[#0B120E15]">
                  <th className="py-2.5 px-3 font-semibold">User</th>
                  <th className="py-2.5 px-3 font-semibold">Assigned Role</th>
                  <th className="py-2.5 px-3 font-semibold">Scope Node & Path</th>
                  <th className="py-2.5 px-3 font-semibold">Validity Period</th>
                  <th className="py-2.5 px-3 font-semibold">Granted By</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0B120E15]">
                {filteredAssignments.map((asgn) => {
                  const now = new Date();
                  const isExpired = asgn.validTo && new Date(asgn.validTo) < now;

                  return (
                    <tr
                      key={asgn.id}
                      className={`hover:bg-[#FAFBFC] transition-colors ${
                        isExpired || !asgn.user.isActive ? 'opacity-60 bg-[#FAFBFC]' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#292A2E]">
                          {asgn.user.name || asgn.user.username}
                        </div>
                        <div className="text-[11px] text-[#6B778C]">@{asgn.user.username}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-[#1868DB]">{asgn.role.name}</span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              asgn.scopeNode.type === 'GLOBAL'
                                ? 'bg-[#DEEBFF] text-[#0747A6]'
                                : asgn.scopeNode.type === 'PLANT'
                                ? 'bg-[#E3FCEF] text-[#006644]'
                                : asgn.scopeNode.type === 'AREA'
                                ? 'bg-[#FFF0B3] text-[#172B4D]'
                                : 'bg-[#EAE6FF] text-[#403294]'
                            }`}
                          >
                            {asgn.scopeNode.type}
                          </span>
                          <span className="font-mono text-[11px] text-[#292A2E]">
                            {asgn.scopeNode.path}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-[#505258]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#6B778C]" />
                          <span>
                            {new Date(asgn.validFrom).toLocaleDateString()} -{' '}
                            {asgn.validTo ? new Date(asgn.validTo).toLocaleDateString() : 'Permanent'}
                          </span>
                        </div>
                        {isExpired && (
                          <span className="text-[10px] text-[#DE350B] font-bold">Expired</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-[11px] text-[#6B778C]">
                        {asgn.grantedBy}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => void handleRevoke(asgn)}
                          className="p-1 text-[#6B778C] hover:text-[#DE350B] rounded hover:bg-[#FFEBE6] transition-colors"
                          title="Revoke Assignment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Assignment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-lg shadow-xl border border-[#0B120E24] w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-[#0B120E15] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#292A2E]">Grant Scoped Role Assignment</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#505258] text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#505258] mb-1">
                  Select User
                </label>
                <select
                  required
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#0B120E24] rounded-md focus:outline-hidden focus:border-[#1868DB]"
                >
                  <option value="">Select a user...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#505258] mb-1">
                  Select Role
                </label>
                <select
                  required
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#0B120E24] rounded-md focus:outline-hidden focus:border-[#1868DB]"
                >
                  <option value="">Select a role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#505258] mb-1">
                  Select Scope Node Target
                </label>
                <select
                  required
                  value={formData.scopeNodeId}
                  onChange={(e) => setFormData({ ...formData, scopeNodeId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#0B120E24] rounded-md focus:outline-hidden focus:border-[#1868DB] font-mono text-[11px]"
                >
                  <option value="">Select a scope node...</option>
                  {scopeNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      [{n.type}] {n.path}
                    </option>
                  ))}
                </select>
              </div>

              {/* Node type validation warning */}
              {!isNodeAllowed && selectedRoleObj && selectedNodeObj && (
                <div className="p-2.5 bg-[#FFEBE6] border border-[#FF8F73] text-[#BF2600] rounded text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Cannot assign role "{selectedRoleObj.name}" to {selectedNodeObj.type} node.
                    Allowed node types: {selectedRoleObj.applicableNodeTypes}.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#505258] mb-1">
                    Valid From
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#0B120E24] rounded-md focus:outline-hidden focus:border-[#1868DB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#505258] mb-1">
                    Valid To (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.validTo}
                    onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#0B120E24] rounded-md focus:outline-hidden focus:border-[#1868DB]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0B120E15]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-[#505258] hover:bg-[#EBECF0] rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isNodeAllowed}
                  className="px-4 py-1.5 text-xs bg-[#1868DB] hover:bg-[#0747A6] disabled:opacity-50 text-white rounded-md font-semibold shadow-xs"
                >
                  Grant Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
