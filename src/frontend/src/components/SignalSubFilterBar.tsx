'use client';

import React from 'react';
import { SignalSubFilter } from '@/lib/signalPolarity';

export interface SignalSubFilterBarProps {
  /** Total count (all statuses). */
  totalCount: number;
  activeCount: number;
  riskCount: number;
  oppCount: number;
  current: SignalSubFilter;
  onChange: (filter: SignalSubFilter) => void;
  /** Optional right-side refresh action. */
  onRefresh?: () => void;
}

/**
 * Shared signal sub-filter pill bar — Active / All / Risks / Opportunities.
 * Previously duplicated in CompanySignalsTab and OpportunitySignalsTab.
 */
export const SignalSubFilterBar: React.FC<SignalSubFilterBarProps> = ({
  totalCount,
  activeCount,
  riskCount,
  oppCount,
  current,
  onChange,
  onRefresh,
}) => {
  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
          Filter:
        </span>

        <button
          id="signal-subfilter-active"
          onClick={() => onChange('active')}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
            current === 'active'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Active ({activeCount})
        </button>

        <button
          id="signal-subfilter-all"
          onClick={() => onChange('all')}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
            current === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All ({totalCount})
        </button>

        <button
          id="signal-subfilter-risk"
          onClick={() => onChange('risk')}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
            current === 'risk'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
          }`}
        >
          <span>⚠️</span> Risks ({riskCount})
        </button>

        <button
          id="signal-subfilter-opportunity"
          onClick={() => onChange('opportunity')}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
            current === 'opportunity'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <span>🚀</span> Opportunities ({oppCount})
        </button>
      </div>

      {onRefresh && (
        <button
          id="signal-subfilter-refresh"
          onClick={onRefresh}
          className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium transition"
        >
          🔄 Refresh Signals
        </button>
      )}
    </div>
  );
};

export default SignalSubFilterBar;
