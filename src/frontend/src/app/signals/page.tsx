'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';

export type SignalCategory = 'opportunity' | 'risk' | 'hybrid';
export type SignalSeverity = 'critical' | 'high' | 'medium' | 'low';
export type DetectedSignalStatus = 'active' | 'acknowledged' | 'actioned' | 'dismissed' | 'resolved';

export interface RecommendedAction {
  playbook?: string;
  action_type?: string;
  title?: string;
  description?: string;
}

export interface SignalDefinition {
  id: string;
  name: string;
  category: SignalCategory;
  target_entity: string;
  severity: SignalSeverity;
  detection_mechanism: string;
  description?: string | null;
  business_interpretation: string;
  parameters: Record<string, any>;
  recommended_action: Record<string, any>;
  icon?: string | null;
  color?: string | null;
  is_active: boolean;
}

export interface ConnectedPerson {
  id: string;
  name?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  primary_email?: string | null;
  role?: string | null;
  linkedin_url?: string | null;
}

export interface SuggestedPerson {
  person_id?: string | null;
  name: string;
  first_name?: string | null;
  role?: string | null;
  company_id?: string | null;
  company_name?: string | null;
  confidence?: number | null;
}

export interface DetectedSignal {
  id: string;
  signal_id: string;
  signal?: SignalDefinition | null;
  company_id?: string | null;
  company_name?: string | null;
  person_id?: string | null;
  person_name?: string | null;
  connected_persons?: ConnectedPerson[];
  suggested_persons?: SuggestedPerson[];
  opportunity_id?: string | null;
  opportunity_title?: string | null;
  engagement_id?: string | null;
  engagement_title?: string | null;
  activity_id?: string | null;
  status: DetectedSignalStatus;
  severity: SignalSeverity;
  score?: number | null;
  confidence_score?: number | null;
  confidence_tier?: 'high' | 'medium' | 'low' | string | null;
  is_uncertain?: boolean;
  uncertainty_reasons?: string[];
  has_conflict?: boolean;
  conflicting_signal_ids?: string[];
  conflict_summary?: string | null;
  conflict_scope?: string | null;
  evidence?: Record<string, any> | null;
  title: string;
  summary?: string | null;
  metadata?: Record<string, any>;
  actioned_at?: string | null;
  resolution_notes?: string | null;
  detected_at: string;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignalCatalogResponse {
  data: SignalDefinition[];
  summary: {
    total_signals: number;
    by_category: Record<string, number>;
    by_target_entity: Record<string, number>;
    by_severity: Record<string, number>;
  };
}

export interface SignalQualityMetrics {
  total_detected: number;
  total_actioned: number;
  total_dismissed: number;
  total_resolved: number;
  total_active: number;
  action_rate: number;
  dismissal_rate: number;
  precision_proxy: number;
  needs_verification_rate: number;
  conflict_rate: number;
}

export interface SignalLatencyMetrics {
  mean_time_to_action_hours?: number | null;
  median_time_to_action_hours?: number | null;
  sla_breach_count: number;
  sla_breach_rate: number;
  total_actioned_measured: number;
}

export interface SignalOutcomeMetrics {
  attribution_window_days: number;
  opportunities_created_count: number;
  opportunity_conversion_rate: number;
  account_reactivations_count: number;
  account_reactivation_rate: number;
  contracts_renewed_count: number;
  contract_renewal_rate: number;
}

export interface SignalRevenueMetrics {
  influenced_pipeline_total: string | number;
  weighted_influenced_pipeline_total: string | number;
  protected_revenue_total: string | number;
  currency: string;
  value_coverage_rate: number;
}

export interface SignalMetricsBreakdownItem {
  key: string;
  label: string;
  category?: string | null;
  severity?: string | null;
  total_detected: number;
  actioned_count: number;
  dismissed_count: number;
  action_rate: number;
  mean_time_to_action_hours?: number | null;
  opportunities_created_count: number;
  influenced_pipeline: string | number;
}

export interface SignalMetricsResponse {
  lookback_days: number;
  evaluated_at: string;
  quality: SignalQualityMetrics;
  latency: SignalLatencyMetrics;
  outcomes: SignalOutcomeMetrics;
  revenue: SignalRevenueMetrics;
  by_signal: SignalMetricsBreakdownItem[];
  by_category: SignalMetricsBreakdownItem[];
  by_severity: SignalMetricsBreakdownItem[];
}

export interface DetectedSignalStatsResponse {
  total_active: number;
  total_conflicting?: number;
  total_uncertain?: number;
  by_severity: Record<string, number>;
  by_category: Record<string, number>;
  by_signal: Record<string, number>;
  by_status: Record<string, number>;
}

export interface SignalEvaluationResult {
  status: string;
  evaluated_at: string;
  lookback_days?: number;
  total_active_signals: number;
  total_conflicting?: number;
  total_uncertain?: number;
  new_signals_detected: number;
  refreshed_signals: number;
  by_signal: Record<string, number>;
}

const normalizeSlug = (slug?: string | null): string => {
  if (!slug) return '';
  return slug
    .toLowerCase()
    .trim()
    .replace(/_accounts$/, '_account')
    .replace(/_conversations$/, '_conversation')
    .replace(/_contracts$/, '_contract')
    .replace(/_changes$/, '_change')
    .replace(/_events$/, '_event')
    .replace(/_signals$/, '_signal')
    .replace(/_or_funding_/, '_funding_');
};

export default function SignalsPage() {
  const [activeTab, setActiveTab] = useState<'triage' | 'conflicts' | 'uncertain' | 'metrics' | 'catalog'>('triage');
  const [catalog, setCatalog] = useState<SignalDefinition[]>([]);
  const [signals, setSignals] = useState<DetectedSignal[]>([]);
  const [stats, setStats] = useState<DetectedSignalStatsResponse | null>(null);
  const [metrics, setMetrics] = useState<SignalMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationBanner, setEvaluationBanner] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [signalTypeFilter, setSignalTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [lookbackDays, setLookbackDays] = useState<number>(90);

  // Dynamic catalog options based on active category filter
  const availableCatalog = useMemo(() => {
    if (categoryFilter === 'all') return catalog;
    return catalog.filter(
      (def) =>
        def.category?.toLowerCase() === categoryFilter.toLowerCase() ||
        def.category?.toLowerCase() === 'hybrid'
    );
  }, [catalog, categoryFilter]);

  // Modal state for Action / Dismiss notes
  const [modalSignal, setModalSignal] = useState<DetectedSignal | null>(null);
  const [modalActionType, setModalActionType] = useState<'actioned' | 'dismissed' | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Load initial data
  const loadData = async (lookback: number = lookbackDays) => {
    try {
      setLoading(true);
      const [catRes, sigRes, statRes, metricsRes] = await Promise.allSettled([
        apiFetch<SignalCatalogResponse>('/api/v1/signals/catalog'),
        apiFetch<ApiResponse<DetectedSignal[]>>(
          `/api/v1/signals/detected?page_size=100&lookback_days=${lookback}`
        ),
        apiFetch<DetectedSignalStatsResponse>(
          `/api/v1/signals/detected/stats?lookback_days=${lookback}`
        ),
        apiFetch<SignalMetricsResponse>(
          `/api/v1/signals/metrics?lookback_days=${lookback}`
        ),
      ]);

      if (catRes.status === 'fulfilled' && catRes.value?.data) {
        setCatalog(catRes.value.data);
      }
      if (sigRes.status === 'fulfilled' && sigRes.value?.data) {
        setSignals(sigRes.value.data);
      }
      if (statRes.status === 'fulfilled' && statRes.value) {
        setStats(statRes.value);
      }
      if (metricsRes.status === 'fulfilled' && metricsRes.value?.quality) {
        setMetrics(metricsRes.value);
      }
    } catch (err) {
      console.error('Failed to fetch signal radar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLookbackChange = (newDays: number) => {
    setLookbackDays(newDays);
    loadData(newDays);
  };

  // Trigger evaluation
  const handleRunEvaluation = async () => {
    try {
      setEvaluating(true);
      setEvaluationBanner(null);
      const res = await apiFetch<SignalEvaluationResult>(
        `/api/v1/signals/evaluate?lookback_days=${lookbackDays}`,
        {
          method: 'POST',
        }
      );
      if (res) {
        const windowDesc =
          lookbackDays === 90
            ? '3 months'
            : lookbackDays === 180
            ? '6 months'
            : lookbackDays === 365
            ? '1 year'
            : '2 years';
        setEvaluationBanner(
          `Radar sweep completed (${windowDesc} lookback): ${res.new_signals_detected} new signals flagged, ${res.refreshed_signals} refreshed. Total active: ${res.total_active_signals}.`
        );
        await loadData(lookbackDays);
      }
    } catch (err: any) {
      setEvaluationBanner(`Evaluation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setEvaluating(false);
    }
  };

  // State transitions
  const handleAcknowledge = async (signalId: string) => {
    try {
      setActionInProgress(signalId);
      await apiFetch(`/api/v1/signals/detected/${signalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'acknowledged' }),
      });
      await loadData();
    } catch (err) {
      console.error('Failed to acknowledge signal:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleOpenActionModal = (signal: DetectedSignal, action: 'actioned' | 'dismissed') => {
    setModalSignal(signal);
    setModalActionType(action);
    setResolutionNotes('');
  };

  const handleSaveModalAction = async () => {
    if (!modalSignal || !modalActionType) return;
    try {
      setActionInProgress(modalSignal.id);
      await apiFetch(`/api/v1/signals/detected/${modalSignal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: modalActionType,
          resolution_notes: resolutionNotes.trim() || undefined,
        }),
      });
      setModalSignal(null);
      setModalActionType(null);
      setResolutionNotes('');
      await loadData();
    } catch (err) {
      console.error('Failed to update signal:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleLinkPerson = async (signalId: string, personId: string, role: string) => {
    try {
      setActionInProgress(signalId);
      await apiFetch(`/api/v1/signals/detected/${signalId}/persons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: personId, role }),
      });
      await loadData();
    } catch (err) {
      console.error('Failed to link person to signal:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUnlinkPerson = async (signalId: string, personId: string) => {
    try {
      setActionInProgress(signalId);
      await apiFetch(`/api/v1/signals/detected/${signalId}/persons/${personId}`, {
        method: 'DELETE',
      });
      await loadData();
    } catch (err) {
      console.error('Failed to unlink person from signal:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Filtered and sorted detected signals
  const filteredSignals = useMemo(() => {
    const list = signals.filter((s) => {
      // Dedicated tab filters
      if (activeTab === 'conflicts' && !s.has_conflict) {
        return false;
      }
      if (activeTab === 'uncertain' && !s.is_uncertain) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) {
        return false;
      }
      // Category filter
      const sCategory = s.signal?.category?.toLowerCase() || '';
      if (categoryFilter !== 'all' && sCategory !== categoryFilter) {
        return false;
      }
      // Severity filter
      if (severityFilter !== 'all' && s.severity !== severityFilter) {
        return false;
      }
      // Signal Type filter
      if (signalTypeFilter !== 'all') {
        const targetSlug = normalizeSlug(signalTypeFilter);
        const sigSlug = normalizeSlug(s.signal_id);
        const defSlug = normalizeSlug(s.signal?.id);
        if (
          s.signal_id !== signalTypeFilter &&
          s.signal?.id !== signalTypeFilter &&
          sigSlug !== targetSlug &&
          defSlug !== targetSlug
        ) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = s.title.toLowerCase().includes(q);
        const matchesSummary = s.summary?.toLowerCase().includes(q) ?? false;
        const matchesCompany = s.company_name?.toLowerCase().includes(q) ?? false;
        const matchesPerson =
          (s.person_name?.toLowerCase().includes(q) ?? false) ||
          (s.connected_persons?.some((p) => {
            const pName = p.name || [p.first_name, p.last_name].filter(Boolean).join(' ');
            return pName.toLowerCase().includes(q);
          }) ?? false);
        const matchesOpp = s.opportunity_title?.toLowerCase().includes(q) ?? false;
        const matchesEng = s.engagement_title?.toLowerCase().includes(q) ?? false;
        if (
          !matchesTitle &&
          !matchesSummary &&
          !matchesCompany &&
          !matchesPerson &&
          !matchesOpp &&
          !matchesEng
        ) {
          return false;
        }
      }
      return true;
    });

    const severityWeight: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const sorted = [...list];
    if (sortBy === 'newest') {
      sorted.sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());
    } else if (sortBy === 'oldest') {
      sorted.sort((a, b) => new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime());
    } else if (sortBy === 'severity') {
      sorted.sort((a, b) => {
        const diff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
        if (diff !== 0) return diff;
        return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
      });
    } else if (sortBy === 'confidence_desc') {
      sorted.sort((a, b) => {
        const scoreA = a.confidence_score ?? 0;
        const scoreB = b.confidence_score ?? 0;
        const diff = scoreB - scoreA;
        if (diff !== 0) return diff;
        return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
      });
    } else if (sortBy === 'confidence_asc') {
      sorted.sort((a, b) => {
        const scoreA = a.confidence_score ?? 0;
        const scoreB = b.confidence_score ?? 0;
        const diff = scoreA - scoreB;
        if (diff !== 0) return diff;
        return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
      });
    }

    return sorted;
  }, [signals, activeTab, statusFilter, categoryFilter, severityFilter, signalTypeFilter, searchQuery, sortBy]);

  const opportunitySignals = useMemo(() => {
    return filteredSignals.filter(
      (s) =>
        !s.has_conflict &&
        (s.signal?.category?.toLowerCase() === 'opportunity' ||
          (s as any).category?.toLowerCase() === 'opportunity')
    );
  }, [filteredSignals]);

  const riskSignals = useMemo(() => {
    return filteredSignals.filter(
      (s) =>
        !s.has_conflict &&
        (s.signal?.category?.toLowerCase() === 'risk' ||
          (s as any).category?.toLowerCase() === 'risk')
    );
  }, [filteredSignals]);

  const hybridSignals = useMemo(() => {
    return filteredSignals.filter(
      (s) =>
        s.has_conflict ||
        s.signal?.category?.toLowerCase() === 'hybrid' ||
        (s as any).category?.toLowerCase() === 'hybrid'
    );
  }, [filteredSignals]);

  // Badge stylings
  const getSeverityBadge = (severity: SignalSeverity | string) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-100 text-rose-800 border-rose-200 font-semibold';
      case 'high':
        return 'bg-amber-100 text-amber-800 border-amber-200 font-medium';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getCategoryBadge = (category: SignalCategory | string) => {
    switch (category) {
      case 'opportunity':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'risk':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'hybrid':
      default:
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  const getStatusBadge = (status: DetectedSignalStatus) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'acknowledged':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'actioned':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'dismissed':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const renderSignalCard = (sig: DetectedSignal, columnVariant: 'opportunity' | 'risk' | 'hybrid') => {
    const borderAccent =
      columnVariant === 'opportunity'
        ? 'border-l-4 border-l-emerald-500'
        : columnVariant === 'risk'
        ? 'border-l-4 border-l-rose-500'
        : 'border-l-4 border-l-amber-500';

    return (
      <div
        key={sig.id}
        className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition p-4 flex flex-col justify-between gap-3 ${borderAccent}`}
      >
        <div className="space-y-2 min-w-0">
          {/* Top Status & Indicator Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${getSeverityBadge(
                sig.severity
              )}`}
            >
              {sig.severity.toUpperCase()}
            </span>
            {sig.signal?.category && (
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border ${getCategoryBadge(
                  sig.signal.category
                )}`}
              >
                {sig.signal.category.toLowerCase() === 'hybrid' ? 'Mixed' : sig.signal.category}
              </span>
            )}
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border ${getStatusBadge(
                sig.status
              )}`}
            >
              {sig.status}
            </span>
            {sig.confidence_score !== undefined && sig.confidence_score !== null && (
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                  sig.confidence_score >= 0.8 || sig.confidence_tier === 'high'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : sig.confidence_score >= 0.5 || sig.confidence_tier === 'medium'
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                🎯 {Math.round(sig.confidence_score * 100)}% Confidence
              </span>
            )}
            {sig.has_conflict && (
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200 font-semibold flex items-center gap-1">
                <span>⚠️</span>
                <span>Opposing Signal Polarity Detected</span>
              </span>
            )}
            {sig.is_uncertain && (
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 font-semibold flex items-center gap-1">
                <span>🔍</span>
                <span>Classification Uncertainty — Verification Recommended</span>
              </span>
            )}
            <span className="text-[11px] text-slate-400">
              {new Date(sig.detected_at).toLocaleDateString()}
            </span>
          </div>

          {/* Title and Short Summary */}
          <div>
            <Link
              href={`/signals/${sig.id}`}
              className="text-sm sm:text-base font-semibold text-slate-900 hover:text-emerald-600 transition flex items-center gap-1.5 group"
            >
              <span className="text-base">{sig.signal?.icon || '⚡'}</span>
              <span className="group-hover:underline">{sig.title}</span>
            </Link>
            {sig.summary && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {sig.summary}
              </p>
            )}
          </div>

          {/* Compact Entity Link Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
            {sig.company_name && (
              <Link
                href={
                  sig.company_id
                    ? `/companies/${sig.company_id}`
                    : `/companies?q=${encodeURIComponent(sig.company_name)}`
                }
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition font-medium text-[11px]"
              >
                <span>🏢</span>
                <span className="truncate max-w-[140px]">{sig.company_name}</span>
              </Link>
            )}
            {sig.connected_persons && sig.connected_persons.length > 0 ? (
              sig.connected_persons.map((p) => {
                const pName =
                  p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Contact';
                return (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium"
                  >
                    <span>👤</span>
                    <Link
                      href={`/persons/${p.id}`}
                      className="hover:underline truncate max-w-[130px]"
                      title={p.role ? `${pName} (${p.role})` : pName}
                    >
                      {pName}
                    </Link>
                    {p.role && (
                      <span className="text-[9px] uppercase font-bold text-emerald-600 bg-emerald-100/80 px-1 rounded">
                        {p.role}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleUnlinkPerson(sig.id, p.id);
                      }}
                      disabled={actionInProgress === sig.id}
                      className="text-emerald-500 hover:text-rose-600 hover:bg-emerald-100/50 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] ml-0.5 cursor-pointer"
                      title={`Unlink ${pName}`}
                    >
                      ✕
                    </button>
                  </span>
                );
              })
            ) : sig.person_name ? (
              <Link
                href={
                  sig.person_id
                    ? `/persons/${sig.person_id}`
                    : `/persons?q=${encodeURIComponent(sig.person_name)}`
                }
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition font-medium text-[11px]"
              >
                <span>👤</span>
                <span className="truncate max-w-[140px]">{sig.person_name}</span>
              </Link>
            ) : null}
            {sig.opportunity_title && (
              <Link
                href={`/opportunities?search=${encodeURIComponent(sig.opportunity_title)}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition font-medium text-[11px]"
              >
                <span>💼</span>
                <span className="truncate max-w-[140px]">{sig.opportunity_title}</span>
              </Link>
            )}
            {sig.engagement_title && (
              <Link
                href="/engagements"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition font-medium text-[11px]"
              >
                <span>📋</span>
                <span className="truncate max-w-[140px]">{sig.engagement_title}</span>
              </Link>
            )}
          </div>

          {/* Suggested People Prompt Bar */}
          {sig.suggested_persons && sig.suggested_persons.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs">
              <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider flex items-center gap-1">
                <span>💡 Suggested:</span>
              </span>
              {sig.suggested_persons.map((sp, idx) => (
                sp.person_id ? (
                  <button
                    key={sp.person_id || idx}
                    onClick={() => handleLinkPerson(sig.id, sp.person_id!, sp.role || 'counterparty')}
                    disabled={actionInProgress === sig.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-semibold transition cursor-pointer shadow-2xs"
                    title={`Click to link ${sp.name} (${sp.role || 'contact'}) to this signal`}
                  >
                    <span className="text-indigo-600 font-bold">+</span>
                    <span>{sp.name}</span>
                    {sp.role && (
                      <span className="text-[9px] uppercase font-bold text-indigo-600">
                        ({sp.role})
                      </span>
                    )}
                  </button>
                ) : null
              ))}
            </div>
          )}
        </div>

        {/* Card Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-1">
          <Link
            href={`/signals/${sig.id}`}
            className="px-2.5 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-sm whitespace-nowrap"
          >
            <span>View Details</span>
            <span>→</span>
          </Link>

          {sig.status === 'active' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleAcknowledge(sig.id)}
                disabled={actionInProgress === sig.id}
                className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap"
                title="Mark as Acknowledged"
              >
                Acknowledge
              </button>
              <button
                onClick={() => handleOpenActionModal(sig, 'actioned')}
                disabled={actionInProgress === sig.id}
                className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap"
                title="Record Action"
              >
                Take Action
              </button>
              <button
                onClick={() => handleOpenActionModal(sig, 'dismissed')}
                disabled={actionInProgress === sig.id}
                className="px-1.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs transition cursor-pointer"
                title="Dismiss Signal"
              >
                Dismiss
              </button>
            </div>
          )}

          {sig.status === 'acknowledged' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleOpenActionModal(sig, 'actioned')}
                disabled={actionInProgress === sig.id}
                className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap"
              >
                Take Action
              </button>
              <button
                onClick={() => handleOpenActionModal(sig, 'dismissed')}
                disabled={actionInProgress === sig.id}
                className="px-1.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs transition cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {(sig.status === 'actioned' || sig.status === 'dismissed') && (
            <span className="text-[11px] font-medium text-slate-400 italic">
              Archived as {sig.status}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold tracking-wider uppercase border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Intelligence Radar
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Opportunity & Risk Signals Radar
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
              Automated multi-entity detection engine scanning dormant accounts, unanswered client
              messages, contract renewal cliffs, executive departures, market funding, and competitor
              displacements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3 py-2 rounded-xl text-xs text-slate-200">
              <span className="text-slate-400 font-medium">Lookback:</span>
              <select
                id="header-lookback-select"
                aria-label="Select lookback window"
                value={lookbackDays}
                onChange={(e) => handleLookbackChange(Number(e.target.value))}
                className="bg-transparent text-emerald-300 font-bold focus:outline-none cursor-pointer"
              >
                <option value={90} className="bg-slate-900 text-white">3 Months (Default)</option>
                <option value={180} className="bg-slate-900 text-white">6 Months</option>
                <option value={365} className="bg-slate-900 text-white">1 Year</option>
                <option value={730} className="bg-slate-900 text-white">2 Years (Max)</option>
              </select>
            </div>

            <button
              onClick={handleRunEvaluation}
              disabled={evaluating}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-900 font-semibold text-sm rounded-xl shadow-md transition duration-150 disabled:opacity-50 cursor-pointer"
            >
              {evaluating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-900"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Evaluating DB...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Run Signal Detection
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Optional Feedback Alert Banner */}
      {evaluationBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>{evaluationBanner}</span>
          </div>
          <button
            onClick={() => setEvaluationBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs uppercase ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Active Signals
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              {stats?.total_active ?? signals.filter((s) => s.status === 'active').length}
            </p>
            <p className="text-xs text-slate-400 mt-1">Requiring commercial attention</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl text-slate-700">
            📡
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Conflicting Signals
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-rose-600 mt-1">
              {stats?.total_conflicting ?? signals.filter((s) => s.has_conflict).length}
            </p>
            <p className="text-xs text-rose-500 mt-1">Opposing polarities</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-xl text-rose-600">
            ⚠️
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Needs Verification
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-amber-600 mt-1">
              {stats?.total_uncertain ?? signals.filter((s) => s.is_uncertain).length}
            </p>
            <p className="text-xs text-amber-500 mt-1">Low confidence / ambiguous</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl text-amber-600">
            🔍
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Critical & High Risks
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-rose-600 mt-1">
              {(stats?.by_severity?.critical ?? 0) + (stats?.by_severity?.high ?? 0)}
            </p>
            <p className="text-xs text-rose-500 mt-1">Urgent churn & dormant risks</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-xl text-rose-600">
            🔥
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Active Opportunities
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">
              {stats?.by_category?.opportunity ?? 0}
            </p>
            <p className="text-xs text-emerald-600 mt-1">Hiring, funding & expansions</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl text-emerald-600">
            🚀
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex flex-wrap gap-4 sm:gap-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('triage')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'triage'
                ? 'border-emerald-500 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span>All Active Signals</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              {signals.filter((s) => s.status === 'active').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('conflicts')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'conflicts'
                ? 'border-rose-500 text-rose-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span>⚠️ Conflicting Signals</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
              {signals.filter((s) => s.has_conflict).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('uncertain')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'uncertain'
                ? 'border-amber-500 text-amber-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span>🔍 Needs Verification</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              {signals.filter((s) => s.is_uncertain).length}
            </span>
          </button>

          <button
            id="tab-metrics"
            onClick={() => setActiveTab('metrics')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'metrics'
                ? 'border-purple-500 text-purple-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span>📊 Success & Quality Metrics</span>
            {metrics?.quality?.total_detected !== undefined && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                {metrics.quality.total_detected}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-indigo-500 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span>Signal Dimension Catalog</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {catalog.length || 6}
            </span>
          </button>
        </nav>
      </div>

      {/* TAB: TRIAGE FEED (All, Conflicting, or Needs Verification) */}
      {activeTab !== 'catalog' && activeTab !== 'metrics' && (
        <div className="space-y-6">
          {/* Filter Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search signals by entity, title, or summary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Quick Filter Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="active">Status: Active Only</option>
                <option value="acknowledged">Status: Acknowledged</option>
                <option value="actioned">Status: Actioned</option>
                <option value="dismissed">Status: Dismissed</option>
                <option value="all">Status: All Statuses</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setCategoryFilter(newCat);
                  if (newCat !== 'all' && signalTypeFilter !== 'all') {
                    const matched = catalog.find(
                      (c) =>
                        c.id === signalTypeFilter ||
                        normalizeSlug(c.id) === normalizeSlug(signalTypeFilter)
                    );
                    if (
                      matched &&
                      matched.category?.toLowerCase() !== newCat.toLowerCase() &&
                      matched.category?.toLowerCase() !== 'hybrid'
                    ) {
                      setSignalTypeFilter('all');
                    }
                  }
                }}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Category: All</option>
                <option value="opportunity">Opportunity</option>
                <option value="risk">Risk</option>
                <option value="hybrid">Mixed</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Severity: All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                id="signal-type-filter"
                aria-label="Filter by Signal Type"
                value={signalTypeFilter}
                onChange={(e) => setSignalTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Signal: All Types</option>
                {availableCatalog && availableCatalog.length > 0 ? (
                  availableCatalog.map((def) => (
                    <option key={def.id} value={def.id}>
                      {def.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="dormant_strategic_account">Dormant Strategic Account</option>
                    <option value="unanswered_conversation">Unanswered Conversation</option>
                    <option value="expiring_contract">Expiring Contract</option>
                    <option value="leadership_change">Leadership Change</option>
                    <option value="hiring_funding_event">Hiring or Funding Event</option>
                    <option value="competitor_signal">Competitor Signal</option>
                  </>
                )}
              </select>

              <select
                id="sort-by-filter"
                aria-label="Sort Signals"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="newest">Sort: Newest First (Default)</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="severity">Sort: Highest Severity</option>
                <option value="confidence_desc">Sort: Highest Confidence</option>
                <option value="confidence_asc">Sort: Lowest Confidence</option>
              </select>

              <select
                id="lookback-filter"
                aria-label="Filter by Lookback Window"
                value={lookbackDays}
                onChange={(e) => handleLookbackChange(Number(e.target.value))}
                className="px-3 py-2 text-xs font-semibold bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={90}>Lookback: 3 Months (Default)</option>
                <option value={180}>Lookback: 6 Months</option>
                <option value={365}>Lookback: 1 Year</option>
                <option value={730}>Lookback: 2 Years (Max)</option>
              </select>

              {(statusFilter !== 'active' ||
                categoryFilter !== 'all' ||
                severityFilter !== 'all' ||
                signalTypeFilter !== 'all' ||
                sortBy !== 'newest' ||
                lookbackDays !== 90 ||
                searchQuery.trim().length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('active');
                    setCategoryFilter('all');
                    setSeverityFilter('all');
                    setSignalTypeFilter('all');
                    setSortBy('newest');
                    setSearchQuery('');
                    setLookbackDays(90);
                    loadData(90);
                  }}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-dashed border-slate-300 transition-colors"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Feed List */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
              <svg
                className="animate-spin h-6 w-6 text-emerald-500 mx-auto mb-3"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Scanning signal state across entities...
            </div>
          ) : filteredSignals.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-xl">
                ✓
              </div>
              <h3 className="text-base font-medium text-slate-800">No signals matching filter</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                No detected signals match your current status or filter criteria. Click &quot;Run
                Signal Detection&quot; to perform a fresh sweep.
              </p>
              <button
                onClick={handleRunEvaluation}
                className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition"
              >
                Run Detection Sweep Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Column 1: Opportunities */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🟢</span>
                    <div>
                      <h2 className="text-sm font-bold text-emerald-900">Opportunities</h2>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Upside, Expansion & Inbound Intent
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900 border border-emerald-300">
                    {opportunitySignals.length}
                  </span>
                </div>

                {opportunitySignals.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                    No active opportunity signals
                  </div>
                ) : (
                  <div className="space-y-3">
                    {opportunitySignals.map((sig) => renderSignalCard(sig, 'opportunity'))}
                  </div>
                )}
              </div>

              {/* Column 2: Mixed */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🟡</span>
                    <div>
                      <h2 className="text-sm font-bold text-amber-900">Mixed</h2>
                      <p className="text-[11px] text-amber-700 font-medium">
                        Opposing Polarities & Ambiguity
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900 border border-amber-300">
                    {hybridSignals.length}
                  </span>
                </div>

                {hybridSignals.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                    No mixed signals detected
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hybridSignals.map((sig) => renderSignalCard(sig, 'hybrid'))}
                  </div>
                )}
              </div>

              {/* Column 3: Risks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔴</span>
                    <div>
                      <h2 className="text-sm font-bold text-rose-900">Risks</h2>
                      <p className="text-[11px] text-rose-700 font-medium">
                        Loss Prevention & Churn Threats
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-200 text-rose-900 border border-rose-300">
                    {riskSignals.length}
                  </span>
                </div>

                {riskSignals.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                    No active risk signals detected
                  </div>
                ) : (
                  <div className="space-y-3">
                    {riskSignals.map((sig) => renderSignalCard(sig, 'risk'))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SIGNAL DIMENSION CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 flex items-center justify-between">
            <p>
              The <strong>Signal Catalog</strong> acts as the central dimension table defining business
              interpretations, detection mechanisms, and actionable playbooks across CDB entities.
            </p>
            <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700">
              6 Core Signals Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalog.map((def) => (
              <div
                key={def.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{def.icon || '⚡'}</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${getSeverityBadge(
                          def.severity
                        )}`}
                      >
                        {def.severity}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${getCategoryBadge(
                          def.category
                        )}`}
                      >
                        {def.category}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{def.name}</h3>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{def.id}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                        Target: {def.target_entity}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                        {def.detection_mechanism.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1">
                        Business Interpretation
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {def.business_interpretation}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5 text-xs text-emerald-900 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <span>🎯</span>
                      <span>Playbook: {def.recommended_action?.title || 'Next Action'}</span>
                    </p>
                    {def.recommended_action?.description && (
                      <p className="text-emerald-800 text-xs">
                        {def.recommended_action.description}
                      </p>
                    )}
                  </div>

                  {def.parameters && Object.keys(def.parameters).length > 0 && (
                    <div className="text-[11px] text-slate-400 font-mono">
                      Params: {JSON.stringify(def.parameters)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SUCCESS & QUALITY METRICS */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {/* Header Controls & Timeframe Selector */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>📊</span>
                <span>Signal Performance & Success Metrics</span>
              </h2>
              <p className="text-xs text-slate-500">
                Measures detection quality, operational triage speed (MTTA), downstream opportunity creation, and revenue impact across a 90-day correlation window.
              </p>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              {[
                { label: '30d', days: 30 },
                { label: '90d (Default)', days: 90 },
                { label: '180d', days: 180 },
                { label: '1 Year', days: 365 },
                { label: '2 Years', days: 730 },
              ].map((tf) => (
                <button
                  key={tf.days}
                  onClick={() => handleLookbackChange(tf.days)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    lookbackDays === tf.days
                      ? 'bg-white text-purple-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {!metrics ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              Loading signal metrics...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top 4 Primary KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Action & Acceptance Rate */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Action / Acceptance Rate
                    </span>
                    <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-base">
                      🎯
                    </span>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-slate-900">
                      {(metrics.quality.action_rate * 100).toFixed(1)}%
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {metrics.quality.total_actioned} actioned · {metrics.quality.total_dismissed} dismissed
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Precision Proxy:</span>
                    <span className="font-semibold text-slate-800">
                      {(metrics.quality.precision_proxy * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* 2. Mean Time to Action (MTTA) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Time-to-Action (MTTA)
                    </span>
                    <span className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-base">
                      ⏱️
                    </span>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-slate-900">
                      {metrics.latency.mean_time_to_action_hours !== null &&
                      metrics.latency.mean_time_to_action_hours !== undefined
                        ? `${metrics.latency.mean_time_to_action_hours} hrs`
                        : '—'}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Median (p50):{' '}
                      {metrics.latency.median_time_to_action_hours !== null &&
                      metrics.latency.median_time_to_action_hours !== undefined
                        ? `${metrics.latency.median_time_to_action_hours} hrs`
                        : '—'}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>SLA Breaches:</span>
                    <span
                      className={`font-semibold ${
                        metrics.latency.sla_breach_count > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {metrics.latency.sla_breach_count} ({ (metrics.latency.sla_breach_rate * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* 3. Influenced Pipeline */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Influenced Pipeline
                    </span>
                    <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-base">
                      💰
                    </span>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-slate-900">
                      ${Number(metrics.revenue.influenced_pipeline_total).toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Weighted: ${Number(metrics.revenue.weighted_influenced_pipeline_total).toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Protected Revenue:</span>
                    <span className="font-semibold text-emerald-700">
                      ${Number(metrics.revenue.protected_revenue_total).toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>

                {/* 4. Downstream Outcomes (90-Day Window) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      90d Downstream Outcomes
                    </span>
                    <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-base">
                      🚀
                    </span>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-slate-900">
                      {metrics.outcomes.opportunities_created_count} Deals
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {(metrics.outcomes.opportunity_conversion_rate * 100).toFixed(1)}% Conversion Rate
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Reactivations:</span>
                    <span className="font-semibold text-slate-800">
                      {metrics.outcomes.account_reactivations_count} accounts
                    </span>
                  </div>
                </div>
              </div>

              {/* Quality & Detection Health Metrics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 font-medium">Detection Precision Proxy</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">
                      {(metrics.quality.precision_proxy * 100).toFixed(1)}%
                    </p>
                  </div>
                  <span className="text-slate-400">1 - Dismissal %</span>
                </div>

                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
                  <div>
                    <p className="text-amber-700 font-medium">Needs Verification Rate</p>
                    <p className="text-lg font-bold text-amber-900 mt-0.5">
                      {(metrics.quality.needs_verification_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <span className="text-amber-600">Low confidence / Ambiguity</span>
                </div>

                <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 text-xs flex items-center justify-between">
                  <div>
                    <p className="text-rose-700 font-medium">Opposing Conflict Rate</p>
                    <p className="text-lg font-bold text-rose-900 mt-0.5">
                      {(metrics.quality.conflict_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <span className="text-rose-600">Multi-Entity Clashes</span>
                </div>

                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                  <div>
                    <p className="text-emerald-700 font-medium">Deal Value Coverage</p>
                    <p className="text-lg font-bold text-emerald-900 mt-0.5">
                      {(metrics.revenue.value_coverage_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <span className="text-emerald-600">Attributed non-null values</span>
                </div>
              </div>

              {/* Detailed Breakdown by Signal Type Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Performance Breakdown by Signal Type</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Triage action rates, latency, and commercial conversion for each signal rule in the catalog.
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Window: {metrics.lookback_days} days
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3.5 px-4">Signal Name</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Severity</th>
                        <th className="py-3.5 px-4 text-right">Detected</th>
                        <th className="py-3.5 px-4 text-right">Actioned</th>
                        <th className="py-3.5 px-4 text-right">Action Rate</th>
                        <th className="py-3.5 px-4 text-right">MTTA (hrs)</th>
                        <th className="py-3.5 px-4 text-right">Opps Created</th>
                        <th className="py-3.5 px-4 text-right">Pipeline ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {metrics.by_signal.map((row) => (
                        <tr key={row.key} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                            <span>{row.label}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            {row.category && (
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryBadge(
                                  row.category
                                )}`}
                              >
                                {row.category}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {row.severity && (
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getSeverityBadge(
                                  row.severity
                                )}`}
                              >
                                {row.severity}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                            {row.total_detected}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                            {row.actioned_count}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                            {(row.action_rate * 100).toFixed(1)}%
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                            {row.mean_time_to_action_hours !== null && row.mean_time_to_action_hours !== undefined
                              ? row.mean_time_to_action_hours
                              : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-indigo-700">
                            {row.opportunities_created_count}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            ${Number(row.influenced_pipeline).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Category & Severity Distribution Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By Category */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Breakdown by Category
                  </h4>
                  <div className="space-y-3">
                    {metrics.by_category.map((cat) => (
                      <div
                        key={cat.key}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full border font-semibold text-[11px] ${getCategoryBadge(
                              cat.key
                            )}`}
                          >
                            {cat.label}
                          </span>
                          <span className="text-slate-500">({cat.total_detected} detected)</span>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <span className="font-semibold text-emerald-700">
                            {(cat.action_rate * 100).toFixed(1)}% actioned
                          </span>
                          <span className="font-bold text-slate-900">
                            ${Number(cat.influenced_pipeline).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Severity */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Breakdown by Severity Level
                  </h4>
                  <div className="space-y-3">
                    {metrics.by_severity.map((sev) => (
                      <div
                        key={sev.key}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full border font-semibold text-[11px] ${getSeverityBadge(
                              sev.key
                            )}`}
                          >
                            {sev.label}
                          </span>
                          <span className="text-slate-500">({sev.total_detected} detected)</span>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <span className="font-semibold text-emerald-700">
                            {(sev.action_rate * 100).toFixed(1)}% actioned
                          </span>
                          <span className="font-bold text-slate-900">
                            ${Number(sev.influenced_pipeline).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action / Dismiss Notes Modal */}
      {modalSignal && modalActionType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {modalActionType === 'actioned' ? 'Record Taken Action' : 'Dismiss Signal Alert'}
              </h3>
              <button
                onClick={() => {
                  setModalSignal(null);
                  setModalActionType(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Signal:{' '}
                <strong className="text-slate-800 font-semibold">{modalSignal.title}</strong>
              </p>
              <label className="block text-xs font-semibold text-slate-700">
                {modalActionType === 'actioned'
                  ? 'Resolution Notes / Commercial Next Step'
                  : 'Reason for Dismissal'}
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder={
                  modalActionType === 'actioned'
                    ? 'e.g., Scheduled executive check-in for next Tuesday via email...'
                    : 'e.g., False positive, contact already communicated via WhatsApp.'
                }
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setModalSignal(null);
                  setModalActionType(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModalAction}
                disabled={actionInProgress === modalSignal.id}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition shadow-sm cursor-pointer ${
                  modalActionType === 'actioned'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-slate-800 hover:bg-slate-900'
                }`}
              >
                {modalActionType === 'actioned' ? 'Mark as Actioned' : 'Dismiss Signal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
