'use client';

import React from 'react';

interface MetricsData {
  total: number;
  active: number;
  admins: number;
  salesAndOps: number;
}

interface UsersMetricsCardsProps {
  metrics: MetricsData;
}

export const UsersMetricsCards: React.FC<UsersMetricsCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Total Users
        </div>
        <div className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">Configured accounts</div>
      </div>

      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
          Active Members
        </div>
        <div className="text-2xl font-black text-emerald-700 mt-1">{metrics.active}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">Eligible for signal routing</div>
      </div>

      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
          Administrators
        </div>
        <div className="text-2xl font-black text-indigo-700 mt-1">{metrics.admins}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">System managers</div>
      </div>

      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-600">
          Sales & RevOps
        </div>
        <div className="text-2xl font-black text-purple-700 mt-1">{metrics.salesAndOps}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">AE, SDR & Leads</div>
      </div>
    </div>
  );
};
