'use client';

import React from 'react';

interface PersonsFilterBarProps {
  search: string;
  setSearch: (val: string) => void;
  onSearch: (e: React.FormEvent) => void;
  onClearSearch: () => void;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (field: string, order: 'asc' | 'desc') => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  selectedIds: string[];
  onOpenBulkEdit: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export const PersonsFilterBar: React.FC<PersonsFilterBarProps> = ({
  search,
  setSearch,
  onSearch,
  onClearSearch,
  sortField,
  sortOrder,
  onSortChange,
  pageSize,
  onPageSizeChange,
  selectedIds,
  onOpenBulkEdit,
  onBulkDelete,
  onClearSelection,
}) => {
  return (
    <div className="space-y-3">
      {/* Floating / Sticky Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              {selectedIds.length} Selected
            </span>
            <span className="text-sm font-medium text-slate-200">
              Bulk actions for dirty records cleanup
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenBulkEdit}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5"
            >
              ✏️ Bulk Edit
            </button>
            <button
              onClick={onBulkDelete}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5"
            >
              🗑 Bulk Delete
            </button>
            <button
              onClick={onClearSelection}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Control Bar: Search, Quick Sort, Page Size */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-white p-3.5 border border-slate-200 rounded-xl shadow-sm">
        {/* Search */}
        <form onSubmit={onSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by name, email, or LinkedIn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
            {search && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Search
          </button>
        </form>

        {/* Quick Sort & Page Size Controls */}
        <div className="flex items-center gap-2.5 self-end md:self-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span>Sort:</span>
            <select
              value={`${sortField}:${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split(':');
                onSortChange(f, o as 'asc' | 'desc');
              }}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="created_at:desc">Created At (Newest)</option>
              <option value="created_at:asc">Created At (Oldest)</option>
              <option value="updated_at:desc">Last Edited (Newest)</option>
              <option value="updated_at:asc">Last Edited (Oldest)</option>
              <option value="first_name:asc">Name (A → Z)</option>
              <option value="first_name:desc">Name (Z → A)</option>
              <option value="primary_email:asc">Email (A → Z)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonsFilterBar;
