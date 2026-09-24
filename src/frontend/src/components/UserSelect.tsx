'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { fetchUsers, UserItem } from '@/lib/api';

interface UserSelectProps {
  value: string;
  onChange: (userId: string, user?: UserItem) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  roleFilter?: string;
  id?: string;
}

export default function UserSelect({
  value,
  onChange,
  label,
  placeholder = 'Select a team member...',
  required = false,
  disabled = false,
  roleFilter,
  id = 'user-select',
}: UserSelectProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadUsers() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchUsers({ is_active: true, role: roleFilter, page_size: 100 });
        if (isMounted) {
          setUsers(res.items || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load team members');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadUsers();
    return () => {
      isMounted = false;
    };
  }, [roleFilter]);

  const selectedUser = useMemo(() => {
    return users.find((u) => u.id === value);
  }, [users, value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const user = users.find((u) => u.id === selectedId);
    onChange(selectedId, user);
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      return parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();
    }
    return email ? email.slice(0, 2).toUpperCase() : '??';
  };

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          id={id}
          value={value}
          onChange={handleChange}
          required={required}
          disabled={disabled || loading}
          className={`w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-3 pr-10 text-xs font-medium text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 ${
            error ? 'border-rose-400' : ''
          }`}
        >
          <option value="">{loading ? 'Loading team members...' : placeholder}</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ? `${u.full_name} (${u.email})` : u.email} — [{u.role.toUpperCase()}]
            </option>
          ))}
        </select>
      </div>

      {selectedUser && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 animate-fade-in">
          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
            {getInitials(selectedUser.full_name, selectedUser.email)}
          </div>
          <span className="font-semibold text-slate-800 truncate">
            {selectedUser.full_name || selectedUser.email}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold uppercase ml-auto">
            {selectedUser.role}
          </span>
        </div>
      )}

      {error && <p className="text-[11px] text-rose-500">{error}</p>}
    </div>
  );
}
