'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  DetectedSignal,
  DetectedSignalStatus,
  SignalSeverity,
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
  const [actionType, setActionType] = useState<'actioned' | 'dismissed' | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
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

  const handleOpenActionModal = (type: 'actioned' | 'dismissed') => {
    setActionType(type);
    setResolutionNotes(signal?.resolution_notes || '');
    setActionModalOpen(true);
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signal || !actionType) return;
    try {
      setSubmittingAction(true);
      const updated = await apiFetch<DetectedSignal>(`/api/v1/signals/detected/${signal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionType,
          resolution_notes: resolutionNotes.trim() || undefined,
        }),
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
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'acknowledged':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'actioned':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'dismissed':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      case 'resolved':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
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
          <p className="text-sm text-slate-500 mt-1">{error || 'The requested signal could not be loaded.'}</p>
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

  const evidence = signal.evidence || signal.metadata?.evidence;
  const confScorePercent = signal.confidence_score !== null && signal.confidence_score !== undefined
    ? Math.round(signal.confidence_score * 100)
    : null;

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
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition bg-white px-2.5 py-1.5 rounded-lg border border-slate-200"
            title="Refresh signal"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>

        {/* Main Header Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getSeverityBadge(signal.severity)}`}>
              {signal.severity.toUpperCase()}
            </span>
            {signal.signal?.category && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getCategoryBadge(signal.signal.category)}`}>
                {signal.signal.category.toUpperCase()}
              </span>
            )}
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${getStatusBadge(signal.status)}`}>
              Status: {signal.status}
            </span>
            {confScorePercent !== null && (
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${
                  (signal.confidence_score! >= 0.8 || signal.confidence_tier === 'high')
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : (signal.confidence_score! >= 0.5 || signal.confidence_tier === 'medium')
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
                  signal.person_name.includes(',') ? (
                    signal.person_name.split(',').map((name, idx) => {
                      const trimmed = name.trim();
                      if (!trimmed) return null;
                      return (
                        <Link
                          key={idx}
                          href={`/persons?q=${encodeURIComponent(trimmed)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition text-xs font-medium"
                        >
                          <span>👤</span>
                          <span>{trimmed}</span>
                        </Link>
                      );
                    })
                  ) : (
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
                  )
                ) : null}
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
                  onClick={() => handleOpenActionModal('dismissed')}
                  disabled={submittingAction}
                  className="px-3.5 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>

          {/* Resolution Notes Banner if completed */}
          {signal.resolution_notes && (
            <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-1">
              <div className="font-semibold flex items-center gap-1 text-emerald-800">
                <span>✓</span>
                <span>Resolution Recorded</span>
                {signal.actioned_at && (
                  <span className="font-normal text-emerald-600">
                    — {new Date(signal.actioned_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-emerald-800">{signal.resolution_notes}</p>
            </div>
          )}
        </div>

        {/* Conflict Analysis Callout (if conflicting) */}
        {signal.has_conflict && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-rose-900 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-rose-800 text-sm">
              <span>⚠️</span>
              <span>Opposing Signal Polarity Detected ({signal.conflict_scope || 'entity'} level)</span>
            </div>
            <p className="text-sm text-rose-700 leading-relaxed">
              {signal.conflict_summary || 'This entity is simultaneously exhibiting opposing commercial forces (e.g. Risk of churn vs. Opportunity for expansion). Coordinated outreach is strongly advised before taking definitive commercial action.'}
            </p>
            {signal.conflicting_signal_ids && signal.conflicting_signal_ids.length > 0 && (
              <div className="pt-2 text-xs flex items-center gap-2 text-rose-800">
                <span className="font-medium">Conflicting Signal IDs:</span>
                <div className="flex flex-wrap gap-1">
                  {signal.conflicting_signal_ids.map((cid) => (
                    <Link
                      key={cid}
                      href={`/signals/${cid}`}
                      className="underline font-mono hover:text-rose-950 transition"
                    >
                      {cid.slice(0, 8)}...
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Classification Uncertainty Callout (if uncertain) */}
        {signal.is_uncertain && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-800 text-sm">
              <span>🔍</span>
              <span>Classification Uncertainty — Verification Recommended</span>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              This signal received a confidence score below the definitive threshold. Review the underlying data sources before presenting this finding as conclusive.
            </p>
            {signal.uncertainty_reasons && signal.uncertainty_reasons.length > 0 && (
              <ul className="list-disc list-inside text-xs text-amber-800 space-y-1 pt-1">
                {signal.uncertainty_reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 2-Column Grid: Evidence Dossier & Connected Entities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Supporting Evidence Dossier */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span>📋</span>
                <span>Supporting Evidence Dossier</span>
              </h2>
              {evidence?.verification_status && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium capitalize border border-slate-200">
                  {evidence.verification_status}
                </span>
              )}
            </div>

            {evidence ? (
              <div className="space-y-3 text-xs">
                {evidence.summary && (
                  <div>
                    <span className="text-slate-400 font-medium block">Evidence Summary</span>
                    <p className="text-slate-800 mt-0.5 font-medium leading-relaxed">
                      {evidence.summary}
                    </p>
                  </div>
                )}

                {evidence.excerpt && (
                  <div>
                    <span className="text-slate-400 font-medium block">Matched Text Snippet / Excerpt</span>
                    <blockquote className="mt-1 font-mono text-xs bg-slate-50 border-l-4 border-slate-300 rounded-r px-3 py-2 text-slate-800">
                      &ldquo;{evidence.excerpt}&rdquo;
                    </blockquote>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-slate-400 block">Evidence Type</span>
                    <span className="font-medium text-slate-800 capitalize">
                      {String(evidence.evidence_type || evidence.type || 'touchpoint').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Timestamp</span>
                    <span className="font-medium text-slate-800">
                      {evidence.timestamp || evidence.occurred_at
                        ? new Date(evidence.timestamp || evidence.occurred_at).toLocaleDateString()
                        : 'Recent'}
                    </span>
                  </div>
                </div>

                {evidence.context && Object.keys(evidence.context).length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-400 font-medium block mb-1">Context Parameters</span>
                    <pre className="bg-slate-50 border border-slate-200 rounded p-2 text-[11px] font-mono text-slate-700 overflow-x-auto">
                      {JSON.stringify(evidence.context, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4">
                No structured evidence payload was recorded for this signal instance.
              </p>
            )}
          </div>

          {/* Connected CRM Entities */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span>🔗</span>
                <span>Connected CRM Entities</span>
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              {signal.company_name || signal.company_id ? (
                <div className="flex items-center justify-between p-3 bg-blue-50/60 border border-blue-100 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🏢</span>
                    <div>
                      <span className="text-[11px] text-blue-600 font-medium block uppercase tracking-wide">
                        Client Company
                      </span>
                      <span className="font-semibold text-blue-950 text-sm">
                        {signal.company_name || 'Associated Company'}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={
                      signal.company_id
                        ? `/companies/${signal.company_id}`
                        : `/companies?q=${encodeURIComponent(signal.company_name || '')}`
                    }
                    className="px-2.5 py-1 bg-white text-blue-700 border border-blue-200 rounded font-medium hover:bg-blue-50 transition shrink-0"
                  >
                    View Company →
                  </Link>
                </div>
              ) : null}

              {signal.connected_persons && signal.connected_persons.length > 0 ? (
                <div className="space-y-2.5">
                  <span className="text-[11px] text-emerald-600 font-medium block uppercase tracking-wide">
                    Connected People ({signal.connected_persons.length})
                  </span>
                  {signal.connected_persons.map((person) => {
                    const personName =
                      person.name ||
                      [person.first_name, person.last_name].filter(Boolean).join(' ') ||
                      'Unnamed Contact';
                    const email = person.email || person.primary_email;
                    return (
                      <div
                        key={person.id}
                        className="flex items-center justify-between p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg shrink-0">👤</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-emerald-950 text-sm truncate">
                                {personName}
                              </span>
                              {person.role && (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  {person.role}
                                </span>
                              )}
                            </div>
                            {email && (
                              <span className="text-[11px] text-slate-500 block truncate">
                                {email}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/persons/${person.id}`}
                          className="px-2.5 py-1 bg-white text-emerald-700 border border-emerald-200 rounded font-medium hover:bg-emerald-50 transition shrink-0"
                        >
                          View Person →
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : signal.person_name || signal.person_id ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg shrink-0">👤</span>
                    <div className="min-w-0">
                      <span className="text-[11px] text-emerald-600 font-medium block uppercase tracking-wide">
                        Contact Person {signal.person_name?.includes(',') ? '(Multi-Contact)' : ''}
                      </span>
                      {signal.person_name?.includes(',') ? (
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {signal.person_name.split(',').map((name, idx) => {
                            const trimmed = name.trim();
                            if (!trimmed) return null;
                            return (
                              <Link
                                key={idx}
                                href={`/persons?q=${encodeURIComponent(trimmed)}`}
                                className="inline-flex items-center px-2 py-0.5 bg-white border border-emerald-200 rounded text-xs font-semibold text-emerald-900 hover:bg-emerald-100 hover:border-emerald-300 transition"
                                title={`Search for ${trimmed}`}
                              >
                                {trimmed}
                              </Link>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="font-semibold text-emerald-950 text-sm truncate block">
                          {signal.person_name || 'Associated Person'}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={
                      signal.person_id
                        ? `/persons/${signal.person_id}`
                        : `/persons?q=${encodeURIComponent(signal.person_name || '')}`
                    }
                    className="px-2.5 py-1 bg-white text-emerald-700 border border-emerald-200 rounded font-medium hover:bg-emerald-50 transition shrink-0"
                  >
                    View Person →
                  </Link>
                </div>
              ) : null}

              {signal.opportunity_title ? (
                <div className="flex items-center justify-between p-3 bg-purple-50/60 border border-purple-100 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">💼</span>
                    <div>
                      <span className="text-[11px] text-purple-600 font-medium block uppercase tracking-wide">
                        Pipeline Deal
                      </span>
                      <span className="font-semibold text-purple-950 text-sm">
                        {signal.opportunity_title}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/opportunities?search=${encodeURIComponent(signal.opportunity_title)}`}
                    className="px-2.5 py-1 bg-white text-purple-700 border border-purple-200 rounded font-medium hover:bg-purple-50 transition"
                  >
                    View Deal →
                  </Link>
                </div>
              ) : null}

              {signal.engagement_title ? (
                <div className="flex items-center justify-between p-3 bg-amber-50/60 border border-amber-100 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">📋</span>
                    <div>
                      <span className="text-[11px] text-amber-600 font-medium block uppercase tracking-wide">
                        Client Engagement
                      </span>
                      <span className="font-semibold text-amber-950 text-sm">
                        {signal.engagement_title}
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/engagements"
                    className="px-2.5 py-1 bg-white text-amber-700 border border-amber-200 rounded font-medium hover:bg-amber-50 transition"
                  >
                    View Engagement →
                  </Link>
                </div>
              ) : null}

              {signal.activity_id ? (
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">⚡</span>
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium block uppercase tracking-wide">
                        Triggering Activity
                      </span>
                      <span className="font-mono text-xs text-slate-800">
                        {signal.activity_id.slice(0, 12)}...
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/activities"
                    className="px-2.5 py-1 bg-white text-slate-700 border border-slate-200 rounded font-medium hover:bg-slate-100 transition"
                  >
                    View Activity Feed →
                  </Link>
                </div>
              ) : null}

              {!signal.company_name && !signal.person_name && !signal.opportunity_title && !signal.engagement_title && (
                <p className="text-xs text-slate-500 py-4">No associated CRM entities linked to this signal.</p>
              )}
            </div>
          </div>
        </div>

        {/* Recommended Playbook Card */}
        {signal.signal?.recommended_action && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span>💡</span>
                <span>Recommended Action Playbook</span>
              </h2>
              {signal.signal.recommended_action.playbook && (
                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                  {signal.signal.recommended_action.playbook}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-semibold text-slate-900">
                {signal.signal.recommended_action.title}
              </h3>
              {signal.signal.recommended_action.description && (
                <p className="text-sm text-slate-600 leading-relaxed">
                  {signal.signal.recommended_action.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Signal Catalog Business Interpretation Reference */}
        {signal.signal?.business_interpretation && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2 text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span>📖</span>
              <span>Business Interpretation & Commercial Impact:</span>
            </span>
            <p className="text-slate-600 leading-relaxed">
              {signal.signal.business_interpretation}
            </p>
          </div>
        )}
      </div>

      {/* Action / Dismiss Modal */}
      {actionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {actionType === 'actioned' ? 'Record Completed Action' : 'Dismiss Signal'}
              </h3>
              <button
                onClick={() => setActionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Resolution Notes (Optional)
                </label>
                <textarea
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder={
                    actionType === 'actioned'
                      ? 'e.g. Scheduled QBR meeting with VP of Data, sent proposal extension...'
                      : 'e.g. False positive, account currently pausing operations...'
                  }
                  className="w-full text-xs rounded-lg border border-slate-200 p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition shadow-sm cursor-pointer ${
                    actionType === 'actioned'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {submittingAction ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
