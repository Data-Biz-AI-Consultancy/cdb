'use client';

import React, { useState } from 'react';
import { formatDateTime } from '@/lib/dateUtils';

interface PersonChangelogTabProps {
  history: any[];
}

export function PersonChangelogTab({ history }: PersonChangelogTabProps) {
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<string>('all');

  const filteredHistory = history.filter((h) => {
    if (historyCategoryFilter === 'all') return true;
    return h.action?.category === historyCategoryFilter;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Audit History & Changelog ({history.length})
          </h2>
          <p className="text-xs text-slate-500">
            Immutable event trail of all status changes, profile edits, segmentations, and merge operations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-slate-500">Category:</span>
          <select
            value={historyCategoryFilter}
            onChange={(e) => setHistoryCategoryFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
          >
            <option value="all">All Categories ({history.length})</option>
            <option value="profile">Profile Updates</option>
            <option value="segmentation">Segmentation & Temperature</option>
            <option value="career">Career Affiliations</option>
            <option value="entity_resolution">Entity Resolution Merges</option>
            <option value="pipeline">Pipeline & Deals</option>
            <option value="bulk_ops">Bulk Operations</option>
          </select>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="p-10 text-center text-slate-500 space-y-2">
          <p className="text-sm">No audit history recorded yet for this person record.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-4 sm:ml-6 space-y-6 py-2">
          {filteredHistory.map((h) => {
            const dateStr = formatDateTime(h.created_at);

            return (
              <div key={h.id} className="relative pl-6 sm:pl-8 group">
                {/* Circle dot */}
                <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-slate-600 group-hover:border-slate-900 transition shadow-sm flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{h.action?.icon || '📌'}</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {h.action?.name || h.action_id}
                      </span>
                      {h.action?.category && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border">
                          {h.action.category}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{dateStr}</span>
                  </div>

                  {h.summary && (
                    <p className="text-xs text-slate-700 mt-2 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {h.summary}
                    </p>
                  )}

                  {/* Structured Field Changes Diff */}
                  {h.changes && Object.keys(h.changes).length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Field-Level Changes:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {Object.entries(h.changes).map(([field, diff]: [string, any]) => {
                          if (
                            diff &&
                            typeof diff === 'object' &&
                            ('old' in diff || 'new' in diff)
                          ) {
                            return (
                              <div key={field} className="p-2 bg-slate-50/80 rounded border text-xs">
                                <span className="font-semibold text-slate-700 font-mono">
                                  {field}:
                                </span>{' '}
                                <span className="text-red-600 line-through mr-1">
                                  {diff.old !== null && diff.old !== undefined
                                    ? String(diff.old)
                                    : 'null'}
                                </span>{' '}
                                <span className="text-emerald-700 font-medium">
                                  →{' '}
                                  {diff.new !== null && diff.new !== undefined
                                    ? String(diff.new)
                                    : 'null'}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div
                              key={field}
                              className="p-2 bg-slate-50/80 rounded border text-xs font-mono"
                            >
                              <span className="font-semibold text-slate-700">{field}:</span>{' '}
                              <span className="text-slate-800">{JSON.stringify(diff)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
