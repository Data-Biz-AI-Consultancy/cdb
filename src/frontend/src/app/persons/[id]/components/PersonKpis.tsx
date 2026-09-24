'use client';

import React from 'react';

interface PersonKpisProps {
  careerCount: number;
  hasCurrentRole: boolean;
  activitiesCount: number;
  latestActivityDate?: string;
  opportunitiesCount: number;
  totalOppValue: number;
  leadsCount: number;
  openLeadsCount: number;
  onTabSelect: (tab: 'timeline' | 'employment' | 'opportunities' | 'leads') => void;
}

export function PersonKpis({
  careerCount,
  hasCurrentRole,
  activitiesCount,
  latestActivityDate,
  opportunitiesCount,
  totalOppValue,
  leadsCount,
  openLeadsCount,
  onTabSelect,
}: PersonKpisProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div
        onClick={() => onTabSelect('employment')}
        className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 cursor-pointer transition"
      >
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Employment History
        </div>
        <div className="text-2xl font-bold text-slate-900 mt-1">{careerCount}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          {hasCurrentRole ? '1 Current Role' : 'No Active Role'}
        </div>
      </div>

      <div
        onClick={() => onTabSelect('timeline')}
        className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 cursor-pointer transition"
      >
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Touchpoints & Activities
        </div>
        <div className="text-2xl font-bold text-slate-900 mt-1">{activitiesCount}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          {latestActivityDate ? `Latest: ${latestActivityDate}` : 'No activities yet'}
        </div>
      </div>

      <div
        onClick={() => onTabSelect('opportunities')}
        className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 cursor-pointer transition"
      >
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Opportunities Attached
        </div>
        <div className="text-2xl font-bold text-emerald-700 mt-1">{opportunitiesCount}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          Total Value: €{totalOppValue.toLocaleString()}
        </div>
      </div>

      <div
        onClick={() => onTabSelect('leads')}
        className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 cursor-pointer transition"
      >
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Leads Attached
        </div>
        <div className="text-2xl font-bold text-blue-700 mt-1">{leadsCount}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          {openLeadsCount} Open Leads
        </div>
      </div>
    </div>
  );
}
