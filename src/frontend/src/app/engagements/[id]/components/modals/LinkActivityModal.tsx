'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/Modal';
import { ActivityItem } from '../../types';
import { apiFetch, ApiResponse } from '@/lib/api';

interface LinkActivityModalProps {
  isOpen: boolean;
  engagementId: string;
  existingActivityIds: Set<string>;
  onClose: () => void;
  onSubmit: (activityIds: string[]) => Promise<void>;
}

export function LinkActivityModal({
  isOpen,
  engagementId,
  existingActivityIds,
  onClose,
  onSubmit,
}: LinkActivityModalProps) {
  const [unlinkedActivities, setUnlinkedActivities] = useState<ActivityItem[]>([]);
  const [loadingUnlinked, setLoadingUnlinked] = useState(false);
  const [selectedUnlinkedIds, setSelectedUnlinkedIds] = useState<Set<string>>(new Set());
  const [unlinkedSearch, setUnlinkedSearch] = useState('');
  const [unlinkedTypeFilter, setUnlinkedTypeFilter] = useState<
    'all' | 'linkedin' | 'calls' | 'emails' | 'meetings'
  >('all');
  const [linkingInProgress, setLinkingInProgress] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedUnlinkedIds(new Set());
    setUnlinkedSearch('');
    setLoadingUnlinked(true);

    apiFetch<ApiResponse<ActivityItem[]>>('/api/v1/activities?limit=100')
      .then((res) => {
        if (res?.data) {
          const candidates = res.data.filter(
            (a) => !existingActivityIds.has(a.id) && a.engagement_id !== engagementId
          );
          setUnlinkedActivities(candidates);
        }
      })
      .catch((err) => {
        console.error('Error fetching unlinked activities:', err);
      })
      .finally(() => {
        setLoadingUnlinked(false);
      });
  }, [isOpen, engagementId, existingActivityIds]);

  const handleToggleSelectUnlinked = (actId: string) => {
    setSelectedUnlinkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(actId)) {
        next.delete(actId);
      } else {
        next.add(actId);
      }
      return next;
    });
  };

  const filteredUnlinkedActivities = useMemo(() => {
    return unlinkedActivities.filter((act) => {
      const isLinkedIn =
        act.source === 'linkedin' ||
        act.type === 'linkedin_message' ||
        act.type === 'linkedin';
      const isCall = act.type === 'call';
      const isEmail = act.type === 'email';
      const isMeeting =
        act.type === 'meeting' ||
        act.source === 'notion' ||
        act.type === 'notion_meeting_note';

      if (unlinkedTypeFilter === 'linkedin' && !isLinkedIn) return false;
      if (unlinkedTypeFilter === 'calls' && !isCall) return false;
      if (unlinkedTypeFilter === 'emails' && !isEmail) return false;
      if (unlinkedTypeFilter === 'meetings' && !isMeeting) return false;

      if (unlinkedSearch.trim()) {
        const q = unlinkedSearch.toLowerCase();
        const titleMatch = act.title?.toLowerCase().includes(q);
        const summaryMatch = act.summary?.toLowerCase().includes(q);
        const personMatch =
          `${act.person?.first_name || ''} ${act.person?.last_name || ''}`
            .toLowerCase()
            .includes(q) || act.person?.primary_email?.toLowerCase().includes(q);
        if (!titleMatch && !summaryMatch && !personMatch) return false;
      }
      return true;
    });
  }, [unlinkedActivities, unlinkedTypeFilter, unlinkedSearch]);

  const handleSelectAllUnlinked = () => {
    if (selectedUnlinkedIds.size === filteredUnlinkedActivities.length) {
      setSelectedUnlinkedIds(new Set());
    } else {
      setSelectedUnlinkedIds(new Set(filteredUnlinkedActivities.map((a) => a.id)));
    }
  };

  const handleLinkSelected = async () => {
    if (selectedUnlinkedIds.size === 0) return;
    setLinkingInProgress(true);
    try {
      await onSubmit(Array.from(selectedUnlinkedIds));
      onClose();
    } finally {
      setLinkingInProgress(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Link Activity / LinkedIn Conversation"
      subtitle="Select existing LinkedIn messages, calls, or notes to attach to this engagement timeline."
      size="lg"
    >
      <div className="space-y-4 text-sm">
        {/* Filter Pills & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
            <button
              type="button"
              onClick={() => setUnlinkedTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                unlinkedTypeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({unlinkedActivities.length})
            </button>
            <button
              type="button"
              onClick={() => setUnlinkedTypeFilter('linkedin')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                unlinkedTypeFilter === 'linkedin'
                  ? 'bg-white text-sky-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              💬 LinkedIn
            </button>
            <button
              type="button"
              onClick={() => setUnlinkedTypeFilter('calls')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                unlinkedTypeFilter === 'calls'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📞 Calls
            </button>
            <button
              type="button"
              onClick={() => setUnlinkedTypeFilter('emails')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                unlinkedTypeFilter === 'emails'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ✉️ Emails
            </button>
            <button
              type="button"
              onClick={() => setUnlinkedTypeFilter('meetings')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                unlinkedTypeFilter === 'meetings'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📝 Notion
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search available activities..."
              value={unlinkedSearch}
              onChange={(e) => setUnlinkedSearch(e.target.value)}
              className="w-full sm:w-56 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {unlinkedSearch && (
              <button
                type="button"
                onClick={() => setUnlinkedSearch('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-[10px]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* List Selection Area */}
        {loadingUnlinked ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Loading unlinked activities...
          </div>
        ) : filteredUnlinkedActivities.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
            <p className="font-semibold text-slate-600">
              No unlinked activities found matching criteria.
            </p>
            <p>All recorded conversations may already be attached to an engagement.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>
                Showing {filteredUnlinkedActivities.length} available activity/conversations
              </span>
              <button
                type="button"
                onClick={handleSelectAllUnlinked}
                className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
              >
                {selectedUnlinkedIds.size === filteredUnlinkedActivities.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>

            {filteredUnlinkedActivities.map((act) => {
              const isChecked = selectedUnlinkedIds.has(act.id);
              const isLinkedIn =
                act.source === 'linkedin' ||
                act.type === 'linkedin_message' ||
                act.type === 'linkedin';

              return (
                <label
                  key={act.id}
                  onClick={() => handleToggleSelectUnlinked(act.id)}
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition text-xs ${
                    isChecked
                      ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                      : 'bg-slate-50/60 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 truncate">
                          {act.title || 'Untitled Activity'}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            isLinkedIn
                              ? 'bg-sky-100 text-sky-800'
                              : act.source === 'notion'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {act.source}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(act.occurred_at).toLocaleDateString()}
                      </span>
                    </div>

                    {act.summary && (
                      <p className="text-slate-600 line-clamp-2 leading-relaxed font-sans">
                        {act.summary}
                      </p>
                    )}

                    {(act.person || act.company) && (
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
                        {act.person && (
                          <span>
                            👤 {act.person.first_name} {act.person.last_name}
                          </span>
                        )}
                        {act.company && <span>🏢 {act.company.name}</span>}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            {selectedUnlinkedIds.size} selected to link
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={linkingInProgress || selectedUnlinkedIds.size === 0}
              onClick={handleLinkSelected}
              className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {linkingInProgress
                ? 'Linking...'
                : `Link (${selectedUnlinkedIds.size}) to Engagement`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
