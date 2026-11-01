import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  Eye,
  Trash2,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type { IamRole, IamPermission, RoleImpactPreview } from '../../types/iam.js';

export const RoleManagerView: React.FC = () => {
  const [roles, setRoles] = useState<IamRole[]>([]);
  const [permissions, setPermissions] = useState<IamPermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<IamRole | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dry-run preview state
  const [previewData, setPreviewData] = useState<RoleImpactPreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Create role modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    applicableNodeTypes: ['GLOBAL', 'PLANT', 'AREA', 'MACHINE'],
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [fetchedRoles, fetchedPermissions] = await Promise.all([
        api.getIamRoles(),
        api.getIamPermissions(),
      ]);
      setRoles(fetchedRoles);
      setPermissions(fetchedPermissions);

      if (fetchedRoles.length > 0) {
        const initial = selectedRole
          ? fetchedRoles.find((r) => r.id === selectedRole.id) || fetchedRoles[0]
          : fetchedRoles[0];
        setSelectedRole(initial);
        setSelectedPermissionIds(new Set(initial.rolePermissions.map((rp) => rp.permission.id)));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load roles and permissions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSelectRole = (role: IamRole) => {
    setSelectedRole(role);
    setSelectedPermissionIds(new Set(role.rolePermissions.map((rp) => rp.permission.id)));
    setError(null);
  };

  const handleTogglePermission = (permId: string) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  // Dry-run preview before committing
  const handleInitiateSave = async () => {
    if (!selectedRole) return;
    try {
      setError(null);
      setIsSaving(true);
      const preview = await api.previewIamRoleUpdate(selectedRole.id, Array.from(selectedPermissionIds));
      setPreviewData(preview);
      setIsPreviewOpen(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to preview role update impact');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!selectedRole) return;
    try {
      setError(null);
      setIsSaving(true);
      await api.updateIamRole(selectedRole.id, {
        permissionIds: Array.from(selectedPermissionIds),
      });
      setSuccessMsg(`Permissions for role "${selectedRole.name}" updated successfully.`);
      setIsPreviewOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update role permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const newRole = await api.createIamRole({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        applicableNodeTypes: createForm.applicableNodeTypes,
        permissionIds: [],
      });
      setSuccessMsg(`Role "${newRole.name}" created successfully.`);
      setIsCreateOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
      handleSelectRole(newRole);
    } catch (err: any) {
      setError(err?.message || 'Failed to create role');
    }
  };

  const handleDeleteRole = async (role: IamRole) => {
    if (!window.confirm(`Are you sure you want to delete role "${role.name}"?`)) return;
    try {
      setError(null);
      await api.deleteIamRole(role.id);
      setSuccessMsg(`Role "${role.name}" deleted successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete role');
    }
  };

  // Group permissions by functional module
  const groupedPermissions = permissions.reduce<Record<string, IamPermission[]>>((acc, p) => {
    const mod = p.module.toUpperCase();
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {});

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#DEEBFF] text-[#1868DB] rounded-md">
              <Shield className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-[#292A2E]">
              Role Catalog & Modular Permission Matrix
            </h2>
          </div>
          <p className="text-xs text-[#505258] mt-1">
            Built-in and custom canonical roles. Permissions are cataloged by developers and composed by System Administrators with impact preview.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1868DB] text-white rounded-md text-xs font-semibold hover:bg-[#0747A6] transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Custom Role
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

      {/* Main Grid: Left Roles List, Right Permission Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
        {/* Roles List */}
        <div className="md:col-span-4 border border-[#0B120E15] rounded-md p-3 space-y-2 bg-[#FAFBFC]">
          <span className="text-xs font-bold text-[#505258] uppercase tracking-wider block px-1">
            Defined Roles ({roles.length})
          </span>

          {isLoading ? (
            <div className="text-xs text-center py-6 text-[#505258]">Loading roles...</div>
          ) : (
            roles.map((role) => {
              const isSelected = selectedRole?.id === role.id;
            let applicableList: string[] = [];
            try {
              applicableList = JSON.parse(role.applicableNodeTypes || '[]');
            } catch {
              applicableList = ['GLOBAL', 'PLANT', 'AREA', 'MACHINE'];
            }

            return (
              <div
                key={role.id}
                onClick={() => handleSelectRole(role)}
                className={`p-3 rounded-md cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-[#FFFFFF] border-[#1868DB] shadow-xs'
                    : 'bg-[#FFFFFF] border-[#0B120E15] hover:border-[#0B120E30]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-[#292A2E]">{role.name}</span>
                    {role.isBuiltin ? (
                      <span className="p-0.5 text-[#6B778C]" title="Built-in System Role (Locked Name)">
                        <Lock className="w-3 h-3 text-[#FFAB00]" />
                      </span>
                    ) : (
                      <span className="p-0.5 text-[#6B778C]" title="Custom Role">
                        <Unlock className="w-3 h-3 text-[#00875A]" />
                      </span>
                    )}
                  </div>

                  {!role.isBuiltin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteRole(role);
                      }}
                      className="text-[#6B778C] hover:text-[#DE350B] p-1"
                      title="Delete Custom Role"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-[#505258] mt-1 line-clamp-2">
                  {role.description || 'No description provided.'}
                </p>

                <div className="flex flex-wrap gap-1 mt-2">
                  {applicableList.map((nt) => (
                    <span
                      key={nt}
                      className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#EBECF0] text-[#505258]"
                    >
                      {nt}
                    </span>
                  ))}
                  <span className="ml-auto text-[10px] text-[#6B778C]">
                    {role.rolePermissions.length} perms
                  </span>
                </div>
              </div>
            );
          }))}
        </div>

        {/* Permission Matrix */}
        <div className="md:col-span-8 border border-[#0B120E15] rounded-md p-4 space-y-4 bg-[#FFFFFF]">
          {selectedRole ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#0B120E15] gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[#292A2E]">{selectedRole.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DEEBFF] text-[#0747A6]">
                      {selectedPermissionIds.size} granted
                    </span>
                  </div>
                  <p className="text-xs text-[#505258] mt-0.5">
                    {selectedRole.description}
                  </p>
                </div>

                <button
                  onClick={() => void handleInitiateSave()}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 bg-[#1868DB] hover:bg-[#0747A6] disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview & Save Changes
                </button>
              </div>

              {/* Grouped Permissions */}
              <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                {Object.entries(groupedPermissions).map(([moduleName, perms]) => (
                  <div key={moduleName} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B778C]">
                        {moduleName} Module
                      </span>
                      <div className="flex-1 border-t border-[#0B120E15]" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {perms.map((perm) => {
                        const isChecked = selectedPermissionIds.has(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-2.5 p-2 rounded-md border cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-[#F4F5F7] border-[#1868DB]'
                                : 'bg-[#FFFFFF] border-[#0B120E15] hover:bg-[#FAFBFC]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(perm.id)}
                              className="mt-0.5 rounded border-[#0B120E24] text-[#1868DB] focus:ring-[#1868DB]"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-xs font-semibold text-[#292A2E]">
                                  {perm.code}
                                </span>
                                {perm.isCritical && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FFEBE6] text-[#DE350B]">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    CRITICAL
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#505258] mt-0.5">
                                {perm.description || perm.action}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-[#505258] text-xs">
              Select a role from the left pane to manage its permissions.
            </div>
          )}
        </div>
      </div>

      {/* Dry-Run Preview Modal */}
      {isPreviewOpen && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-lg shadow-xl border border-[#0B120E24] w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#0B120E15] flex items-center justify-between bg-[#FAFBFC]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1868DB]" />
                <h3 className="font-bold text-sm text-[#292A2E]">
                  Dry-Run Preview: Impact on Active Users
                </h3>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="text-[#505258] text-sm">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-[#DEEBFF] text-[#0747A6] rounded-md text-xs">
                Modifying role <strong>{previewData.roleName}</strong> will immediately impact{' '}
                <strong>{previewData.affectedUserCount}</strong> active user(s) across{' '}
                <strong>{previewData.affectedAssignmentsCount}</strong> role assignment(s).
              </div>

              {previewData.affectedUsers.length > 0 ? (
                <div>
                  <span className="text-xs font-semibold text-[#505258] block mb-2">
                    Affected Users:
                  </span>
                  <div className="max-h-48 overflow-y-auto border border-[#0B120E15] rounded-md divide-y divide-[#0B120E15]">
                    {previewData.affectedUsers.map((u) => (
                      <div key={u.id} className="p-2 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-[#292A2E]">{u.name || u.username}</span>
                          <span className="text-[#6B778C] ml-2">(@{u.username})</span>
                        </div>
                        <span className="text-[11px] text-[#6B778C]">{u.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#505258]">
                  No users are currently assigned to this role.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0B120E15]">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-[#505258] hover:bg-[#EBECF0] rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmSave()}
                  disabled={isSaving}
                  className="px-4 py-1.5 text-xs bg-[#1868DB] hover:bg-[#0747A6] text-white rounded-md font-semibold shadow-xs"
                >
                  Confirm & Commit Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Role Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-lg shadow-xl border border-[#0B120E24] w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-[#0B120E15] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#292A2E]">Create New Custom Role</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-[#505258] text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#505258] mb-1">
                  Role Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Assurance Lead"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#0B120E24] rounded-md focus:outline-hidden focus:border-[#1868DB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#505258] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Purpose and authority boundaries of this role..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#0B120E24] rounded-md focus:outline-hidden focus:border-[#1868DB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#505258] mb-1">
                  Applicable Node Types
                </label>
                <div className="flex gap-3">
                  {(['GLOBAL', 'PLANT', 'AREA', 'MACHINE'] as const).map((type) => {
                    const checked = createForm.applicableNodeTypes.includes(type);
                    return (
                      <label key={type} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setCreateForm((prev) => ({
                              ...prev,
                              applicableNodeTypes: checked
                                ? prev.applicableNodeTypes.filter((t) => t !== type)
                                : [...prev.applicableNodeTypes, type],
                            }));
                          }}
                          className="rounded text-[#1868DB]"
                        />
                        <span>{type}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0B120E15]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-[#505258] hover:bg-[#EBECF0] rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-[#1868DB] hover:bg-[#0747A6] text-white rounded-md font-semibold shadow-xs"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
