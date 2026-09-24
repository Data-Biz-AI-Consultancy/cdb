'use client';

import React from 'react';
import { Lead } from '../types';

interface LeadKpisProps {
  leads: Lead[];
  totalCount: number;
  stageFilter: string;
  onStageFilterChange: (stage: string) => void;
}

export const LeadKpis: React.FC<LeadKpisProps> = ({
  leads,
  totalCount,
  stageFilter,
  onStageFilterChange,
}) => {
  const activePipelineCount = leads.filter((l) => ['new', 'contacted', 'qualified'].includes(l.stage)).length;
  const staleCount = leads.filter((l) => l.stage === 'stale' || l.is_stale).length;
  const resolvedCount = leads.filter((l) => ['converted', 'disqualified', 'expired'].includes(l.stage) || l.is_expired).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <button
        type="button"
        onClick={() => onStageFilterChange('active')}
        className={`p-4 rounded-xl border text-left transition shadow-xs cursor-pointer ${
          stageFilter === 'active'
            ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900/20'
            : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
        }`}
      >
        <div
          className={`text-[11px] font-semibold uppercase tracking-wider ${
            stageFilter === 'active' ? 'text-slate-300' : 'text-slate-500'
          }`}
        >
          Total Active Leads
        </div>
        <div className="text-2xl font-bold mt-1 flex items-center gap-1.5">
          <span>🎯</span>
          <span>{stageFilter === 'active' ? (totalCount || leads.length) : 'Active'}</span>
        </div>
        <div className="text-xs mt-1 text-slate-400">
          Excludes converted, disqualified & expired
        </div>
      </button>

      <button
        type="button"
        onClick={() => onStageFilterChange('new')}
        className={`p-4 rounded-xl border text-left transition shadow-xs cursor-pointer ${
          stageFilter === 'new'
            ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20'
            : 'bg-white text-slate-900 border-slate-200 hover:border-blue-300'
        }`}
      >
        <div
          className={`text-[11px] font-semibold uppercase tracking-wider ${
            stageFilter === 'new' ? 'text-blue-100' : 'text-blue-600'
          }`}
        >
          New / Uncontacted
        </div>
        <div
          className={`text-2xl font-bold mt-1 flex items-center gap-1.5 ${
            stageFilter === 'new' ? 'text-white' : 'text-blue-700'
          }`}
        >
          <span>📬</span>
          <span>{activePipelineCount} on page</span>
        </div>
        <div className={`text-xs mt-1 ${stageFilter === 'new' ? 'text-blue-200' : 'text-slate-400'}`}>
          Click to filter new leads
        </div>
      </button>

      <button
        type="button"
        onClick={() => onStageFilterChange('stale')}
        className={`p-4 rounded-xl border text-left transition shadow-xs cursor-pointer ${
          stageFilter === 'stale'
            ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-600/20'
            : 'bg-white text-slate-900 border-slate-200 hover:border-amber-300'
        }`}
      >
        <div
          className={`text-[11px] font-semibold uppercase tracking-wider ${
            stageFilter === 'stale' ? 'text-amber-100' : 'text-amber-600'
          }`}
        >
          Stale (30-90d Inactive)
        </div>
        <div
          className={`text-2xl font-bold mt-1 flex items-center gap-1.5 ${
            stageFilter === 'stale' ? 'text-white' : 'text-amber-700'
          }`}
        >
          <span>⏳</span>
          <span>{staleCount} on page</span>
        </div>
        <div className={`text-xs mt-1 ${stageFilter === 'stale' ? 'text-amber-200' : 'text-slate-400'}`}>
          Click to filter stale leads
        </div>
      </button>

      <button
        type="button"
        onClick={() => onStageFilterChange('expired')}
        className={`p-4 rounded-xl border text-left transition shadow-xs cursor-pointer ${
          stageFilter === 'expired'
            ? 'bg-rose-700 text-white border-rose-700 ring-2 ring-rose-700/20'
            : 'bg-white text-slate-900 border-slate-200 hover:border-rose-300'
        }`}
      >
        <div
          className={`text-[11px] font-semibold uppercase tracking-wider ${
            stageFilter === 'expired' ? 'text-rose-100' : 'text-rose-600'
          }`}
        >
          Expired (Auto-Disqualified)
        </div>
        <div
          className={`text-2xl font-bold mt-1 flex items-center gap-1.5 ${
            stageFilter === 'expired' ? 'text-white' : 'text-rose-700'
          }`}
        >
          <span>🛑</span>
          <span>{resolvedCount} on page</span>
        </div>
        <div className={`text-xs mt-1 ${stageFilter === 'expired' ? 'text-rose-200' : 'text-slate-400'}`}>
          &gt;90d inactive (auto-disqualified)
        </div>
      </button>
    </div>
  );
};

export default LeadKpis;
