'use client';

import React from 'react';
import Link from 'next/link';

interface UsersHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  onOpenAddModal: () => void;
}

export const UsersHeader: React.FC<UsersHeaderProps> = ({
  loading,
  onRefresh,
  onOpenAddModal,
}) => {
  return (
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
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
        <button
          onClick={onOpenAddModal}
          className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <span>+ Add Team Member</span>
        </button>
      </div>
    </div>
  );
};
