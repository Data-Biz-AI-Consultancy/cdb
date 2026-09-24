'use client';

import React from 'react';
import { UserItem } from '@/lib/api';
import { getInitials, getRoleBadgeColor } from '../constants';

interface UsersTableProps {
  loading: boolean;
  users: UserItem[];
  onEditUser: (user: UserItem) => void;
  onToggleActive: (user: UserItem) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  loading,
  users,
  onEditUser,
  onToggleActive,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading user directory...</div>
      ) : users.length === 0 ? (
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
              {users.map((u) => (
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
                      onClick={() => onEditUser(u)}
                      className="px-2.5 py-1 font-semibold text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onToggleActive(u)}
                      className={`px-2.5 py-1 font-semibold text-[11px] rounded-lg transition cursor-pointer ${
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
  );
};
