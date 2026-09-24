'use client';

import React from 'react';

export type PersonDetailTab =
  | 'timeline'
  | 'notes'
  | 'employment'
  | 'opportunities'
  | 'leads'
  | 'changelog'
  | 'profile';

interface PersonTabNavProps {
  activeTab: PersonDetailTab;
  onSelectTab: (tab: PersonDetailTab) => void;
  activitiesCount: number;
  notesCount: number;
  employmentCount: number;
  opportunitiesCount: number;
  leadsCount: number;
  historyCount: number;
}

export function PersonTabNav({
  activeTab,
  onSelectTab,
  activitiesCount,
  notesCount,
  employmentCount,
  opportunitiesCount,
  leadsCount,
  historyCount,
}: PersonTabNavProps) {
  return (
    <div className="flex border-b border-slate-200 gap-1 bg-white px-4 pt-2 rounded-t-xl shadow-sm overflow-x-auto">
      <button
        onClick={() => onSelectTab('timeline')}
        className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
          activeTab === 'timeline'
            ? 'border-slate-900 text-slate-900'
            : 'border-transparent text-slate-500 hover:text-slate-800'
        }`}
      >
        <span>🕒</span>
        <span>Timeline ({activitiesCount})</span>
      </button>

      <button
        onClick={() => onSelectTab('notes')}
        className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
          activeTab === 'notes'
            ? 'border-slate-900 text-slate-900'
            : 'border-transparent text-slate-500 hover:text-slate-800'
        }`}
      >
        <span>📝</span>
        <span>Notes ({notesCount})</span>
      </button>

      <button
        onClick={() => onSelectTab('employment')}
        className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
          activeTab === 'employment'
            ? 'border-slate-900 text-slate-900'
            : 'border-transparent text-slate-500 hover:text-slate-800'
        }`}
      >
        <span>💼</span>
        <span>Employment ({employmentCount})</span>
      </button>

      <button
        onClick={() => onSelectTab('opportunities')}
        className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
          activeTab === 'opportunities'
            ? 'border-slate-900 text-slate-900'
            : 'border-transparent text-slate-500 hover:text-slate-800'
        }`}
      >
        <span>💰</span>
        <span>Opportunities ({opportunitiesCount})</span>
      </button>

      <button
        onClick={() => onSelectTab('leads')}
        className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
          activeTab === 'leads'
            ? 'border-slate-900 text-slate-900'
            : 'border-transparent text-slate-500 hover:text-slate-800'
        }`}
      >
        <span>🎯</span>
        <span>Leads ({leadsCount})</span>
      </button>

      <button
        onClick={() => onSelectTab('changelog')}
        className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
          activeTab === 'changelog'
            ? 'border-slate-900 text-slate-900'
            : 'border-transparent text-slate-500 hover:text-slate-800'
        }`}
      >
        <span>📜</span>
        <span>Changelog & Audit ({historyCount})</span>
      </button>

      <button
        onClick={() => onSelectTab('profile')}
        className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
          activeTab === 'profile'
            ? 'border-slate-900 text-slate-900'
            : 'border-transparent text-slate-500 hover:text-slate-800'
        }`}
      >
        <span>📋</span>
        <span>Contact & Intelligence Info</span>
      </button>
    </div>
  );
}
