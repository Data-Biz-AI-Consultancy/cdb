'use client';

import React from 'react';
import Link from 'next/link';
import { SignalSubFilterBar } from '@/components/SignalSubFilterBar';
import {
  SignalSubFilter,
  applySignalSubFilter,
  isSignalRisk,
  isSignalOpportunity,
} from '@/lib/signalPolarity';
import { getSeverityBadge, getCategoryBadge } from '@/lib/signalBadges';

interface CompanySignalsTabProps {
  company: any;
  detectedSignals: any[];
  signalSubFilter: SignalSubFilter;
  setSignalSubFilter: (filter: SignalSubFilter) => void;
}

export const CompanySignalsTab: React.FC<CompanySignalsTabProps> = ({
  company,
  detectedSignals,
  signalSubFilter,
  setSignalSubFilter,
}) => {
  const filteredSignals = applySignalSubFilter(detectedSignals, signalSubFilter);

  const activeCount = detectedSignals.filter((s) => s.status === 'active').length;
  const riskCount = detectedSignals.filter(isSignalRisk).length;
  const oppCount = detectedSignals.filter(isSignalOpportunity).length;

  return (
    <div className="space-y-4">
      <SignalSubFilterBar
        totalCount={detectedSignals.length}
        activeCount={activeCount}
        riskCount={riskCount}
        oppCount={oppCount}
        current={signalSubFilter}
        onChange={setSignalSubFilter}
      />

      {/* Signals List */}
      {filteredSignals.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center text-2xl mx-auto mb-3">
            🛡️
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Detected Signals for this Filter</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            No active risks or commercial opportunities have triggered under the current criteria for{' '}
            {company.name}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSignals.map((sig) => {
            const severityStyles = getSeverityBadge(sig.severity);
            const categoryStyles = getCategoryBadge(sig.signal?.category);
            const evidence = sig.evidence || sig.metadata_payload?.evidence;

            return (
              <div
                key={sig.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-lg shrink-0">
                      {sig.signal?.icon || (sig.severity === 'critical' ? '🚨' : '⚡')}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{sig.title}</h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${severityStyles}`}
                        >
                          {sig.severity}
                        </span>
                        {sig.signal?.category && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${categoryStyles}`}
                          >
                            {sig.signal.category}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600 capitalize">
                          {sig.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{sig.summary}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-slate-400">
                      Detected {new Date(sig.detected_at).toLocaleDateString()}
                    </div>
                    {sig.confidence_score !== null && sig.confidence_score !== undefined && (
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Confidence: {Math.round(Number(sig.confidence_score) * 100)}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Supporting Context & Evidence */}
                {evidence && (
                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-3 text-xs space-y-1.5">
                    <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>🔍 Supporting Evidence:</span>
                      <span className="font-normal text-slate-500">
                        {evidence.excerpt || 'Context recorded from detection engine'}
                      </span>
                    </div>

                    {evidence.key_metrics && Object.keys(evidence.key_metrics).length > 0 && (
                      <div className="flex flex-wrap gap-3 pt-1 border-t border-slate-200/60 text-[11px] text-slate-600">
                        {Object.entries(evidence.key_metrics).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-1">
                            <span className="font-medium text-slate-500 capitalize">
                              {k.replace(/_/g, ' ')}:
                            </span>
                            <span className="font-semibold text-slate-800">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Conflicting Signal Warning */}
                {sig.has_conflict && (
                  <div className="bg-purple-50 border border-purple-200 text-purple-900 rounded-lg p-2.5 text-xs flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <div>
                      <span className="font-bold">Conflicting Signal Detected: </span>
                      <span>
                        {sig.conflict_summary ||
                          'Co-occurring signals have opposing commercial polarities.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Uncertainty Warning */}
                {sig.is_uncertain && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-2.5 text-xs flex items-center gap-2">
                    <span className="text-base">❓</span>
                    <div>
                      <span className="font-bold">Verification Needed: </span>
                      <span>
                        {sig.uncertainty_reasons?.join(', ') ||
                          'Signal evidence requires manual confirmation.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Recommended Action Playbook */}
                {sig.signal?.recommended_action && (
                  <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <span>🎯 Playbook:</span>
                        <span>{sig.signal.recommended_action.title}</span>
                      </div>
                      <p className="text-[11px] text-blue-900/80 mt-0.5">
                        {sig.signal.recommended_action.description}
                      </p>
                    </div>

                    <Link
                      href={`/signals/${sig.id}`}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition whitespace-nowrap self-start sm:self-auto shadow-xs"
                    >
                      Open Triage →
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CompanySignalsTab;
