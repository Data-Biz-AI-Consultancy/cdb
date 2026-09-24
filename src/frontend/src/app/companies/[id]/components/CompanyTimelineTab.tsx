import React from 'react';
import Link from 'next/link';
import { ACTIVITY_TYPE_META } from '../types';

interface CompanyTimelineTabProps {
  activities: any[];
  filteredActivities: any[];
  employees: any[];
  activityTypeFilter: string;
  setActivityTypeFilter: (filter: string) => void;
  onLogActivity: () => void;
}

export const CompanyTimelineTab: React.FC<CompanyTimelineTabProps> = ({
  activities,
  filteredActivities,
  employees,
  activityTypeFilter,
  setActivityTypeFilter,
  onLogActivity,
}) => {
  return (
    <div className="space-y-4">
      {/* Activity Filters & Log Button */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Type:</span>
          <button
            onClick={() => setActivityTypeFilter('all')}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
              activityTypeFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({activities.length})
          </button>
          {Object.entries(ACTIVITY_TYPE_META).map(([typeKey, meta]) => {
            const count = activities.filter((a) => a.type === typeKey).length;
            if (count === 0 && activityTypeFilter !== typeKey) return null;
            return (
              <button
                key={typeKey}
                onClick={() => setActivityTypeFilter(typeKey)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                  activityTypeFilter === typeKey
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onLogActivity}
          className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm transition"
        >
          + Log Activity
        </button>
      </div>

      {/* Activity List */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3 shadow-sm">
          <p className="text-sm text-slate-500">No activities recorded for this filter.</p>
          <button
            onClick={onLogActivity}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm"
          >
            + Log First Activity
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((act) => {
            const meta = ACTIVITY_TYPE_META[act.type] || {
              label: act.type,
              icon: '📌',
              color: 'bg-slate-100 text-slate-800 border-slate-200',
            };
            const linkedPerson = employees.find((e) => e.person_id === act.person_id);

            return (
              <div
                key={act.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition flex items-start gap-3.5"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-lg shrink-0 border border-slate-200 shadow-xs">
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{act.title || meta.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        {act.source}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(act.occurred_at).toLocaleString()}
                    </span>
                  </div>

                  {linkedPerson && (
                    <div className="mt-1 text-xs text-slate-600">
                      <span>With contact: </span>
                      <Link
                        href={`/persons/${linkedPerson.person_id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {linkedPerson.first_name} {linkedPerson.last_name} ({linkedPerson.title || 'Staff'})
                      </Link>
                    </div>
                  )}

                  {act.summary && (
                    <p className="text-xs text-slate-600 mt-2 bg-slate-50/80 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                      {act.summary}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CompanyTimelineTab;
