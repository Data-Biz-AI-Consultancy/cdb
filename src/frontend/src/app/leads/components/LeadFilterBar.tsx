'use client';

import React from 'react';

interface LeadFilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  stageFilter: string;
  onStageFilterChange: (val: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (val: string) => void;
  signalFilter: string;
  onSignalFilterChange: (val: string) => void;
  sortOption: string;
  onSortChange: (val: string) => void;
  pageSize: number;
  onPageSizeChange: (val: number) => void;
  selectedIds: string[];
  onOpenBulkConvert: () => void;
  onOpenBulkDisqualify: () => void;
  onOpenBulkEdit: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export const LeadFilterBar: React.FC<LeadFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  stageFilter,
  onStageFilterChange,
  sourceFilter,
  onSourceFilterChange,
  signalFilter,
  onSignalFilterChange,
  sortOption,
  onSortChange,
  pageSize,
  onPageSizeChange,
  selectedIds,
  onOpenBulkConvert,
  onOpenBulkDisqualify,
  onOpenBulkEdit,
  onBulkDelete,
  onClearSelection,
}) => {
  return (
    <div className="space-y-3">
      {/* Sticky / Floating Bulk Resolve Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-fade-in border border-slate-800">
          <div className="flex items-center gap-3">
            <span className="bg-amber-400 text-slate-950 text-xs font-bold px-2.5 py-1 rounded-full shadow-xs">
              {selectedIds.length} Selected
            </span>
            <span className="text-sm font-semibold text-slate-200">
              Bulk Resolve & Action Pipeline:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Bulk Convert */}
            <button
              onClick={onOpenBulkConvert}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm"
              title="Convert selected leads to active deals"
            >
              <span>💼</span>
              <span>Bulk Convert to Opp</span>
            </button>

            {/* 2. Bulk Reject / Disqualify */}
            <button
              onClick={onOpenBulkDisqualify}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm"
              title="Reject or disqualify selected leads"
            >
              <span>🚫</span>
              <span>Bulk Reject / Disqualify</span>
            </button>

            {/* 3. Bulk Edit Attributes */}
            <button
              onClick={onOpenBulkEdit}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 border border-slate-700"
            >
              <span>✏️</span>
              <span>Edit Attributes</span>
            </button>

            {/* 4. Bulk Delete / Remove */}
            <button
              onClick={onBulkDelete}
              className="bg-red-700 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm"
              title="Permanently remove selected leads"
            >
              <span>🗑</span>
              <span>Remove</span>
            </button>

            {/* Clear Selection */}
            <button
              onClick={onClearSelection}
              className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Filters & Sorting Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Search title, contact, company, intent, notes..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Stage Filter */}
          <div>
            <select
              value={stageFilter}
              onChange={(e) => onStageFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
            >
              <option value="active">🎯 Active Pipeline (Default)</option>
              <option value="all">🌐 All Records (Incl. Resolved)</option>
              <option value="new">📬 New (Uncontacted)</option>
              <option value="contacted">💬 Contacted</option>
              <option value="qualified">⭐ Qualified</option>
              <option value="stale">⏳ Stale (30-90d Inactive)</option>
              <option value="converted">💼 Converted to Opp</option>
              <option value="disqualified">🚫 Disqualified</option>
              <option value="expired">🛑 Expired (&gt;90d Inactive)</option>
            </select>
          </div>

          {/* Signal Strength Filter */}
          <div>
            <select
              value={signalFilter}
              onChange={(e) => onSignalFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All Signal Strengths</option>
              <option value="strong">🔥 Strong Signal</option>
              <option value="medium">⚡ Medium Signal</option>
              <option value="weak">🌱 Low Signal</option>
            </select>
          </div>

          {/* Sorting Dropdown */}
          <div>
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800"
            >
              <option value="created_at:desc">🕒 Most Recent (Default)</option>
              <option value="created_at:asc">🕒 Oldest First</option>
              <option value="updated_at:desc">🔄 Recently Updated</option>
              <option value="signal_strength:desc">🔥 Signal Strength</option>
              <option value="stage:asc">📊 Stage Flow</option>
            </select>
          </div>

          {/* Page Size Dropdown */}
          <div>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>

        {/* Quick Stage Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium mr-1">Filter by Stage:</span>
          {[
            { label: 'Active Pipeline', value: 'active' },
            { label: 'New', value: 'new' },
            { label: 'Contacted', value: 'contacted' },
            { label: 'Qualified', value: 'qualified' },
            { label: '⏳ Stale (30d+)', value: 'stale' },
            { label: 'Converted', value: 'converted' },
            { label: 'Disqualified', value: 'disqualified' },
            { label: '🛑 Expired (90d+)', value: 'expired' },
            { label: 'All Records', value: 'all' },
          ].map((pill) => (
            <button
              key={pill.value}
              onClick={() => onStageFilterChange(pill.value)}
              className={`px-2.5 py-1 rounded-md transition font-medium ${
                stageFilter === pill.value
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeadFilterBar;
