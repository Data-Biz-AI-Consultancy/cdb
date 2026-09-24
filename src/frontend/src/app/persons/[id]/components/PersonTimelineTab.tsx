'use client';

import React, { useState } from 'react';
import { ACTIVITY_TYPE_CONFIG } from '@/lib/activityTypes';
import { formatDateTime } from '@/lib/dateUtils';

interface PersonTimelineTabProps {
  fullName: string;
  activities: any[];
  onOpenLogModal: () => void;
}

export function PersonTimelineTab({
  fullName,
  activities,
  onOpenLogModal,
}: PersonTimelineTabProps) {
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');

  const filteredActivities = activities.filter((act) => {
    if (activityTypeFilter === 'all') return true;
    return act.type === activityTypeFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-slate-500">Filter Type:</span>
          <select
            value={activityTypeFilter}
            onChange={(e) => setActivityTypeFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
          >
            <option value="all">All Activities & Interactions ({activities.length})</option>
            <option value="linkedin_message">LinkedIn Messages</option>
            <option value="meeting">Notion Meeting Notes</option>
            <option value="email">Emails</option>
            <option value="call">Phone Calls</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="note">Internal Notes</option>
          </select>
        </div>

        <button
          onClick={onOpenLogModal}
          className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm"
        >
          + Log Interaction
        </button>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="bg-white p-12 border border-slate-200 rounded-xl text-center shadow-sm space-y-3">
          <div className="text-3xl">📭</div>
          <h3 className="font-semibold text-slate-800 text-sm">No activity logs recorded</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No recent LinkedIn messages, Notion meeting notes, or emails found for {fullName}.
          </p>
          <button
            onClick={onOpenLogModal}
            className="text-xs bg-slate-900 text-white px-3.5 py-2 rounded-lg font-medium shadow-sm hover:bg-slate-800"
          >
            Log First Activity
          </button>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-4 sm:ml-6 space-y-6 py-2">
          {filteredActivities.map((act) => {
            const meta = ACTIVITY_TYPE_CONFIG[act.type] || {
              label: act.type,
              icon: '📌',
              color: 'bg-slate-100 text-slate-800 border-slate-200',
            };
            const dateStr = formatDateTime(act.occurred_at || act.created_at);

            return (
              <div key={act.id} className="relative pl-6 sm:pl-8 group">
                {/* Circle timeline dot */}
                <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-slate-600 group-hover:border-slate-900 transition shadow-sm flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${meta.color} flex items-center gap-1`}
                      >
                        <span>{meta.icon}</span>
                        <span>{meta.label}</span>
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                        {act.title || 'Untitled Interaction'}
                      </h4>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{dateStr}</span>
                  </div>

                  {act.summary && (
                    <p className="text-sm text-slate-700 mt-2.5 whitespace-pre-line bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                      {act.summary}
                    </p>
                  )}

                  {act.raw_content && (
                    <details className="mt-2 text-xs text-slate-500">
                      <summary className="cursor-pointer hover:text-slate-800 font-medium">
                        View Full Message Content
                      </summary>
                      <pre className="mt-1.5 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                        {act.raw_content}
                      </pre>
                    </details>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                    <div className="flex items-center gap-3">
                      <span>
                        Source: <strong className="text-slate-700 font-mono">{act.source}</strong>
                      </span>
                      {act.source_id && (
                        <span className="text-slate-400 truncate max-w-[200px]" title={act.source_id}>
                          Ref: {act.source_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
