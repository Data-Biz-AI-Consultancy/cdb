'use client';

import React from 'react';
import { CompanyActiveTab } from '../types';

interface CompanyTabsNavProps {
  activeTab: CompanyActiveTab;
  setActiveTab: (tab: CompanyActiveTab) => void;
  nextBestActionsCount: number;
  employeesCount: number;
  activitiesCount: number;
  notesCount: number;
  opportunitiesCount: number;
  leadsCount: number;
  engagementsCount: number;
  activeSignalsCount: number;
  totalSignalsCount: number;
}

export function CompanyTabsNav({
  activeTab,
  setActiveTab,
  nextBestActionsCount,
  employeesCount,
  activitiesCount,
  notesCount,
  opportunitiesCount,
  leadsCount,
  engagementsCount,
  activeSignalsCount,
  totalSignalsCount,
}: CompanyTabsNavProps) {
  return (
    <div className="flex border-b border-slate-200 overflow-x-auto gap-2 bg-white px-3 pt-2 rounded-t-xl border">
      <button
        onClick={() => setActiveTab('brief')}
        className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
          activeTab === 'brief'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
        }`}
      >
        <span>🤖 AI Account Brief & Actions</span>
        {nextBestActionsCount > 0 && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
            {nextBestActionsCount} Actions
          </span>
        )}
      </button>

      <button
        onClick={() => setActiveTab('employees')}
        className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
          activeTab === 'employees'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
        }`}
      >
        <span>👥 Employees & Contacts</span>
        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
          {employeesCount}
        </span>
      </button>

      <button
        onClick={() => setActiveTab('timeline')}
        className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
          activeTab === 'timeline'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
        }`}
      >
        <span>⏱️ Activity Timeline</span>
        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
          {activitiesCount}
        </span>
      </button>

      <button
        onClick={() => setActiveTab('notes')}
        className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
          activeTab === 'notes'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
        }`}
      >
        <span>📌 Notes</span>
        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
          {notesCount}
        </span>
      </button>

      <button
        onClick={() => setActiveTab('opportunities')}
        className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
          activeTab === 'opportunities'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
        }`}
      >
        <span>💼 Opportunities</span>
        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
          {opportunitiesCount}
        </span>
      </button>

      <button
        onClick={() => setActiveTab('leads')}
        className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
          activeTab === 'leads'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
        }`}
      >
        <span>🎯 Leads & Signals</span>
        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
          {leadsCount}
        </span>
      </button>

      <button
        onClick={() => setActiveTab('engagements')}
        className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
          activeTab === 'engagements'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
        }`}
      >
        <span>📋 Engagements</span>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
          {engagementsCount}
        </span>
      </button>

      <button
        onClick={() => setActiveTab('signals')}
        className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
          activeTab === 'signals'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
        }`}
      >
        <span>⚡ Signals</span>
        {activeSignalsCount > 0 ? (
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold animate-pulse">
            {activeSignalsCount} Active
          </span>
        ) : (
          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
            {totalSignalsCount}
          </span>
        )}
      </button>

      <button
        onClick={() => setActiveTab('profile')}
        className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
          activeTab === 'profile'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
        }`}
      >
        <span>🏢 Company Details</span>
      </button>
    </div>
  );
}
