'use client';

import React from 'react';
import { ACTIVITY_TYPE_CONFIG } from '@/lib/activityTypes';

interface ActivityFilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  sourceFilter: string;
  setSourceFilter: (source: string) => void;
  dateFilter: string;
  setDateFilter: (date: string) => void;
  onFilterChange: () => void;
}

export const ActivityFilterBar: React.FC<ActivityFilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  sourceFilter,
  setSourceFilter,
  dateFilter,
  setDateFilter,
  onFilterChange,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <input
          type="text"
          placeholder="Search activities, notes, contacts, companies..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            onFilterChange();
          }}
          className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              onFilterChange();
            }}
            className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Type & Source Dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Activity Type Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => {
              setTypeFilter('');
              onFilterChange();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              typeFilter === '' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Types
          </button>
          {Object.entries(ACTIVITY_TYPE_CONFIG).map(([typeKey, cfg]) => (
            <button
              key={typeKey}
              onClick={() => {
                setTypeFilter(typeFilter === typeKey ? '' : typeKey);
                onFilterChange();
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                typeFilter === typeKey
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
            </button>
          ))}
        </div>

        {/* Source Filter */}
        <select
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value);
            onFilterChange();
          }}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Sources</option>
          <option value="linkedin">LinkedIn</option>
          <option value="notion">Notion</option>
          <option value="gmail">Gmail</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="manual">Manual</option>
        </select>

        {/* Date Range Filter */}
        <select
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            onFilterChange();
          }}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="7d">Past 7 Days</option>
          <option value="30d">Past 30 Days</option>
        </select>
      </div>
    </div>
  );
};

export default ActivityFilterBar;
