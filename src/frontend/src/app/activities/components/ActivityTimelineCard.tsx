'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, ACTIVITY_TYPE_CONFIG, ACTIVITY_SOURCE_BADGES } from '@/lib/activityTypes';
import { formatRelativeTime } from '@/lib/dateUtils';

interface ActivityTimelineCardProps {
  act: Activity;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onSelect: (act: Activity) => void;
  onEdit: (act: Activity) => void;
  onDelete: (id: string) => void;
}

export const ActivityTimelineCard: React.FC<ActivityTimelineCardProps> = ({
  act,
  isExpanded,
  onToggleExpand,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const cfg = ACTIVITY_TYPE_CONFIG[act.type] || {
    label: act.type,
    icon: '📌',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-800',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    color: 'bg-slate-100 text-slate-800 border-slate-200',
  };

  const sourceCfg = ACTIVITY_SOURCE_BADGES[act.source] || {
    label: act.source,
    bg: 'bg-slate-100 text-slate-700',
  };

  const hasRawContent = Boolean(act.raw_content && act.raw_content.trim() !== act.summary?.trim());

  const personName = act.person
    ? [act.person.first_name, act.person.last_name].filter(Boolean).join(' ') ||
      act.person.primary_email ||
      'Contact'
    : null;

  return (
    <div
      data-testid={`activity-card-${act.id}`}
      className="relative bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition duration-150 group"
    >
      {/* Timeline Node Icon */}
      <span className="absolute -left-[35px] top-4 w-7 h-7 rounded-full bg-white border-2 border-indigo-500 shadow-xs flex items-center justify-center text-xs">
        {cfg.icon}
      </span>

      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
              {cfg.icon} {cfg.label}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${sourceCfg.bg}`}>
              {sourceCfg.label}
            </span>
            <span className="text-xs text-slate-400">
              {formatRelativeTime(act.occurred_at || act.created_at)}
            </span>
          </div>

          <h4
            onClick={() => onSelect(act)}
            className="text-base font-bold text-slate-900 hover:text-indigo-600 cursor-pointer transition pt-1"
          >
            {act.title || 'Untitled Activity'}
          </h4>
        </div>

        {/* Card Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => onSelect(act)}
            className="text-xs text-slate-500 hover:text-indigo-600 font-medium px-2 py-1 rounded hover:bg-slate-50 transition"
          >
            View
          </button>
          <button
            onClick={() => onEdit(act)}
            className="text-xs text-slate-500 hover:text-indigo-600 font-medium px-2 py-1 rounded hover:bg-slate-50 transition"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(act.id)}
            className="text-xs text-rose-500 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 transition"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Summary Text */}
      {act.summary && (
        <p className="text-sm text-slate-700 mt-2.5 whitespace-pre-line leading-relaxed">
          {act.summary}
        </p>
      )}

      {/* Raw Content Expandable Toggle */}
      {hasRawContent && (
        <div className="mt-3">
          <button
            onClick={() => onToggleExpand(act.id)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>{isExpanded ? '▼ Hide transcript / details' : '▶ View full transcript / details'}</span>
          </button>
          {isExpanded && (
            <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-60 overflow-y-auto">
              {act.raw_content}
            </div>
          )}
        </div>
      )}

      {/* Attached Entity Chips */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {act.person && (
          <Link
            href={`/persons/${act.person.id}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-700 font-medium transition"
          >
            <span>👤</span>
            <span>{personName}</span>
            {act.person.primary_email && (
              <span className="text-slate-400 font-normal">({act.person.primary_email})</span>
            )}
          </Link>
        )}

        {act.company && (
          <Link
            href={`/companies/${act.company.id}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-700 font-medium transition"
          >
            <span>🏢</span>
            <span>{act.company.name}</span>
            {act.company.domain && (
              <span className="text-slate-400 font-normal">({act.company.domain})</span>
            )}
          </Link>
        )}

        <span className="text-[11px] text-slate-400 ml-auto">
          {new Date(act.occurred_at || act.created_at).toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default ActivityTimelineCard;
