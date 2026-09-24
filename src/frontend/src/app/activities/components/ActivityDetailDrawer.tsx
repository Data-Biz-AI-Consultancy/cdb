'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, ACTIVITY_TYPE_CONFIG } from '@/lib/activityTypes';
import { formatDateTime } from '@/lib/dateUtils';

interface ActivityDetailDrawerProps {
  activity: Activity | null;
  onClose: () => void;
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
}

export const ActivityDetailDrawer: React.FC<ActivityDetailDrawerProps> = ({
  activity,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!activity) return null;

  const cfg = ACTIVITY_TYPE_CONFIG[activity.type] || {
    label: activity.type,
    icon: '📌',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-800',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    color: 'bg-slate-100 text-slate-800 border-slate-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div
        data-testid="activity-detail-drawer"
        className="bg-white w-full max-w-lg h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
      >
        <div className="space-y-6">
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{cfg.icon}</span>
              <div>
                <span className="text-xs uppercase font-bold text-indigo-600 tracking-wider">
                  {cfg.label}
                </span>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  {activity.title || 'Untitled Activity'}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
            >
              ✕
            </button>
          </div>

          {/* Timestamp & Source */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Occurred</span>
              <span className="font-semibold text-slate-800">
                {formatDateTime(activity.occurred_at || activity.created_at)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Source Channel</span>
              <span className="font-semibold text-slate-800 uppercase">
                {activity.source}
              </span>
            </div>
          </div>

          {/* Associated Entities */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Associated Entities</h4>
            {activity.person && (
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {activity.person.first_name?.[0] || '👤'}
                  </span>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {[activity.person.first_name, activity.person.last_name].filter(Boolean).join(' ') || 'Contact'}
                    </div>
                    <div className="text-xs text-slate-500">{activity.person.primary_email}</div>
                  </div>
                </div>
                <Link
                  href={`/persons/${activity.person.id}`}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  View Profile →
                </Link>
              </div>
            )}

            {activity.company && (
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                    🏢
                  </span>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{activity.company.name}</div>
                    <div className="text-xs text-slate-500">{activity.company.domain}</div>
                  </div>
                </div>
                <Link
                  href={`/companies/${activity.company.id}`}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  View Company →
                </Link>
              </div>
            )}
          </div>

          {/* Summary */}
          {activity.summary && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Summary</h4>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                {activity.summary}
              </div>
            </div>
          )}

          {/* Raw Content / Notes */}
          {activity.raw_content && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Transcript / Content</h4>
              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
                {activity.raw_content}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Actions */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={() => onDelete(activity.id)}
            className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition"
          >
            Delete Log
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(activity)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
            >
              Edit Activity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetailDrawer;
