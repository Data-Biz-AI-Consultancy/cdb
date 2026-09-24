'use client';

import React from 'react';
import { ActivityStats } from '@/lib/activityTypes';
import ActivityTimelineChart from '@/components/ActivityTimelineChart';

interface ActivityKpisProps {
  stats: ActivityStats | null;
  totalCount: number;
}

export const ActivityKpis: React.FC<ActivityKpisProps> = ({ stats, totalCount }) => {
  return (
    <div className="space-y-4">
      {/* Aggregated KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* 1. Total Activities */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Total Activities
            </span>
            <span className="text-lg">📊</span>
          </div>
          <div
            className="text-2xl font-bold text-slate-900 mt-2"
            data-testid="kpi-total-activities"
          >
            {(stats?.total ?? totalCount).toLocaleString('en-US')}
          </div>
          <div className="text-xs text-slate-400 mt-1">All logged interactions</div>
        </div>

        {/* 2. LinkedIn Messages */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-indigo-600 tracking-wider">
              LinkedIn Msgs
            </span>
            <span className="text-lg">🔗</span>
          </div>
          <div
            className="text-2xl font-bold text-indigo-700 mt-2"
            data-testid="kpi-linkedin-messages"
          >
            {(stats?.by_type?.linkedin_message ?? 0).toLocaleString('en-US')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Inbound & outbound msgs</div>
        </div>

        {/* 3. Emails (Upcoming) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-violet-600 tracking-wider">
              Emails
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200">
              Upcoming
            </span>
          </div>
          <div
            className="text-2xl font-bold text-violet-700 mt-2"
            data-testid="kpi-emails"
          >
            {(stats?.by_type?.email ?? 0).toLocaleString('en-US')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Direct mail sync</div>
        </div>

        {/* 4. Meetings */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-emerald-600 tracking-wider">
              Meeting Notes
            </span>
            <span className="text-lg">🤝</span>
          </div>
          <div
            className="text-2xl font-bold text-emerald-700 mt-2"
            data-testid="kpi-meetings"
          >
            {(stats?.by_type?.meeting ?? 0).toLocaleString('en-US')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Notion notes & debriefs</div>
        </div>

        {/* 5. Calls (To be updated) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-sky-600 tracking-wider">
              Phone Calls
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">
              To be updated
            </span>
          </div>
          <div
            className="text-2xl font-bold text-sky-700 mt-2"
            data-testid="kpi-calls"
          >
            {(stats?.by_type?.call ?? 0).toLocaleString('en-US')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Calls & voicemails</div>
        </div>
      </div>

      {/* Time Evolution Chart (Collapsible by default) */}
      <ActivityTimelineChart
        timeline={stats?.timeline || []}
        totalActivities={stats?.total ?? totalCount}
        defaultExpanded={false}
      />
    </div>
  );
};

export default ActivityKpis;
