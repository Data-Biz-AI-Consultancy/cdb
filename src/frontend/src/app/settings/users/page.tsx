'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  fetchUsers,
  createUser,
  updateUser,
  deactivateUser,
  UserItem,
  CreateUserData,
  UpdateUserData,
} from '@/lib/api';

const AVAILABLE_ROLES = [
  { value: 'admin', label: 'Administrator', desc: 'Full system & user access' },
  { value: 'manager', label: 'Sales / RevOps Manager', desc: 'Signal escalation & approval' },
  { value: 'ae', label: 'Account Executive', desc: 'Opportunity & deal ownership' },
  { value: 'sdr', label: 'Sales Development Rep', desc: 'Signal triage & lead qualification' },
  { value: 'member', label: 'Team Member', desc: 'Standard read & act access' },
];

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Form State
  const [addForm, setAddForm] = useState<CreateUserData>({
    email: '',
    password: '',
    full_name: '',
    role: 'member',
    is_active: true,
  });

  // Edit Form State
  const [editForm, setEditForm] = useState<UpdateUserData>({
    email: '',
    password: '',
    full_name: '',
    role: 'member',
    is_active: true,
  });

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchUsers({ page_size: 200 });
      setUsers(res.items || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email || !addForm.password) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await createUser(addForm);
      showNotification(`Team member ${addForm.full_name || addForm.email} created successfully.`);
      setIsAddModalOpen(false);
      setAddForm({
        email: '',
        password: '',
        full_name: '',
        role: 'member',
        is_active: true,
      });
      await loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const payload: UpdateUserData = {
        email: editForm.email,
        full_name: editForm.full_name,
        role: editForm.role,
        is_active: editForm.is_active,
      };
      if (editForm.password && editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      await updateUser(editingUser.id, payload);
      showNotification(`User ${editForm.full_name || editForm.email} updated successfully.`);
      setEditingUser(null);
      await loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: UserItem) => {
    try {
      if (user.is_active) {
        await deactivateUser(user.id);
        showNotification(`User ${user.full_name || user.email} has been deactivated.`);
      } else {
        await updateUser(user.id, { is_active: true });
        showNotification(`User ${user.full_name || user.email} has been reactivated.`);
      }
      await loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change user status');
    }
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setEditForm({
      email: user.email,
      password: '',
      full_name: user.full_name || '',
      role: user.role,
      is_active: user.is_active,
    });
  };

  // Filtered List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = u.full_name?.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.is_active).length;
    const admins = users.filter((u) => u.role === 'admin' && u.is_active).length;
    const salesAndOps = users.filter(
      (u) => ['ae', 'sdr', 'manager'].includes(u.role) && u.is_active
    ).length;
    return { total, active, admins, salesAndOps };
  }, [users]);

  const getInitials = (name?: string | null, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      return parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();
    }
    return email ? email.slice(0, 2).toUpperCase() : '??';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'manager':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ae':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'sdr':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Breadcrumb & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/settings" className="hover:text-slate-800 font-medium transition">
              Settings
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Users & Teams</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Team Directory & User Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage team members, roles, signal ownership routing, and administrative access.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <span>+ Add Team Member</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium animate-fade-in flex items-center justify-between">
          <span>✓ {successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium animate-fade-in flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
            ✕
          </button>
        </div>
      )}

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total Users
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Configured accounts</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
            Active Members
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{metrics.active}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Eligible for signal routing</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
            Administrators
          </div>
          <div className="text-2xl font-black text-indigo-700 mt-1">{metrics.admins}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">System managers</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-600">
            Sales & RevOps
          </div>
          <div className="text-2xl font-black text-purple-700 mt-1">{metrics.salesAndOps}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">AE, SDR & Leads</div>
        </div>
      </div>

      {/* Filters & Search Controls */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-700 font-medium"
          >
            <option value="all">All Roles</option>
            {AVAILABLE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Users Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading user directory...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="text-2xl">👥</div>
            <div className="text-sm font-bold text-slate-800">No users found</div>
            <p className="text-xs text-slate-500">
              Try adjusting your search criteria or add a new team member.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">User ID</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                          {getInitials(u.full_name, u.email)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {u.full_name || 'Unnamed User'}
                          </div>
                          <div className="text-[11px] text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getRoleBadgeColor(
                          u.role
                        )}`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-400">
                      {u.id.slice(0, 8)}...{u.id.slice(-4)}
                    </td>

                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(u)}
                        className="px-2.5 py-1 font-semibold text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`px-2.5 py-1 font-semibold text-[11px] rounded-lg transition ${
                          u.is_active
                            ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add New User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-scale-in">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Add New Team Member</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Henderson"
                  value={addForm.full_name || ''}
                  onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex.henderson@company.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Initial Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900"
                >
                  {AVAILABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} ({r.desc})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="add-active"
                  checked={addForm.is_active}
                  onChange={(e) => setAddForm({ ...addForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <label htmlFor="add-active" className="text-xs font-medium text-slate-700">
                  Active account (available for signal routing)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-sm"
                >
                  {isSubmitting ? 'Creating...' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-scale-in">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Edit Team Member</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.full_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  New Password <span className="text-slate-400 text-[10px]">(Leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter new password if changing"
                  value={editForm.password || ''}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900"
                >
                  {AVAILABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} ({r.desc})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <label htmlFor="edit-active" className="text-xs font-medium text-slate-700">
                  Active account (eligible for signal assignment)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-sm"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
