'use client';

import Link from 'next/link';
import { DetectedSignal, SupportingEvidence } from '../types';
import { getEvidenceHealthBadge } from '../utils';

interface SignalEvidenceSectionProps {
  signal: DetectedSignal;
}

export function SignalEvidenceSection({ signal }: SignalEvidenceSectionProps) {
  const evidence: SupportingEvidence | Record<string, any> | undefined =
    signal.evidence || signal.metadata?.evidence;

  const whyItMatters =
    signal.why_it_matters_now ||
    (evidence && (evidence as any).why_it_matters_now) ||
    signal.signal?.business_interpretation;

  const triggerEventTitle =
    (evidence && (evidence as any).trigger_event_title) ||
    (evidence && (evidence as any).summary) ||
    signal.summary ||
    'Triggering Event Detected';

  const evidenceStatus =
    (evidence && (evidence as any).evidence_status) ||
    (signal.has_conflict ? 'conflicting' : signal.is_uncertain ? 'unverified' : 'fresh');

  const evidenceNotes =
    (evidence && (evidence as any).evidence_notes) ||
    (signal.uncertainty_reasons && signal.uncertainty_reasons.length > 0
      ? signal.uncertainty_reasons
      : []);

  const healthBadge = getEvidenceHealthBadge(
    evidenceStatus,
    signal.is_uncertain,
    signal.has_conflict
  );

  const commercialContext: Record<string, any> =
    (evidence && (evidence as any).commercial_context) ||
    (evidence && (evidence as any).context) ||
    {};

  const relationshipContext: Record<string, any> =
    (evidence && (evidence as any).relationship_context) || {};

  return (
    <div className="space-y-6">
      {/* "Why This Signal Matters Now" Callout */}
      {whyItMatters && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 rounded-r-xl border-y border-r border-amber-200/60 p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <h2 className="text-sm font-bold text-amber-950 uppercase tracking-wide">
              Why This Signal Matters Now
            </h2>
          </div>
          <p className="text-sm text-slate-800 leading-relaxed font-medium">
            {whyItMatters}
          </p>
        </div>
      )}

      {/* Conflict Analysis Callout (if conflicting) */}
      {signal.has_conflict && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-rose-900 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-rose-800 text-sm">
            <span>⚠️</span>
            <span>
              Opposing Signal Polarity Detected ({signal.conflict_scope || 'entity'} level)
            </span>
          </div>
          <p className="text-sm text-rose-700 leading-relaxed">
            {signal.conflict_summary ||
              'This entity is simultaneously exhibiting opposing commercial forces (e.g. Risk of churn vs. Opportunity for expansion). Coordinated outreach is strongly advised before taking definitive commercial action.'}
          </p>
        </div>
      )}

      {/* Evidence Health Warnings & Notes */}
      {evidenceNotes && evidenceNotes.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-amber-950">
            <span>⚠️</span>
            <span>Evidence Corroboration & Quality Notes</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-800">
            {evidenceNotes.map((note: string, idx: number) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Supporting Detection Evidence & Triggering Trail Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>📋</span>
            <span>Supporting Detection Evidence</span>
          </h2>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${healthBadge.className}`}
          >
            <span>{healthBadge.icon}</span>
            <span>{healthBadge.label}</span>
          </span>
        </div>

        {/* Triggering Event Headline */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Triggering Event
            </span>
            {(evidence as any)?.evidence_type && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-mono">
                Type: {(evidence as any).evidence_type}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-900">
            {triggerEventTitle}
          </p>

          {/* Formatted Timestamps & Source Trail */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="bg-white p-3 rounded-lg border border-slate-200/80">
              <span className="text-slate-500 font-medium block">Event Occurred</span>
              <span className="text-xs font-semibold text-slate-800 mt-0.5 block">
                {(evidence as any)?.occurred_at
                  ? new Date((evidence as any).occurred_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : (evidence as any)?.timestamp
                  ? new Date((evidence as any).timestamp).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200/80">
              <span className="text-slate-500 font-medium block">Time Elapsed / Window</span>
              <span className="text-xs font-semibold text-slate-800 mt-0.5 block">
                {(evidence as any)?.days_elapsed !== undefined && (evidence as any)?.days_elapsed !== null
                  ? `${(evidence as any).days_elapsed} day(s)`
                  : 'Current'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200/80">
              <span className="text-slate-500 font-medium block">Source Data Entity</span>
              <span className="text-xs font-semibold text-slate-800 mt-0.5 block capitalize truncate">
                {(evidence as any)?.source_display ||
                  (evidence as any)?.source_entity_type ||
                  'Database Record'}
              </span>
            </div>
          </div>

          {/* Verbatim Excerpt / Snippet Box */}
          {(evidence as any)?.excerpt && (
            <div className="pt-2">
              <span className="text-xs font-semibold text-slate-600 block mb-1">
                Source Excerpt / Matched Context
              </span>
              <div className="bg-white border-l-2 border-slate-400 p-3 rounded-r-lg border-y border-r border-slate-200 text-xs text-slate-700 italic">
                &ldquo;{(evidence as any).excerpt}&rdquo;
              </div>
            </div>
          )}
        </div>

        {/* Affected Account & Commercial Context Grid */}
        {(Object.keys(commercialContext).length > 0 ||
          Object.keys(relationshipContext).length > 0) && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Affected Account & Commercial Context
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {signal.company_name && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block">Affected Account</span>
                  <Link
                    href={
                      signal.company_id
                        ? `/companies/${signal.company_id}`
                        : `/companies?q=${encodeURIComponent(signal.company_name)}`
                    }
                    className="text-xs font-bold text-blue-700 hover:underline mt-0.5 block truncate"
                  >
                    {signal.company_name}
                  </Link>
                </div>
              )}
              {commercialContext.tier && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block">Account Tier</span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block uppercase">
                    {String(commercialContext.tier)}
                  </span>
                </div>
              )}
              {commercialContext.segment && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block">Account Segment</span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block capitalize">
                    {String(commercialContext.segment).replace(/_/g, ' ')}
                  </span>
                </div>
              )}
              {commercialContext.rate_value !== undefined &&
                commercialContext.rate_value !== null && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">Contract Rate</span>
                    <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                      {commercialContext.currency || '$'}{' '}
                      {Number(commercialContext.rate_value).toLocaleString()} /{' '}
                      {commercialContext.rate_type || 'period'}
                    </span>
                  </div>
                )}
              {commercialContext.contract_status && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block">Contract Status</span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block uppercase">
                    {commercialContext.contract_status}
                  </span>
                </div>
              )}
              {commercialContext.round && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block">Funding Round</span>
                  <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                    {commercialContext.round}{' '}
                    {commercialContext.amount ? `(${commercialContext.amount})` : ''}
                  </span>
                </div>
              )}
              {relationshipContext.role && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block">Stakeholder Role</span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                    {relationshipContext.role}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Raw Evidence Payload Details (Expandable) */}
        {evidence && (
          <details className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <summary className="font-semibold cursor-pointer text-slate-700 select-none">
              Technical Evidence JSON Payload
            </summary>
            <div className="mt-3 font-mono text-[11px] bg-white p-3 rounded-lg border border-slate-200 text-slate-800 overflow-x-auto">
              <pre>{JSON.stringify(evidence, null, 2)}</pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
