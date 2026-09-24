'use client';

import React, { useMemo } from 'react';
import { Activity } from '@/lib/activityTypes';
import { getDateBucket } from '@/lib/dateUtils';
import TablePagination from '@/components/TablePagination';
import ActivityTimelineCard from './ActivityTimelineCard';

interface ActivityTimelineFeedProps {
  activities: Activity[];
  loading: boolean;
  searchQuery: string;
  typeFilter: string;
  sourceFilter: string;
  dateFilter: string;
  onOpenCreate: () => void;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  expandedContentIds: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
  onSelect: (act: Activity) => void;
  onEdit: (act: Activity) => void;
  onDelete: (id: string) => void;
}

export const ActivityTimelineFeed: React.FC<ActivityTimelineFeedProps> = ({
  activities,
  loading,
  searchQuery,
  typeFilter,
  sourceFilter,
  dateFilter,
  onOpenCreate,
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  expandedContentIds,
  onToggleExpand,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const groupedActivities = useMemo(() => {
    const groups: { title: string; items: Activity[] }[] = [];
    activities.forEach((act) => {
      const bucket = getDateBucket(act.occurred_at || act.created_at);
      const existing = groups.find((g) => g.title === bucket);
      if (existing) {
        existing.items.push(act);
      } else {
        groups.push({ title: bucket, items: [act] });
      }
    });
    return groups;
  }, [activities]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 bg-white rounded-xl border border-slate-200 text-slate-400">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-600 border-t-transparent mr-3" />
        <span>Loading activity timeline...</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="text-4xl mb-3">📭</div>
        <h3 className="text-base font-bold text-slate-800">No activities found</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          {searchQuery || typeFilter || sourceFilter || dateFilter !== 'all'
            ? 'Try resetting your search filters or date range.'
            : 'Start logging interactions, meetings, and notes with your contacts.'}
        </p>
        <button
          onClick={onOpenCreate}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
        >
          + Log First Activity
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groupedActivities.map((group) => (
        <div key={group.title} className="space-y-3">
          {/* Date Group Header */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              {group.title}
            </span>
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">{group.items.length} logged</span>
          </div>

          {/* Items in Date Bucket */}
          <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-4">
            {group.items.map((act) => (
              <ActivityTimelineCard
                key={act.id}
                act={act}
                isExpanded={!!expandedContentIds[act.id]}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        entityLabel="activity"
        showFirstLast={false}
        pageSizeOptions={[20, 50, 100]}
      />
    </div>
  );
};

export default ActivityTimelineFeed;
