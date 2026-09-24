'use client';

import { DetectedSignal } from '../types';

interface SignalQualitySafeguardsCardProps {
  signal: DetectedSignal;
}

export function SignalQualitySafeguardsCard({ signal }: SignalQualitySafeguardsCardProps) {
  const evidence = signal.evidence || signal.metadata?.evidence;
  const sourceReliability =
    signal.source_reliability || (evidence as any)?.source_reliability || 'high';
  const hasQualityWarning =
    signal.has_data_quality_warning || (evidence as any)?.has_quality_warning || false;
  const isRestricted =
    (evidence as any)?.is_restricted || signal.source_reliability === 'restricted' || false;
  const qualityFlags: string[] =
    signal.data_quality_flags || (evidence as any)?.data_quality_flags || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Data Quality & Source Safeguards Dossier
            </h2>
            <p className="text-xs text-slate-500">
              Evaluates source availability, recency, reliability, and data privacy access rules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2.5 py-1 rounded-full border font-bold capitalize flex items-center gap-1 ${
              sourceReliability === 'high'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : sourceReliability === 'medium'
                ? 'bg-blue-50 text-blue-800 border-blue-300'
                : sourceReliability === 'low'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            <span>Reliability:</span>
            <span>{sourceReliability}</span>
          </span>

          <span
            className={`text-xs px-2.5 py-1 rounded-full border font-bold ${
              hasQualityWarning
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {hasQualityWarning ? '⚠️ Warning Flagged' : '✅ High Integrity'}
          </span>
        </div>
      </div>

      {/* Quality Flags Display */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Quality Assessment Flags
        </span>
        {qualityFlags.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {qualityFlags.map((flag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200"
              >
                <span>⚠️</span>
                <span>{flag.replace(/_/g, ' ')}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">
            No active data quality warnings. All supporting data entities are verified and recent.
          </p>
        )}
      </div>

      {/* Confidential / Restricted Access Notice */}
      {isRestricted && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-950 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-indigo-900">
            <span>🔒</span>
            <span>Restricted Data Safeguard Notice</span>
          </div>
          <p className="leading-relaxed text-indigo-900">
            This signal references restricted, confidential, or permissioned source records. Sensitive
            raw excerpts have been redacted or generalized in accordance with information governance
            and data privacy controls.
          </p>
        </div>
      )}
    </div>
  );
}
