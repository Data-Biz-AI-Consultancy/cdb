'use client';

import React from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/currency';
import { Opportunity } from '../types';
import { CompanySignalSummary } from '../hooks/useOpportunities';

interface OpportunityCardProps {
  opp: Opportunity;
  signalSummary?: CompanySignalSummary;
  onOpenDetail: (opp: Opportunity) => void;
  onAdvanceStage: (oppId: string) => void;
  onDragStart: (e: React.DragEvent, oppId: string) => void;
  onOpenCloseModal: (oppId: string, outcome: 'closed_won' | 'closed_lost') => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opp,
  signalSummary,
  onOpenDetail,
  onAdvanceStage,
  onDragStart,
  onOpenCloseModal,
}) => {
  const primaryCompany = opp.companies && opp.companies.length > 0 ? opp.companies[0] : null;
  const primaryPerson = opp.persons && opp.persons.length > 0 ? opp.persons[0] : null;

  const isClosed = opp.stage === 'closed_won' || opp.stage === 'closed_lost';

  return (
    <div
      data-testid={`opp-card-${opp.id}`}
      draggable
      onDragStart={(e) => onDragStart(e, opp.id)}
      onClick={() => onOpenDetail(opp)}
      className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs hover:shadow-md transition cursor-pointer space-y-2.5 relative group border-l-4 border-l-indigo-500"
    >
      {/* Header: Title & Value */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug group-hover:text-indigo-600 transition">
          {opp.title}
        </h4>
        {opp.value !== null && opp.value !== undefined && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 shrink-0">
            {formatMoney(opp.value, opp.currency)}
          </span>
        )}
      </div>

      {/* Prioritized Signals & Risk Indicators */}
      {signalSummary && signalSummary.totalActive > 0 && (
        <div
          data-testid={`opp-signals-badge-${opp.id}`}
          className="flex flex-wrap items-center gap-1.5 pt-0.5"
        >
          {signalSummary.risksCount > 0 && (
            <span
              title={`${signalSummary.risksCount} active risk signals`}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"
            >
              <span>⚠️</span> {signalSummary.risksCount} Risk{signalSummary.risksCount > 1 ? 's' : ''}
            </span>
          )}

          {signalSummary.oppsCount > 0 && (
            <span
              title={`${signalSummary.oppsCount} active growth/intent signals`}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
            >
              <span>🚀</span> {signalSummary.oppsCount} Opp{signalSummary.oppsCount > 1 ? 's' : ''}
            </span>
          )}

          {signalSummary.highestPriorityTier && (
            <span
              title={`Highest priority: ${signalSummary.highestPriorityTier}`}
              className={`text-[9px] font-black px-1.5 py-0.2 rounded text-white ${
                signalSummary.highestPriorityTier === 'P0'
                  ? 'bg-red-600'
                  : signalSummary.highestPriorityTier === 'P1'
                  ? 'bg-rose-500'
                  : 'bg-amber-500'
              }`}
            >
              {signalSummary.highestPriorityTier}
            </span>
          )}
        </div>
      )}

      {/* Staleness & Overdue Indicators */}
      {(opp.is_stale || opp.is_expired || opp.is_overdue) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {opp.is_stale && !opp.is_expired && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              ⚠️ Stale {opp.days_inactive ? `(${opp.days_inactive}d)` : ''}
            </span>
          )}
          {opp.is_expired && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
              ⛔ Expired {opp.days_inactive ? `(${opp.days_inactive}d)` : ''}
            </span>
          )}
          {opp.is_overdue && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
              🚨 Overdue {opp.days_overdue ? `(${opp.days_overdue}d)` : ''}
            </span>
          )}
        </div>
      )}

      {/* Attached Organization & Contact */}
      {(primaryCompany || primaryPerson) && (
        <div className="pt-1.5 border-t border-slate-100 space-y-1 text-xs">
          {primaryCompany && (
            <div className="flex items-center gap-1.5 text-slate-700 truncate font-medium">
              <span className="text-slate-400">🏢</span>
              <span className="truncate">{primaryCompany.company_name || 'Attached Company'}</span>
            </div>
          )}
          {primaryPerson && (
            <div className="flex items-center gap-1.5 text-slate-600 truncate text-[11px]">
              <span className="text-slate-400">👤</span>
              <span className="truncate">
                {primaryPerson.person_name || primaryPerson.person_email || 'Attached Contact'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Probability bar & Expected Close Date */}
      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                (opp.probability ?? 0) >= 70
                  ? 'bg-emerald-500'
                  : (opp.probability ?? 0) >= 40
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
              }`}
              style={{ width: `${opp.probability ?? 0}%` }}
            />
          </div>
          <span className="font-semibold">{opp.probability ?? 0}%</span>
        </div>

        {opp.expected_close_date && (
          <span className="font-mono text-[10px] text-slate-400">
            📅 {new Date(opp.expected_close_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Quick Stage Progression Buttons */}
      {!isClosed && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="pt-1 flex items-center justify-between gap-1 text-[11px]"
        >
          <div className="flex items-center gap-1">
            <button
              onClick={() => onOpenCloseModal(opp.id, 'closed_won')}
              title="Mark as Won"
              className="px-1.5 py-0.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded font-semibold transition"
            >
              🏆 Won
            </button>
            <button
              onClick={() => onOpenCloseModal(opp.id, 'closed_lost')}
              title="Mark as Lost"
              className="px-1.5 py-0.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded font-semibold transition"
            >
              ❌ Lost
            </button>
          </div>

          <button
            onClick={() => onAdvanceStage(opp.id)}
            title="Advance stage"
            className="px-2 py-0.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded font-semibold transition"
          >
            Advance →
          </button>
        </div>
      )}
    </div>
  );
};
