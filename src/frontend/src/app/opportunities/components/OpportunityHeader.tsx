'use client';

import React from 'react';
import { formatMoney } from '@/lib/currency';
import { Opportunity } from '../types';

interface OpportunityHeaderProps {
  opps: Opportunity[];
  onOpenCreate: () => void;
}

export const OpportunityHeader: React.FC<OpportunityHeaderProps> = ({ opps, onOpenCreate }) => {
  const activeOpps = opps.filter((o) => !['closed_won', 'closed_lost'].includes(o.stage));
  const totalActiveValue = activeOpps.reduce((sum, o) => sum + (o.value ? Number(o.value) : 0), 0);
  const weightedPipelineValue = activeOpps.reduce(
    (sum, o) => sum + ((o.value ? Number(o.value) : 0) * (o.probability || 0)) / 100,
    0
  );
  const wonOpps = opps.filter((o) => o.stage === 'closed_won');
  const lostOpps = opps.filter((o) => o.stage === 'closed_lost');
  const closedCount = wonOpps.length + lostOpps.length;
  const winRate = closedCount > 0 ? Math.round((wonOpps.length / closedCount) * 100) : 0;
  const wonValue = wonOpps.reduce((sum, o) => sum + (o.value ? Number(o.value) : 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <h1 className="text-2xl font-black tracking-tight">Opportunities Pipeline</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Track deal stages, revenue forecasts, and automated opportunity & risk signals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-xs">
            Interactive Kanban
          </span>
          <button
            onClick={onOpenCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
          >
            <span>+</span> New Opportunity
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active Pipeline</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {formatMoney(totalActiveValue, 'USD')}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{activeOpps.length} active deals</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold uppercase text-indigo-600 tracking-wider">Weighted Forecast</div>
          <div className="text-xl sm:text-2xl font-bold text-indigo-700 mt-1">
            {formatMoney(weightedPipelineValue, 'USD')}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">confidence-adjusted</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold uppercase text-emerald-600 tracking-wider">Won Revenue</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
            {formatMoney(wonValue, 'USD')}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{wonOpps.length} deals won</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Win Rate</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{winRate}%</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {wonOpps.length} won / {closedCount} closed
          </div>
        </div>
      </div>
    </div>
  );
};
