'use client';

import React from 'react';

interface EngagementFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterStatus: string;
  onStatusChange: (status: string) => void;
  filterType: string;
  onTypeChange: (type: string) => void;
  filteredCount: number;
  totalCount: number;
}

export function EngagementFilterBar({
  searchQuery,
  onSearchChange,
  filterStatus,
  onStatusChange,
  filterType,
  onTypeChange,
  filteredCount,
  totalCount,
}: EngagementFilterBarProps) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
      <div className="flex flex-wrap gap-3 items-center flex-1">
        <div className="relative min-w-[220px] max-w-xs">
          <input
            type="text"
            placeholder="Search engagements, clients, T&Cs..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full text-sm bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="text-sm bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="in_delivery">In Delivery</option>
          <option value="planning">Planning</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => onTypeChange(e.target.value)}
          className="text-sm bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="consultancy">Consultancy</option>
          <option value="retainer">Retainer</option>
          <option value="fixed_fee">Fixed Fee</option>
          <option value="time_and_materials">Time & Materials</option>
          <option value="advisory">Advisory</option>
          <option value="full_time">Full Time</option>
        </select>
      </div>

      <div className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{filteredCount}</span> of {totalCount}{' '}
        engagements
      </div>
    </div>
  );
}
