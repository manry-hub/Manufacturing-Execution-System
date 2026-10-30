import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.js';
import type { ManagedUser, SystemRole, CreateUserPayload, UpdateUserPayload } from '../../types/user-admin.js';
import {
  UserPlus,
  Search,
  Key,
  CheckCircle2,
  XCircle,
  Edit2,
  RefreshCw,
  X,
} from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<ManagedUser | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    username: '',
    email: '',
    password: '',
    roles: ['Machine Operator'],
    isActive: true,
  });
  const [editForm, setEditForm] = useState<UpdateUserPayload>({
    email: '',
    roles: [],
    isActive: true,
  });
  const [newPassword, setNewPassword] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        api.getManagedUsers(
          searchTerm || undefined,
          selectedRoleFilter !== 'ALL' ? selectedRoleFilter : undefined,
        ),
        api.getSystemRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedRoleFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Handle Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      await api.createManagedUser(createForm);
      setIsCreateModalOpen(false);
      setCreateForm({
        username: '',
        email: '',
        password: '',
        roles: ['Machine Operator'],
        isActive: true,
      });
      setActionMessage({ type: 'success', text: `User "${createForm.username}" created successfully.` });
      await loadData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create user' });
    }
  };

  // Handle Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionMessage(null);
    try {
      await api.updateManagedUser(editingUser.id, editForm);
      setEditingUser(null);
      setActionMessage({ type: 'success', text: `User "${editingUser.username}" updated successfully.` });
      await loadData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update user' });
    }
  };

  // Handle Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    setActionMessage(null);
    try {
      await api.resetUserPassword(resetPasswordUser.id, newPassword);
      setResetPasswordUser(null);
      setNewPassword('');
      setActionMessage({ type: 'success', text: `Password reset successfully for "${resetPasswordUser.username}".` });
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reset password' });
    }
  };

  // Handle Toggle Active Status
  const handleToggleActive = async (user: ManagedUser) => {
    setActionMessage(null);
    try {
      await api.toggleUserActive(user.id, !user.isActive);
      setActionMessage({
        type: 'success',
        text: `User "${user.username}" ${user.isActive ? 'deactivated' : 'activated'}.`,
      });
      await loadData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to toggle status' });
    }
  };

  const openEditModal = (user: ManagedUser) => {
    setEditingUser(user);
    setEditForm({
      email: user.email,
      roles: [...user.roles],
      isActive: user.isActive,
    });
  };

  // Calculations for KPIs
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const inactiveUsers = totalUsers - activeUsers;

  return (
    <div className="space-y-6">
      {/* Top Notification Banner */}
      {actionMessage && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between border ${
            actionMessage.type === 'success'
              ? 'bg-[#E3FCEF] border-[#7EE2B8] text-[#216E4E]'
              : 'bg-[#FFEBE6] border-[#FD9891] text-[#AE2E24]'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Registered Users
          </div>
          <div className="text-3xl font-bold font-mono text-[#292A2E] mt-1">{totalUsers}</div>
          <div className="text-[11px] text-[#505258] mt-1">Enterprise MES accounts</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Active Accounts
          </div>
          <div className="text-3xl font-bold font-mono text-[#216E4E] mt-1">{activeUsers}</div>
          <div className="text-[11px] text-[#505258] mt-1">Authorized for plant authentication</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Deactivated
          </div>
          <div className="text-3xl font-bold font-mono text-[#505258] mt-1">{inactiveUsers}</div>
          <div className="text-[11px] text-[#505258] mt-1">Suspended access credentials</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-4 shadow-xs">
          <div className="text-xs font-semibold text-[#505258] uppercase tracking-wide">
            Configured Roles
          </div>
          <div className="text-3xl font-bold font-mono text-[#1558BC] mt-1">{roles.length || 9}</div>
          <div className="text-[11px] text-[#505258] mt-1">Fine-grained RBAC permissions</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#0B120E24] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-[#505258] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search username or email..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#FFFFFF] border border-[#0B120E24] rounded-md text-xs text-[#292A2E] placeholder-[#6B6E76] focus:outline-none focus:ring-2 focus:ring-[#1868DB]"
              />
            </div>

            {/* Role Filter */}
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="bg-[#FFFFFF] border border-[#0B120E24] rounded-md px-3 py-1.5 text-xs text-[#292A2E] focus:outline-none focus:ring-2 focus:ring-[#1868DB]"
            >
              <option value="ALL">All Roles ({roles.length})</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => void loadData()}
              disabled={isLoading}
              className="p-1.5 rounded-md border border-[#0B120E24] text-[#505258] hover:bg-[#F4F5F7]"
              title="Refresh users"
              aria-label="Refresh users"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Add User Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-[#1868DB] text-[#FFFFFF] font-bold text-xs px-3.5 py-1.5 rounded-md hover:bg-[#1558BC] shadow-xs transition-colors shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F4F5F7] text-[#505258] uppercase font-semibold text-[11px] border-b border-[#0B120E24]">
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Email</th>
                <th className="py-2.5 px-4">Assigned Roles</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0B120E24]">
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#505258]">
                    Loading user directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#505258]">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const initials = u.username.substring(0, 2).toUpperCase();
                  return (
                    <tr key={u.id} className="hover:bg-[#F4F5F7]/80 transition-colors">
                      <td className="py-3 px-4" aria-label={`User ${u.username}`}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#DEEBFF] text-[#1558BC] font-bold text-[11px] flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-[#292A2E]">{u.username}</div>
                            <div className="text-[10px] text-[#6B6E76] font-mono">{u.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#505258] font-mono">{u.email}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <span
                              key={r}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-sm bg-[#DEEBFF] text-[#1558BC] border border-[#B3D4FF]"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-sm border ${
                            u.isActive
                              ? 'bg-[#E3FCEF] text-[#216E4E] border-[#7EE2B8]'
                              : 'bg-[#F4F5F7] text-[#505258] border-[#0B120E24]'
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-[#216E4E]" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-[#505258]" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#505258] text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit button */}
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-md hover:bg-[#DEEBFF] text-[#1558BC] transition-colors"
                            title="Edit user roles & profile"
                            aria-label="Edit user"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => setResetPasswordUser(u)}
                            className="p-1.5 rounded-md hover:bg-[#FFF0B3] text-[#9E4C00] transition-colors"
                            title="Reset password"
                            aria-label="Reset password"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {/* Toggle Active */}
                          <button
                            onClick={() => void handleToggleActive(u)}
                            className={`p-1.5 rounded-md transition-colors ${
                              u.isActive
                                ? 'hover:bg-[#FFEBE6] text-[#AE2E24]'
                                : 'hover:bg-[#E3FCEF] text-[#216E4E]'
                            }`}
                            title={u.isActive ? 'Deactivate account' : 'Activate account'}
                            aria-label={u.isActive ? 'Deactivate account' : 'Activate account'}
                          >
                            {u.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg shadow-xl w-full max-w-md p-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#0B120E24]">
              <h3 className="text-sm font-bold text-[#292A2E] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#1868DB]" />
                Create New MES User
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#505258] hover:text-[#292A2E]"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label htmlFor="create-username" className="font-semibold text-[#292A2E] block mb-1">Username *</label>
                <input
                  id="create-username"
                  type="text"
                  required
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  placeholder="e.g. jdoe_operator"
                  className="w-full p-2 bg-[#FFFFFF] border border-[#0B120E24] rounded-md text-xs focus:ring-2 focus:ring-[#1868DB] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="create-email" className="font-semibold text-[#292A2E] block mb-1">Email Address *</label>
                <input
                  id="create-email"
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="jdoe@mes.local"
                  className="w-full p-2 bg-[#FFFFFF] border border-[#0B120E24] rounded-md text-xs focus:ring-2 focus:ring-[#1868DB] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="create-password" className="font-semibold text-[#292A2E] block mb-1">Initial Password *</label>
                <input
                  id="create-password"
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full p-2 bg-[#FFFFFF] border border-[#0B120E24] rounded-md text-xs focus:ring-2 focus:ring-[#1868DB] focus:outline-none"
                />
              </div>

              <div>
                <span className="font-semibold text-[#292A2E] block mb-1">Assign Canonical Roles *</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-[#F4F5F7] border border-[#0B120E24] rounded-md">
                  {roles.map((r) => {
                    const isChecked = createForm.roles.includes(r.name);
                    return (
                      <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCreateForm({ ...createForm, roles: [...createForm.roles, r.name] });
                            } else {
                              setCreateForm({
                                ...createForm,
                                roles: createForm.roles.filter((roleName) => roleName !== r.name),
                              });
                            }
                          }}
                          className="rounded-xs text-[#1868DB]"
                        />
                        <span className="text-xs text-[#292A2E] font-medium">{r.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="create-active"
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                  className="rounded-xs text-[#1868DB]"
                />
                <label htmlFor="create-active" className="text-xs font-semibold text-[#292A2E]">
                  Account Active (Immediate sign-in allowed)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0B120E24]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#F4F5F7] text-[#505258] hover:bg-[#EBECF0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md text-xs font-bold bg-[#1868DB] text-[#FFFFFF] hover:bg-[#1558BC]"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg shadow-xl w-full max-w-md p-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#0B120E24]">
              <h3 className="text-sm font-bold text-[#292A2E] flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#1558BC]" />
                Edit User: {editingUser.username}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-[#505258] hover:text-[#292A2E]" aria-label="Close modal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label htmlFor="edit-email" className="font-semibold text-[#292A2E] block mb-1">Email Address</label>
                <input
                  id="edit-email"
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full p-2 bg-[#FFFFFF] border border-[#0B120E24] rounded-md text-xs focus:ring-2 focus:ring-[#1868DB] focus:outline-none"
                />
              </div>

              <div>
                <span className="font-semibold text-[#292A2E] block mb-1">Assigned Roles</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-[#F4F5F7] border border-[#0B120E24] rounded-md">
                  {roles.map((r) => {
                    const isChecked = editForm.roles?.includes(r.name) ?? false;
                    return (
                      <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const cur = editForm.roles ?? [];
                            if (e.target.checked) {
                              setEditForm({ ...editForm, roles: [...cur, r.name] });
                            } else {
                              setEditForm({ ...editForm, roles: cur.filter((rn) => rn !== r.name) });
                            }
                          }}
                          className="rounded-xs text-[#1868DB]"
                        />
                        <span className="text-xs text-[#292A2E] font-medium">{r.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded-xs text-[#1868DB]"
                />
                <label htmlFor="edit-active" className="text-xs font-semibold text-[#292A2E]">
                  Account Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0B120E24]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#F4F5F7] text-[#505258] hover:bg-[#EBECF0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md text-xs font-bold bg-[#1868DB] text-[#FFFFFF] hover:bg-[#1558BC]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg shadow-xl w-full max-w-sm p-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#0B120E24]">
              <h3 className="text-sm font-bold text-[#292A2E] flex items-center gap-2">
                <Key className="w-4 h-4 text-[#9E4C00]" />
                Reset Password
              </h3>
              <button onClick={() => setResetPasswordUser(null)} className="text-[#505258] hover:text-[#292A2E]" aria-label="Close modal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 mt-4 text-xs">
              <p className="text-[#505258]">
                Set a new password for account <strong className="text-[#292A2E]">{resetPasswordUser.username}</strong>:
              </p>
              <div>
                <label htmlFor="reset-password-input" className="font-semibold text-[#292A2E] block mb-1">New Password</label>
                <input
                  id="reset-password-input"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full p-2 bg-[#FFFFFF] border border-[#0B120E24] rounded-md text-xs focus:ring-2 focus:ring-[#1868DB] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0B120E24]">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#F4F5F7] text-[#505258] hover:bg-[#EBECF0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md text-xs font-bold bg-[#9E4C00] text-[#FFFFFF] hover:bg-[#693200]"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
