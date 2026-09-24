'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  fetchUsers,
  createUser,
  updateUser,
  deactivateUser,
  UserItem,
  CreateUserData,
  UpdateUserData,
} from '@/lib/api';
import { UsersHeader } from './components/UsersHeader';
import { UsersMetricsCards } from './components/UsersMetricsCards';
import { UsersFilterBar } from './components/UsersFilterBar';
import { UsersTable } from './components/UsersTable';
import { AddUserModal } from './components/AddUserModal';
import { EditUserModal } from './components/EditUserModal';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [addForm, setAddForm] = useState<CreateUserData>({
    email: '',
    password: '',
    full_name: '',
    role: 'member',
    is_active: true,
  });

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <UsersHeader
        loading={loading}
        onRefresh={loadUsers}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium animate-fade-in flex items-center justify-between">
          <span>✓ {successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium animate-fade-in flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError(null)}
            className="text-rose-600 hover:text-rose-900 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <UsersMetricsCards metrics={metrics} />

      <UsersFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <UsersTable
        loading={loading}
        users={filteredUsers}
        onEditUser={openEditModal}
        onToggleActive={handleToggleActive}
      />

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        form={addForm}
        setForm={setAddForm}
        onSubmit={handleCreateUser}
        isSubmitting={isSubmitting}
      />

      <EditUserModal
        editingUser={editingUser}
        onClose={() => setEditingUser(null)}
        form={editForm}
        setForm={setEditForm}
        onSubmit={handleUpdateUser}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
