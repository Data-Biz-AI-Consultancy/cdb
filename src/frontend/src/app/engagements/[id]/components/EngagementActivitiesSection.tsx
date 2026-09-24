'use client';

import React, { useState, useMemo } from 'react';
import { ActivityItem } from '../types';
import { formatDateTime } from '@/lib/dateUtils';

interface EngagementActivitiesSectionProps {
  activities: ActivityItem[];
  onOpenLinkModal: () => void;
  onOpenLogModal: () => void;
  onUnlinkActivity: (actId: string) => void;
}

export function EngagementActivitiesSection({
  activities,
  onOpenLinkModal,
  onOpenLogModal,
  onUnlinkActivity,
}: EngagementActivitiesSectionProps) {
  const [timelineFilter, setTimelineFilter] = useState<
    'all' | 'meetings' | 'comms' | 'linkedin' | 'notes'
  >('all');
  const [timelineSearch, setTimelineSearch] = useState('');
  const [expandedActivityIds, setExpandedActivityIds] = useState<Set<string>>(new Set());

  const toggleExpandActivity = (actId: string) => {
    setExpandedActivityIds((prev) => {
      const next = new Set(prev);
      if (next.has(actId)) {
        next.delete(actId);
      } else {
        next.add(actId);
      }
      return next;
    });
  };

  const activityCounts = useMemo(() => {
    let linkedin = 0;
    let meetings = 0;
    let comms = 0;
    let notes = 0;

    for (const a of activities) {
      if (
        a.source === 'linkedin' ||
        a.type === 'linkedin_message' ||
        a.type === 'linkedin'
      ) {
        linkedin++;
      } else if (
        a.source === 'notion' ||
        a.type === 'notion_meeting_note' ||
        a.type === 'meeting'
      ) {
        meetings++;
      } else if (a.type === 'call' || a.type === 'email' || a.type === 'whatsapp') {
        comms++;
      } else if (a.type === 'note') {
        notes++;
      }
    }
    return {
      total: activities.length,
      linkedin,
      meetings,
      comms,
      notes,
    };
  }, [activities]);

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const isLinkedIn =
        act.source === 'linkedin' ||
        act.type === 'linkedin_message' ||
        act.type === 'linkedin';
      const isNotion =
        act.source === 'notion' ||
        act.type === 'notion_meeting_note' ||
        act.type === 'meeting';
      const isComms =
        act.type === 'call' || act.type === 'email' || act.type === 'whatsapp';
      const isNote = act.type === 'note';

      if (timelineFilter === 'linkedin' && !isLinkedIn) return false;
      if (timelineFilter === 'meetings' && !isNotion) return false;
      if (timelineFilter === 'comms' && !isComms) return false;
      if (timelineFilter === 'notes' && !isNote) return false;

      if (timelineSearch.trim()) {
        const q = timelineSearch.toLowerCase();
        const titleMatch = act.title?.toLowerCase().includes(q);
        const summaryMatch = act.summary?.toLowerCase().includes(q);
        const contentMatch = act.raw_content?.toLowerCase().includes(q);
        if (!titleMatch && !summaryMatch && !contentMatch) return false;
      }
      return true;
    });
  }, [activities, timelineFilter, timelineSearch]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      {/* Timeline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>🗓️</span> Engagement Activity Timeline
          </h2>
          <p className="text-xs text-slate-500">
            Chronological history of Notion notes, LinkedIn messages, client syncs & delivery updates.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenLinkModal}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 transition flex items-center gap-1"
          >
            <span>🔗</span> Link LinkedIn / Comms
          </button>
          <button
            onClick={onOpenLogModal}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1"
          >
            <span>➕</span> Log Activity
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
          <button
            onClick={() => setTimelineFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              timelineFilter === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({activityCounts.total})
          </button>
          <button
            onClick={() => setTimelineFilter('linkedin')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              timelineFilter === 'linkedin'
                ? 'bg-white text-blue-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💬 LinkedIn ({activityCounts.linkedin})
          </button>
          <button
            onClick={() => setTimelineFilter('meetings')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              timelineFilter === 'meetings'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📝 Notion Notes ({activityCounts.meetings})
          </button>
          <button
            onClick={() => setTimelineFilter('comms')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              timelineFilter === 'comms'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📞 Comms ({activityCounts.comms})
          </button>
          <button
            onClick={() => setTimelineFilter('notes')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              timelineFilter === 'notes'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💬 Notes ({activityCounts.notes})
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Filter timeline..."
            value={timelineSearch}
            onChange={(e) => setTimelineSearch(e.target.value)}
            className="w-full sm:w-44 px-2.5 py-1 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          {timelineSearch && (
            <button
              onClick={() => setTimelineSearch('')}
              className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-[10px]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
          <span className="text-2xl block">💬</span>
          <p className="font-semibold text-slate-600">
            No activities found matching filter criteria.
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={onOpenLinkModal}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 transition"
            >
              🔗 Link Existing LinkedIn Message / Activity
            </button>
            <button
              onClick={onOpenLogModal}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
            >
              ➕ Log New Note
            </button>
          </div>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {filteredActivities.map((act) => {
            const isExpanded = expandedActivityIds.has(act.id);
            const isLinkedIn =
              act.source === 'linkedin' ||
              act.type === 'linkedin_message' ||
              act.type === 'linkedin';
            const isNotion = act.source === 'notion' || act.type === 'notion_meeting_note';
            const isCall = act.type === 'call';
            const isEmail = act.type === 'email';
            const isMeeting = act.type === 'meeting' || isNotion;

            return (
              <div key={act.id} className="relative group">
                {/* Node Bullet Icon */}
                <div
                  className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] z-10 shadow-sm ${
                    isLinkedIn
                      ? 'bg-sky-100 border-sky-500 text-sky-700'
                      : isNotion || isMeeting
                      ? 'bg-purple-100 border-purple-500 text-purple-700'
                      : isCall
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : isEmail
                      ? 'bg-amber-100 border-amber-500 text-amber-700'
                      : 'bg-emerald-100 border-emerald-500 text-emerald-700'
                  }`}
                >
                  {isLinkedIn ? '💬' : isNotion ? '📝' : isCall ? '📞' : isEmail ? '✉️' : '💬'}
                </div>

                {/* Card Content */}
                <div className="bg-slate-50 hover:bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 text-xs space-y-2 transition shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {act.title || 'Untitled Activity'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                          isLinkedIn
                            ? 'bg-sky-100 text-sky-800'
                            : isNotion
                            ? 'bg-purple-100 text-purple-800'
                            : isCall
                            ? 'bg-blue-100 text-blue-800'
                            : isEmail
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {act.source}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatDateTime(act.occurred_at)}
                      </span>
                      <button
                        onClick={() => onUnlinkActivity(act.id)}
                        title="Unlink from this engagement"
                        className="text-slate-400 hover:text-rose-600 text-[11px] p-1 transition opacity-0 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  {act.summary && (
                    <p className="text-slate-700 leading-relaxed font-sans">{act.summary}</p>
                  )}

                  {/* Raw Content Collapsible */}
                  {act.raw_content && (
                    <div className="pt-1">
                      <button
                        onClick={() => toggleExpandActivity(act.id)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <span>
                          {isExpanded
                            ? '▾ Hide details / transcript'
                            : '▸ View details / conversation thread'}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-3 bg-white rounded-lg border border-slate-200 text-slate-800 whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-60 overflow-y-auto">
                          {act.raw_content}
                        </div>
                      )}
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
