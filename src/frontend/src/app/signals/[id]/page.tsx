'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  DetectedSignal,
  DetectedSignalStatus,
  SignalSeverity,
  SupportingEvidence,
} from '../page';

export default function SignalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [signalId, setSignalId] = useState<string>('');

  useEffect(() => {
    if (params && typeof (params as any).then === 'function') {
      (params as Promise<{ id: string }>).then((p) => {
        if (p?.id) setSignalId(p.id);
      });
    } else if (params && (params as any).id) {
      setSignalId((params as any).id);
    }
  }, [params]);

  const [signal, setSignal] = useState<DetectedSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Triage Action Modal State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<
    'actioned' | 'dismissed' | 'snoozed' | 'resolved' | null
  >(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [dismissalReason, setDismissalReason] = useState('Not Relevant');
  const [snoozeDays, setSnoozeDays] = useState<number>(14);
  const [customSnoozeDate, setCustomSnoozeDate] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchSignal = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<DetectedSignal>(`/api/v1/signals/detected/${signalId}`);
      if (res) {
        setSignal(res);
      } else {
        setError('Signal details not found');
      }
    } catch (err: any) {
      console.error('Failed to load signal detail:', err);
      setError(err?.message || 'Failed to fetch signal details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (signalId) {
      fetchSignal();
    }
  }, [signalId]);

  const handleAcknowledge = async () => {
    if (!signal) return;
    try {
      setSubmittingAction(true);
      const updated = await apiFetch<DetectedSignal>(`/api/v1/signals/detected/${signal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'acknowledged' }),
      });
      if (updated) {
        setSignal(updated);
      }
    } catch (err) {
      console.error('Failed to acknowledge signal:', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleOpenActionModal = (
    type: 'actioned' | 'dismissed' | 'snoozed' | 'resolved'
  ) => {
    setActionType(type);
    setResolutionNotes(signal?.resolution_notes || '');
    setDismissalReason('Not Relevant');
    setSnoozeDays(14);
    setCustomSnoozeDate('');
    setActionModalOpen(true);
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signal || !actionType) return;
    try {
      setSubmittingAction(true);
      const payload: Record<string, any> = {
        status: actionType,
      };

      if (actionType === 'dismissed') {
        const fullNotes = resolutionNotes.trim()
          ? `[${dismissalReason}] ${resolutionNotes.trim()}`
          : `[${dismissalReason}] Dismissed by user`;
        payload.resolution_notes = fullNotes;
      } else if (actionType === 'snoozed') {
        if (customSnoozeDate) {
          payload.snooze_until = new Date(customSnoozeDate).toISOString();
        } else {
          payload.snooze_days = snoozeDays;
        }
        if (resolutionNotes.trim()) {
          payload.resolution_notes = resolutionNotes.trim();
        }
      } else if (resolutionNotes.trim()) {
        payload.resolution_notes = resolutionNotes.trim();
      }

      const updated = await apiFetch<DetectedSignal>(`/api/v1/signals/detected/${signal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (updated) {
        setSignal(updated);
      }
      setActionModalOpen(false);
      setActionType(null);
      setResolutionNotes('');
    } catch (err) {
      console.error('Failed to update signal action:', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Badge helpers
  const getSeverityBadge = (severity: SignalSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'low':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'opportunity':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'risk':
        return 'bg-rose-50 text-rose-700 border-rose-300';
      case 'hybrid':
        return 'bg-purple-50 text-purple-700 border-purple-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: DetectedSignalStatus) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'acknowledged':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'actioned':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'snoozed':
        return 'bg-purple-100 text-purple-800 border-purple-300 font-semibold';
      case 'resolved':
        return 'bg-teal-100 text-teal-800 border-teal-300 font-semibold';
      case 'dismissed':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getEvidenceHealthBadge = (evidenceStatus?: string, isUncertain?: boolean, hasConflict?: boolean) => {
    if (hasConflict || evidenceStatus === 'conflicting') {
      return {
        label: 'Conflicting Evidence',
        className: 'bg-rose-100 text-rose-800 border-rose-300',
        icon: '⚠️',
      };
    }
    if (evidenceStatus === 'stale') {
      return {
        label: 'Stale Evidence (>60d old)',
        className: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: '🟡',
      };
    }
    if (evidenceStatus === 'incomplete') {
      return {
        label: 'Incomplete Context',
        className: 'bg-orange-100 text-orange-800 border-orange-300',
        icon: '🟠',
      };
    }
    if (isUncertain || evidenceStatus === 'unverified') {
      return {
        label: 'Unverified Evidence',
        className: 'bg-slate-100 text-slate-700 border-slate-300',
        icon: '🔍',
      };
    }
    return {
      label: 'Fresh & Verified Evidence',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      icon: '🟢',
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-6 w-32 bg-slate-200 rounded" />
            <div className="h-10 w-3/4 bg-slate-200 rounded" />
            <div className="h-48 bg-white border border-slate-200 rounded-xl p-6" />
            <div className="h-64 bg-white border border-slate-200 rounded-xl p-6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-semibold text-slate-900">Signal Not Found</h2>
          <p className="text-sm text-slate-500 mt-1">
            {error || 'The requested signal could not be loaded.'}
          </p>
          <div className="mt-6">
            <Link
              href="/signals"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition"
            >
              <span>← Back to Signals Radar</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const evidence: SupportingEvidence | Record<string, any> | undefined =
    signal.evidence || signal.metadata?.evidence;
  const confScorePercent =
    signal.confidence_score !== null && signal.confidence_score !== undefined
      ? Math.round(signal.confidence_score * 100)
      : null;

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
    (signal.uncertainty_reasons && signal.uncertainty_reasons.length > 0 ? signal.uncertainty_reasons : []);

  const healthBadge = getEvidenceHealthBadge(evidenceStatus, signal.is_uncertain, signal.has_conflict);

  const commercialContext: Record<string, any> =
    (evidence && (evidence as any).commercial_context) ||
    (evidence && (evidence as any).context) ||
    {};

  const relationshipContext: Record<string, any> =
    (evidence && (evidence as any).relationship_context) ||
    {};

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
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
            onClick={fetchSignal}
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
                  onClick={handleAcknowledge}
                  disabled={submittingAction}
                  className="px-3.5 py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Acknowledge
                </button>
              )}
              {signal.status !== 'actioned' && signal.status !== 'resolved' && (
                <button
                  onClick={() => handleOpenActionModal('actioned')}
                  disabled={submittingAction}
                  className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                >
                  Take Action
                </button>
              )}
              {signal.status !== 'dismissed' && signal.status !== 'resolved' && (
                <button
                  onClick={() => handleOpenActionModal('snoozed')}
                  disabled={submittingAction}
                  className="px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  💤 Snooze
                </button>
              )}
              {signal.status !== 'resolved' && signal.status !== 'dismissed' && (
                <button
                  onClick={() => handleOpenActionModal('resolved')}
                  disabled={submittingAction}
                  className="px-3 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  Resolve
                </button>
              )}
              {signal.status !== 'dismissed' && (
                <button
                  onClick={() => handleOpenActionModal('dismissed')}
                  disabled={submittingAction}
                  className="px-3.5 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  Dismiss
                </button>
              )}
              {(signal.status === 'dismissed' || signal.status === 'resolved') && (
                <button
                  onClick={() => handleOpenActionModal('actioned')}
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
              <span>Opposing Signal Polarity Detected ({signal.conflict_scope || 'entity'} level)</span>
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
          {(Object.keys(commercialContext).length > 0 || Object.keys(relationshipContext).length > 0) && (
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
                {commercialContext.rate_value !== undefined && commercialContext.rate_value !== null && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">Contract Rate</span>
                    <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                      {commercialContext.currency || '$'} {Number(commercialContext.rate_value).toLocaleString()} / {commercialContext.rate_type || 'period'}
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
                      {commercialContext.round} {commercialContext.amount ? `(${commercialContext.amount})` : ''}
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

        {/* Recommended Playbook Card */}
        {signal.signal?.recommended_action && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>💡</span>
              <span>Recommended Action Playbook</span>
            </h2>
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-xs space-y-2">
              <p className="font-bold text-emerald-900 text-sm">
                {signal.signal.recommended_action.title || 'Recommended Next Best Action'}
              </p>
              <p className="text-emerald-800 leading-relaxed">
                {signal.signal.recommended_action.description ||
                  'Review account history and initiate prompt executive check-in.'}
              </p>
            </div>
          </div>
        )}

        {/* Lifecycle & Deduplication Audit Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>🛡️</span>
            <span>Lifecycle & Deduplication Audit</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-slate-500 font-medium block">Current Status</span>
              <span className="text-sm font-bold text-slate-900 mt-1 capitalize block">
                {signal.status}
              </span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-slate-500 font-medium block">Snooze Expiry</span>
              <span className="text-sm font-bold text-purple-700 mt-1 block">
                {signal.snoozed_until ? new Date(signal.snoozed_until).toLocaleDateString() : 'Not Snoozed'}
              </span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-slate-500 font-medium block">Re-Alert Counter</span>
              <span className="text-sm font-bold text-slate-900 mt-1 block">
                {signal.reopen_count || 0} time(s) re-opened
              </span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-slate-500 font-medium block">Evidence Fingerprint</span>
              <span className="text-xs font-mono text-slate-600 mt-1 block truncate" title={signal.evidence_fingerprint || 'None'}>
                {signal.evidence_fingerprint ? `${signal.evidence_fingerprint.slice(0, 12)}...` : 'None'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action / Dismiss / Snooze / Resolve Modal */}
      {actionModalOpen && actionType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {actionType === 'actioned'
                  ? 'Record Taken Action'
                  : actionType === 'snoozed'
                  ? '💤 Snooze Signal Alert'
                  : actionType === 'resolved'
                  ? '✅ Resolve Signal'
                  : 'Dismiss Signal Alert'}
              </h3>
              <button
                onClick={() => setActionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAction} className="space-y-4">
              <p className="text-xs text-slate-500">
                Signal: <strong className="text-slate-800 font-semibold">{signal.title}</strong>
              </p>

              {/* Snooze duration buttons */}
              {actionType === 'snoozed' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Snooze Duration
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: '7 Days', days: 7 },
                      { label: '14 Days (Default)', days: 14 },
                      { label: '30 Days', days: 30 },
                    ].map((opt) => (
                      <button
                        key={opt.days}
                        type="button"
                        onClick={() => {
                          setSnoozeDays(opt.days);
                          setCustomSnoozeDate('');
                        }}
                        className={`py-2 px-3 text-xs rounded-xl border font-semibold transition cursor-pointer ${
                          snoozeDays === opt.days && !customSnoozeDate
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Or Pick Custom Date
                    </label>
                    <input
                      type="date"
                      value={customSnoozeDate}
                      onChange={(e) => setCustomSnoozeDate(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* Dismissal Reason */}
              {actionType === 'dismissed' && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Dismissal Category
                  </label>
                  <select
                    value={dismissalReason}
                    onChange={(e) => setDismissalReason(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="Not Relevant">Not Relevant / Ignorable</option>
                    <option value="False Positive">False Positive / Incorrect Attribution</option>
                    <option value="Handled Elsewhere">Already Handled Elsewhere</option>
                    <option value="Other">Other / Miscellaneous</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {actionType === 'actioned'
                    ? 'Resolution Notes / Commercial Next Step'
                    : actionType === 'resolved'
                    ? 'Resolution Notes'
                    : actionType === 'snoozed'
                    ? 'Optional Snooze Reason'
                    : 'Additional Context / Notes'}
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder={
                    actionType === 'actioned'
                      ? 'e.g., Scheduled executive check-in for next Tuesday...'
                      : actionType === 'resolved'
                      ? 'e.g., Re-engagement call completed.'
                      : actionType === 'snoozed'
                      ? 'e.g., Lead requested contact next month.'
                      : 'e.g., Contact already communicated via WhatsApp.'
                  }
                  className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition shadow-sm cursor-pointer ${
                    actionType === 'actioned'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : actionType === 'snoozed'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : actionType === 'resolved'
                      ? 'bg-teal-600 hover:bg-teal-700'
                      : 'bg-slate-800 hover:bg-slate-900'
                  }`}
                >
                  {actionType === 'actioned'
                    ? 'Mark as Actioned'
                    : actionType === 'snoozed'
                    ? 'Confirm Snooze'
                    : actionType === 'resolved'
                    ? 'Confirm Resolution'
                    : 'Dismiss Signal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
