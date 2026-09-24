'use client';

import Link from 'next/link';
import { DetectedSignal, SignalActionType } from '../types';
import {
  getSeverityBadge,
  getCategoryBadge,
  getStatusBadge,
  getPriorityBadge,
  getEvidenceHealthBadge,
} from '../utils';

interface SignalDetailHeaderProps {
  signal: DetectedSignal;
  loading: boolean;
  submittingAction: boolean;
  onRefresh: () => void;
  onAcknowledge: () => void;
  onOpenActionModal: (type: SignalActionType) => void;
}

export function SignalDetailHeader({
  signal,
  loading,
  submittingAction,
  onRefresh,
  onAcknowledge,
  onOpenActionModal,
}: SignalDetailHeaderProps) {
  const evidence = signal.evidence || signal.metadata?.evidence;
  const confScorePercent =
    signal.confidence_score !== null && signal.confidence_score !== undefined
      ? Math.round(signal.confidence_score * 100)
      : null;

  const evidenceStatus =
    (evidence && (evidence as any).evidence_status) ||
    (signal.has_conflict ? 'conflicting' : signal.is_uncertain ? 'unverified' : 'fresh');

  const healthBadge = getEvidenceHealthBadge(
    evidenceStatus,
    signal.is_uncertain,
    signal.has_conflict
  );

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
    signal.signal?.category;

  const pBadge = getPriorityBadge(pTier, effPol);
  const pScore =
    signal.priority_score !== undefined && signal.priority_score !== null
      ? Math.round(Number(signal.priority_score))
      : signal.score !== undefined && signal.score !== null
      ? Math.round(Number(signal.score))
      : null;

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/signals"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"
        >
          <span>←</span>
          <span>Back to Signals Radar</span>
        </Link>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
          title="Refresh signal"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1 ${pBadge.className}`}
          >
            <span>⭐</span>
            <span>{pBadge.label}</span>
            {pScore !== null && (
              <span className="opacity-80 font-normal">({pScore}/100)</span>
            )}
          </span>

          <span
            className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getSeverityBadge(
              signal.severity
            )}`}
          >
            {signal.severity.toUpperCase()}
          </span>

          {signal.signal?.category && (
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getCategoryBadge(
                signal.signal.category
              )}`}
            >
              {signal.signal.category.toUpperCase()}
            </span>
          )}

          <span
            className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${getStatusBadge(
              signal.status
            )}`}
          >
            Status: {signal.status === 'snoozed' && signal.snoozed_until ? `Snoozed until ${new Date(signal.snoozed_until).toLocaleDateString()}` : signal.status}
          </span>

          {/* Evidence Freshness / Health Badge */}
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${healthBadge.className}`}
          >
            <span>{healthBadge.icon}</span>
            <span>{healthBadge.label}</span>
          </span>

          {/* Reopened Indicator */}
          {signal.reopen_count !== undefined && signal.reopen_count > 0 && (
            <span className="text-xs px-2.5 py-0.5 rounded-full border bg-amber-100 text-amber-900 border-amber-300 font-bold flex items-center gap-1">
              <span>🔄</span>
              <span>Reopened ({signal.reopen_count}x)</span>
            </span>
          )}

          {confScorePercent !== null && (
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${
                signal.confidence_score! >= 0.8 || signal.confidence_tier === 'high'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : signal.confidence_score! >= 0.5 || signal.confidence_tier === 'medium'
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-rose-50 text-rose-700 border-rose-300'
              }`}
            >
              🎯 {confScorePercent}% Confidence
            </span>
          )}
          <span className="text-xs text-slate-400 ml-auto">
            Detected on {new Date(signal.detected_at).toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pt-2">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="text-2xl">{signal.signal?.icon || '⚡'}</span>
              <span>{signal.title}</span>
            </h1>
            {signal.summary && (
              <p className="text-base text-slate-600 leading-relaxed max-w-3xl">
                {signal.summary}
              </p>
            )}

            {/* Linked Context Entities Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {signal.company_name && (
                <Link
                  href={
                    signal.company_id
                      ? `/companies/${signal.company_id}`
                      : `/companies?q=${encodeURIComponent(signal.company_name)}`
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition text-xs font-medium"
                >
                  <span>🏢</span>
                  <span>{signal.company_name}</span>
                </Link>
              )}
              {signal.connected_persons && signal.connected_persons.length > 0 ? (
                signal.connected_persons.map((p) => {
                  const name =
                    p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Contact';
                  return (
                    <Link
                      key={p.id}
                      href={`/persons/${p.id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition text-xs font-medium"
                    >
                      <span>👤</span>
                      <span>{name}</span>
                      {p.role && (
                        <span className="text-[10px] text-emerald-600 uppercase font-semibold">
                          ({p.role})
                        </span>
                      )}
                    </Link>
                  );
                })
              ) : signal.person_name ? (
                <Link
                  href={
                    signal.person_id
                      ? `/persons/${signal.person_id}`
                      : `/persons?q=${encodeURIComponent(signal.person_name)}`
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition text-xs font-medium"
                >
                  <span>👤</span>
                  <span>{signal.person_name}</span>
                </Link>
              ) : null}

              {signal.engagement_title && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium">
                  <span>📄</span>
                  <span>{signal.engagement_title}</span>
                </span>
              )}

              {signal.opportunity_title && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium">
                  <span>💼</span>
                  <span>{signal.opportunity_title}</span>
                </span>
              )}
            </div>
          </div>

          {/* Triage Action Cluster */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {signal.status === 'active' && (
              <button
                onClick={onAcknowledge}
                disabled={submittingAction}
                className="px-3.5 py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Acknowledge
              </button>
            )}
            {signal.status !== 'actioned' && signal.status !== 'resolved' && (
              <button
                onClick={() => onOpenActionModal('actioned')}
                disabled={submittingAction}
                className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
              >
                Take Action
              </button>
            )}
            {signal.status !== 'dismissed' && signal.status !== 'resolved' && (
              <button
                onClick={() => onOpenActionModal('snoozed')}
                disabled={submittingAction}
                className="px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                💤 Snooze
              </button>
            )}
            {signal.status !== 'resolved' && signal.status !== 'dismissed' && (
              <button
                onClick={() => onOpenActionModal('resolved')}
                disabled={submittingAction}
                className="px-3 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Resolve
              </button>
            )}
            {signal.status !== 'dismissed' && (
              <button
                onClick={() => onOpenActionModal('dismissed')}
                disabled={submittingAction}
                className="px-3.5 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Dismiss
              </button>
            )}
            <button
              onClick={() => onOpenActionModal('false_positive')}
              disabled={submittingAction}
              className="px-3.5 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              title="Submit false-positive feedback for quality monitoring and investigation"
            >
              <span>🚩</span>
              <span>Report False Positive</span>
            </button>
            {(signal.status === 'dismissed' || signal.status === 'resolved') && (
              <button
                onClick={() => onOpenActionModal('actioned')}
                disabled={submittingAction}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
              >
                Reopen Signal
              </button>
            )}
          </div>
        </div>

        {/* Resolution / Snooze Notes Banner */}
        {signal.resolution_notes && (
          <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 space-y-1">
            <div className="font-semibold flex items-center gap-1 text-slate-800">
              <span>💬</span>
              <span>Lifecycle Notes</span>
              {signal.actioned_at && (
                <span className="font-normal text-slate-500">
                  — {new Date(signal.actioned_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-slate-700">{signal.resolution_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
