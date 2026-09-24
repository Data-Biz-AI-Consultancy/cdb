'use client';

import React from 'react';

interface EngagementKpisProps {
  activeCount: number;
  totalValue: number;
  onTrackCount: number;
  completedCount: number;
}

export function EngagementKpis({
  activeCount,
  totalValue,
  onTrackCount,
  completedCount,
}: EngagementKpisProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Active Engagements
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{activeCount}</span>
          <span className="text-xs text-emerald-600 font-medium font-mono">In delivery</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Active Contract Value
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">${totalValue.toLocaleString()}</span>
          <span className="text-xs text-slate-500 font-medium">Total Active</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Delivery Health
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-600">{onTrackCount}</span>
          <span className="text-xs text-slate-500">On Track</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Completed Work
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-700">{completedCount}</span>
          <span className="text-xs text-slate-400">Delivered</span>
        </div>
      </div>
    </div>
  );
}
