'use client';

import React from 'react';

interface OpportunityFilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  signalFilter: 'all' | 'has_signals' | 'has_risks' | 'has_opps';
  setSignalFilter: (filter: 'all' | 'has_signals' | 'has_risks' | 'has_opps') => void;
}

export const OpportunityFilterBar: React.FC<OpportunityFilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  signalFilter,
  setSignalFilter,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
      <div className="relative w-full sm:w-80">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
          🔍
        </span>
        <input
          type="text"
          placeholder="Search deals, contacts, companies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        {/* Signal Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setSignalFilter('all')}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
              signalFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Deals
          </button>
          <button
            onClick={() => setSignalFilter('has_signals')}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
              signalFilter === 'has_signals'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-indigo-700'
            }`}
          >
            <span>⚡</span> Active Signals
          </button>
          <button
            onClick={() => setSignalFilter('has_risks')}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
              signalFilter === 'has_risks'
                ? 'bg-white text-rose-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            <span>⚠️</span> Critical Risks
          </button>
          <button
            onClick={() => setSignalFilter('has_opps')}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
              signalFilter === 'has_opps'
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <span>🚀</span> Growth Triggers
          </button>
        </div>
      </div>
    </div>
  );
};
