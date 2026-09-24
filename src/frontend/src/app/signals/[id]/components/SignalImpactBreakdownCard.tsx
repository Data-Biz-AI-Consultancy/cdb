'use client';

import { DetectedSignal } from '../types';
import { getPriorityBadge } from '../utils';

interface SignalImpactBreakdownCardProps {
  signal: DetectedSignal;
}

export function SignalImpactBreakdownCard({ signal }: SignalImpactBreakdownCardProps) {
  const breakdown = signal.priority_breakdown || signal.metadata?.priority_breakdown;
  const pTier =
    signal.priority_tier ||
    signal.metadata?.priority_tier ||
    (signal.score && signal.score >= 90
      ? 'P0'
      : signal.score && signal.score >= 75
      ? 'P1'
      : signal.score && signal.score >= 50
      ? 'P2'
      : signal.score && signal.score >= 25
      ? 'P3'
      : 'P4');

  const effPol =
    signal.effective_polarity ||
    signal.metadata?.effective_polarity ||
    signal.signal?.category ||
    'risk';

  const pBadge = getPriorityBadge(pTier, effPol);
  const pScore =
    signal.priority_score !== undefined && signal.priority_score !== null
      ? Math.round(Number(signal.priority_score))
      : signal.score !== undefined && signal.score !== null
      ? Math.round(Number(signal.score))
      : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Business Impact Prioritization
            </h2>
            <p className="text-xs text-slate-500">
              Multi-dimensional commercial scoring distinguishing Opportunities from Risks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-3 py-1 rounded-full border font-bold ${pBadge.className}`}
          >
            {pBadge.label}
          </span>
          {pScore !== null && (
            <span className="text-sm font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              {pScore} / 100 pts
            </span>
          )}
        </div>
      </div>

      {breakdown ? (
        <div className="space-y-4">
          {/* 4 Dimension Drivers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Account Importance */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>🏢 Account Importance</span>
                <span className="font-bold text-slate-900">
                  {breakdown.account_importance_score ?? 0} / 25
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${((breakdown.account_importance_score ?? 0) / 25) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Account tier, strategic client status, and commercial classification
              </p>
            </div>

            {/* 2. Relationship Context */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>👥 Relationship Context</span>
                <span className="font-bold text-slate-900">
                  {breakdown.relationship_context_score ?? 0} / 25
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${((breakdown.relationship_context_score ?? 0) / 25) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Executive seniority, champion influence, and multi-threading
              </p>
            </div>

            {/* 3. Urgency & SLA */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>⏱️ Urgency & SLA</span>
                <span className="font-bold text-slate-900">
                  {breakdown.urgency_score ?? 0} / 25
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${((breakdown.urgency_score ?? 0) / 25) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                SLA breach latency, contract expiration cliff, and time decay
              </p>
            </div>

            {/* 4. Likely Business Impact */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>💼 Commercial Impact</span>
                <span className="font-bold text-slate-900">
                  {breakdown.business_impact_score ?? 0} / 25
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${((breakdown.business_impact_score ?? 0) / 25) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Deal value upside, revenue exposure at risk, or capital expansion
              </p>
            </div>
          </div>

          {/* Impact Rationale Callout */}
          {breakdown.impact_rationale && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1">
              <div className="font-semibold text-slate-800">
                Score Rationale & Driving Factors:
              </div>
              <p className="text-slate-600 leading-relaxed font-mono text-[11px]">
                {breakdown.impact_rationale}
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">
          Composite score: {pScore ?? 'N/A'}/100 based on account importance, relationship context, urgency, and likely business impact.
        </p>
      )}
    </div>
  );
}
