'use client';

import React from 'react';
import Link from 'next/link';
import { Opportunity, OpportunityDetectedSignal } from '../types';
import { SignalSubFilterBar } from '@/components/SignalSubFilterBar';
import {
  SignalSubFilter,
  isSignalRisk,
  isSignalOpportunity,
  getPolarityStyle,
} from '@/lib/signalPolarity';
import { getPriorityBadge } from '@/lib/signalBadges';

interface OpportunitySignalsTabProps {
  opportunity: Opportunity;
  signals: OpportunityDetectedSignal[];
  filteredSignals: OpportunityDetectedSignal[];
  loading: boolean;
  error: string | null;
  signalSubFilter: SignalSubFilter;
  setSignalSubFilter: (filter: SignalSubFilter) => void;
  actionLoadingId: string | null;
  onUpdateStatus: (
    signalId: string,
    status: 'active' | 'acknowledged' | 'actioned' | 'snoozed' | 'dismissed' | 'resolved'
  ) => void;
  onRefresh: () => void;
}

export const OpportunitySignalsTab: React.FC<OpportunitySignalsTabProps> = ({
  opportunity,
  signals,
  filteredSignals,
  loading,
  error,
  signalSubFilter,
  setSignalSubFilter,
  actionLoadingId,
  onUpdateStatus,
  onRefresh,
}) => {
  const activeCount = signals.filter((s) => s.status === 'active').length;
  const riskCount = signals.filter(isSignalRisk).length;
  const oppCount = signals.filter(isSignalOpportunity).length;

  return (
    <div className="space-y-4" data-testid="opportunity-signals-tab">
      <SignalSubFilterBar
        totalCount={signals.length}
        activeCount={activeCount}
        riskCount={riskCount}
        oppCount={oppCount}
        current={signalSubFilter}
        onChange={setSignalSubFilter}
        onRefresh={onRefresh}
      />

      {loading && (
        <div className="py-12 flex justify-center items-center text-slate-400 gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent" />
          <span className="text-xs font-medium">Scanning account & deal signals...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
          {error}
        </div>
      )}

      {!loading && !error && filteredSignals.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-xl mx-auto mb-2">
            🛡️
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Detected Signals</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            No active risks or expansion signals matching this filter for deal &quot;
            {opportunity.title}&quot;.
          </p>
        </div>
      )}

      {/* Signals Listing */}
      {!loading && (
        <div className="space-y-3">
          {filteredSignals.map((sig) => {
            const pol = getPolarityStyle(sig);
            const priorityBadge = getPriorityBadge(sig.priority_tier, sig.effective_polarity);
            const isProcessing = actionLoadingId === sig.id;

            return (
              <div
                key={sig.id}
                data-testid={`signal-card-${sig.id}`}
                className={`bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 transition hover:shadow-md ${pol.cardBorder}`}
              >
                {/* Header: Polarity, Priority Tier, Severity, Affected Account */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border flex items-center gap-1 ${pol.badge}`}
                    >
                      <span>{pol.icon}</span>
                      <span>{pol.label}</span>
                    </span>

                    {sig.priority_tier && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider border ${priorityBadge.className}`}
                      >
                        {sig.priority_tier}
                      </span>
                    )}

                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {sig.severity}
                    </span>

                    {sig.status !== 'active' && (
                      <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                        {sig.status}
                      </span>
                    )}
                  </div>

                  {/* Affected Account Chip */}
                  {(sig.company_name || sig.company_id) && (
                    <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                      <span className="text-slate-400 text-[11px]">🏢 Affected Account:</span>
                      {sig.company_id ? (
                        <Link
                          href={`/companies/${sig.company_id}`}
                          className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {sig.company_name || 'Account View'}
                        </Link>
                      ) : (
                        <span className="font-semibold text-slate-700">{sig.company_name}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Title & Summary */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    <Link
                      href={`/signals/${sig.id}`}
                      className="hover:text-indigo-600 transition hover:underline"
                    >
                      {sig.title}
                    </Link>
                  </h4>
                  {sig.summary && (
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{sig.summary}</p>
                  )}
                </div>

                {/* Supporting Context & Why It Matters Now */}
                {(sig.why_it_matters_now ||
                  sig.evidence?.why_it_matters_now ||
                  sig.evidence?.excerpt ||
                  sig.signal?.business_interpretation) && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 space-y-2 text-xs">
                    <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>💡</span> Supporting Context &amp; Why It Matters Now:
                    </div>
                    <p className="text-slate-600 italic">
                      &quot;
                      {sig.why_it_matters_now ||
                        sig.evidence?.why_it_matters_now ||
                        sig.signal?.business_interpretation}
                      &quot;
                    </p>

                    {sig.evidence?.excerpt && (
                      <div className="mt-1 pt-1.5 border-t border-slate-200 text-[11px] text-slate-500 font-mono bg-white p-2 rounded border">
                        <span className="font-semibold text-slate-700 font-sans">Evidence: </span>
                        {sig.evidence.excerpt}
                      </div>
                    )}

                    {/* Meta flags: Verification & Source Reliability */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-500">
                      {sig.source_reliability && (
                        <span className="bg-slate-200/70 px-1.5 py-0.5 rounded">
                          Source: <strong className="uppercase">{sig.source_reliability}</strong>
                        </span>
                      )}
                      {sig.evidence?.verification_status && (
                        <span className="bg-slate-200/70 px-1.5 py-0.5 rounded">
                          Status:{' '}
                          <strong className="capitalize">{sig.evidence.verification_status}</strong>
                        </span>
                      )}
                      {sig.confidence_tier && (
                        <span className="bg-slate-200/70 px-1.5 py-0.5 rounded">
                          Confidence:{' '}
                          <strong className="capitalize">{sig.confidence_tier}</strong>
                        </span>
                      )}
                      {sig.detected_at && (
                        <span className="text-slate-400">
                          Detected: {new Date(sig.detected_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Connected Counterparties */}
                {sig.connected_persons && sig.connected_persons.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                    <span className="text-indigo-600 font-bold">👤 Connected Contact:</span>
                    <span className="font-medium text-slate-800">
                      {sig.connected_persons[0].name || sig.connected_persons[0].primary_email}
                    </span>
                    {sig.connected_persons[0].role && (
                      <span className="text-slate-400 text-[11px]">
                        ({sig.connected_persons[0].role})
                      </span>
                    )}
                  </div>
                )}

                {/* Actions Bar */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <Link
                    href={`/signals/${sig.id}`}
                    className="font-semibold text-indigo-600 hover:text-indigo-800 transition hover:underline"
                  >
                    Investigate Full Signal →
                  </Link>

                  <div className="flex items-center gap-1.5">
                    {sig.status === 'active' && (
                      <>
                        <button
                          disabled={isProcessing}
                          onClick={() => onUpdateStatus(sig.id, 'acknowledged')}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-[11px] transition"
                        >
                          Acknowledge
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => onUpdateStatus(sig.id, 'actioned')}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-medium text-[11px] transition"
                        >
                          Take Action
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => onUpdateStatus(sig.id, 'resolved')}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded font-medium text-[11px] transition"
                        >
                          Resolve
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => onUpdateStatus(sig.id, 'dismissed')}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-medium text-[11px] transition"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
