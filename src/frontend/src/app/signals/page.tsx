'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';

export type SignalCategory = 'opportunity' | 'risk' | 'hybrid';
export type SignalSeverity = 'critical' | 'high' | 'medium' | 'low';
export type DetectedSignalStatus =
  | 'active'
  | 'acknowledged'
  | 'actioned'
  | 'snoozed'
  | 'dismissed'
  | 'resolved';

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

export interface SupportingEvidence {
  evidence_type?: string;
  source_entity_type?: string;
  source_entity_id?: string | null;
  source_display?: string | null;
  trigger_event_title?: string | null;
  why_it_matters_now?: string | null;
  occurred_at?: string | null;
  days_elapsed?: number | null;
  excerpt?: string | null;
  evidence_status?: 'fresh' | 'stale' | 'incomplete' | 'conflicting' | 'unverified' | string;
  evidence_notes?: string[];
  commercial_context?: Record<string, any>;
  relationship_context?: Record<string, any>;
  key_metrics?: Record<string, any>;
  verification_status?: string;
}

export type PriorityTier = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export interface PriorityBreakdown {
  account_importance_score: number;
  relationship_context_score: number;
  urgency_score: number;
  business_impact_score: number;
  total_score: number;
  priority_tier: PriorityTier;
  effective_polarity: string;
  impact_rationale: string;
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
  priority_score?: number | null;
  priority_tier?: PriorityTier | string | null;
  effective_polarity?: 'opportunity' | 'risk' | string | null;
  priority_breakdown?: PriorityBreakdown | Record<string, any> | null;
  confidence_score?: number | null;
  confidence_tier?: 'high' | 'medium' | 'low' | string | null;
  is_uncertain?: boolean;
  uncertainty_reasons?: string[];
  has_conflict?: boolean;
  conflicting_signal_ids?: string[];
  conflict_summary?: string | null;
  conflict_scope?: string | null;
  evidence?: SupportingEvidence | Record<string, any> | null;
  why_it_matters_now?: string | null;
  evidence_fingerprint?: string | null;
  title: string;
  summary?: string | null;
  metadata?: Record<string, any>;
  actioned_at?: string | null;
  actioned_by_id?: string | null;
  resolution_notes?: string | null;
  snoozed_until?: string | null;
  reopen_count?: number;
  last_reopened_at?: string | null;
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
  total_snoozed: number;
  total_active: number;
  total_reopened: number;
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
  snoozed_count?: number;
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
  total_snoozed?: number;
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
  total_snoozed_signals?: number;
  total_suppressed_duplicates?: number;
  total_reopened_signals?: number;
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
  const [activeTab, setActiveTab] = useState<
    'triage' | 'conflicts' | 'uncertain' | 'metrics' | 'catalog'
  >('triage');
  const [viewMode, setViewMode] = useState<'feed' | 'account_group'>('feed');
  const [catalog, setCatalog] = useState<SignalDefinition[]>([]);
  const [signals, setSignals] = useState<DetectedSignal[]>([]);
  const [stats, setStats] = useState<DetectedSignalStatsResponse | null>(null);
  const [metrics, setMetrics] = useState<SignalMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationBanner, setEvaluationBanner] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Multi-selection state for Bulk Actions
  const [selectedSignalIds, setSelectedSignalIds] = useState<string[]>([]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [signalTypeFilter, setSignalTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('priority');
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

  // Modal state for Action / Dismiss / Snooze / Resolve
  const [modalSignal, setModalSignal] = useState<DetectedSignal | null>(null);
  const [modalActionType, setModalActionType] = useState<
    'actioned' | 'dismissed' | 'snoozed' | 'resolved' | null
  >(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [dismissalReason, setDismissalReason] = useState('Not Relevant');
  const [snoozeDays, setSnoozeDays] = useState<number>(14);
  const [customSnoozeDate, setCustomSnoozeDate] = useState<string>('');

  // Load initial data
  const loadData = async (lookback: number = lookbackDays) => {
    try {
      setLoading(true);
      const [catRes, sigRes, statRes, metricsRes] = await Promise.allSettled([
        apiFetch<SignalCatalogResponse>('/api/v1/signals/catalog'),
        apiFetch<ApiResponse<DetectedSignal[]>>(
          `/api/v1/signals/detected?page_size=200&lookback_days=${lookback}&sort_by=priority`
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
        const suppressedText =
          res.total_suppressed_duplicates !== undefined && res.total_suppressed_duplicates > 0
            ? `, ${res.total_suppressed_duplicates} duplicates suppressed`
            : '';
        const reopenedText =
          res.total_reopened_signals !== undefined && res.total_reopened_signals > 0
            ? `, ${res.total_reopened_signals} re-opened`
            : '';
        setEvaluationBanner(
          `Radar sweep completed (${windowDesc} lookback): ${res.new_signals_detected} new signals flagged, ${res.refreshed_signals} refreshed${suppressedText}${reopenedText}. Total active: ${res.total_active_signals}.`
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

  const handleOpenActionModal = (
    signal: DetectedSignal,
    action: 'actioned' | 'dismissed' | 'snoozed' | 'resolved'
  ) => {
    setModalSignal(signal);
    setModalActionType(action);
    setResolutionNotes(signal.resolution_notes || '');
    setDismissalReason('Not Relevant');
    setSnoozeDays(14);
    setCustomSnoozeDate('');
  };

  const handleSaveModalAction = async () => {
    if (!modalSignal || !modalActionType) return;
    try {
      setActionInProgress(modalSignal.id);
      const payload: Record<string, any> = {
        status: modalActionType,
      };

      if (modalActionType === 'dismissed') {
        const fullNotes = resolutionNotes.trim()
          ? `[${dismissalReason}] ${resolutionNotes.trim()}`
          : `[${dismissalReason}] Dismissed by user`;
        payload.resolution_notes = fullNotes;
      } else if (modalActionType === 'snoozed') {
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

      await apiFetch(`/api/v1/signals/detected/${modalSignal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  // Bulk Actions
  const handleBulkAction = async (targetStatus: DetectedSignalStatus) => {
    if (selectedSignalIds.length === 0) return;
    try {
      setLoading(true);
      await apiFetch('/api/v1/signals/detected/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal_ids: selectedSignalIds,
          status: targetStatus,
          snooze_days: targetStatus === 'snoozed' ? 14 : undefined,
          resolution_notes: `Bulk updated to ${targetStatus}`,
        }),
      });
      setSelectedSignalIds([]);
      await loadData();
    } catch (err) {
      console.error('Failed bulk update:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectSignal = (id: string) => {
    setSelectedSignalIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSignalIds.length === filteredSignals.length) {
      setSelectedSignalIds([]);
    } else {
      setSelectedSignalIds(filteredSignals.map((s) => s.id));
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
      if (categoryFilter !== 'all') {
        const cat = s.signal?.category?.toLowerCase() || (s as any).category?.toLowerCase();
        if (cat !== categoryFilter.toLowerCase() && cat !== 'hybrid') {
          return false;
        }
      }

      // Severity filter
      if (severityFilter !== 'all' && s.severity !== severityFilter) {
        return false;
      }

      // Signal type filter
      if (signalTypeFilter !== 'all') {
        const sigSlug = normalizeSlug(s.signal_id);
        const filterSlug = normalizeSlug(signalTypeFilter);
        if (sigSlug !== filterSlug) {
          return false;
        }
      }

      // Priority Tier filter
      if (priorityFilter !== 'all') {
        const pTier = (
          s.priority_tier ||
          s.metadata?.priority_tier ||
          (s.score && s.score >= 90
            ? 'P0'
            : s.score && s.score >= 75
            ? 'P1'
            : s.score && s.score >= 50
            ? 'P2'
            : s.score && s.score >= 25
            ? 'P3'
            : 'P4')
        )?.toUpperCase();
        if (pTier !== priorityFilter.toUpperCase()) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = s.title.toLowerCase().includes(q);
        const summaryMatch = s.summary ? s.summary.toLowerCase().includes(q) : false;
        const compMatch = s.company_name ? s.company_name.toLowerCase().includes(q) : false;
        const personMatch = s.person_name ? s.person_name.toLowerCase().includes(q) : false;
        const connectedPersonMatch = s.connected_persons
          ? s.connected_persons.some((p) => p.name?.toLowerCase().includes(q))
          : false;
        const oppMatch = s.opportunity_title ? s.opportunity_title.toLowerCase().includes(q) : false;
        const engMatch = s.engagement_title ? s.engagement_title.toLowerCase().includes(q) : false;
        return (
          titleMatch ||
          summaryMatch ||
          compMatch ||
          personMatch ||
          connectedPersonMatch ||
          oppMatch ||
          engMatch
        );
      }

      return true;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === 'priority') {
        const scoreA =
          a.priority_score !== undefined && a.priority_score !== null
            ? Number(a.priority_score)
            : a.score !== undefined && a.score !== null
            ? Number(a.score)
            : 0;
        const scoreB =
          b.priority_score !== undefined && b.priority_score !== null
            ? Number(b.priority_score)
            : b.score !== undefined && b.score !== null
            ? Number(b.score)
            : 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
      }
      if (sortBy === 'newest') {
        return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime();
      }
      if (sortBy === 'severity') {
        const weight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return (weight[b.severity] || 0) - (weight[a.severity] || 0);
      }
      if (sortBy === 'confidence_desc') {
        const scoreA = a.confidence_score !== undefined && a.confidence_score !== null ? a.confidence_score : -1;
        const scoreB = b.confidence_score !== undefined && b.confidence_score !== null ? b.confidence_score : -1;
        return scoreB - scoreA;
      }
      if (sortBy === 'confidence_asc') {
        const scoreA = a.confidence_score !== undefined && a.confidence_score !== null ? a.confidence_score : 2;
        const scoreB = b.confidence_score !== undefined && b.confidence_score !== null ? b.confidence_score : 2;
        return scoreA - scoreB;
      }
      return 0;
    });
  }, [
    signals,
    activeTab,
    statusFilter,
    categoryFilter,
    severityFilter,
    signalTypeFilter,
    priorityFilter,
    searchQuery,
    sortBy,
  ]);

  // Grouped by Account / Organization
  const groupedByAccount = useMemo(() => {
    const map: Record<string, { groupName: string; companyId: string | null; signals: DetectedSignal[] }> = {};
    for (const sig of filteredSignals) {
      const key = sig.company_id ? sig.company_id : sig.person_id ? `person_${sig.person_id}` : 'unaffiliated';
      const name = sig.company_name ? sig.company_name : sig.person_name ? `Contact: ${sig.person_name}` : 'Unaffiliated Signals';
      if (!map[key]) {
        map[key] = { groupName: name, companyId: sig.company_id || null, signals: [] };
      }
      map[key].signals.push(sig);
    }
    return Object.entries(map).sort((a, b) => b[1].signals.length - a[1].signals.length);
  }, [filteredSignals]);

  // Split into categories for 3-column triage feed
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
      case 'snoozed':
        return 'bg-purple-50 text-purple-700 border-purple-200 font-medium';
      case 'resolved':
        return 'bg-teal-50 text-teal-700 border-teal-200 font-medium';
      case 'dismissed':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getPriorityBadge = (priorityTier?: string | null, effectivePolarity?: string | null) => {
    const tier = (priorityTier || 'P2').toUpperCase();
    const pol = (effectivePolarity || '').toLowerCase();
    const isOpp = pol === 'opportunity';

    switch (tier) {
      case 'P0':
        return {
          tier: 'P0',
          label: isOpp ? 'P0 • Critical Opportunity' : 'P0 • Critical Risk',
          shortLabel: 'P0 Critical',
          className: isOpp
            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-bold'
            : 'bg-rose-600 text-white border-rose-700 shadow-sm font-bold',
        };
      case 'P1':
        return {
          tier: 'P1',
          label: isOpp ? 'P1 • High Opportunity' : 'P1 • High Risk',
          shortLabel: 'P1 High',
          className: isOpp
            ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
            : 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
        };
      case 'P2':
        return {
          tier: 'P2',
          label: isOpp ? 'P2 • Medium Opportunity' : 'P2 • Medium Risk',
          shortLabel: 'P2 Medium',
          className: isOpp
            ? 'bg-teal-50 text-teal-800 border-teal-200 font-semibold'
            : 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
        };
      case 'P3':
        return {
          tier: 'P3',
          label: isOpp ? 'P3 • Moderate Opportunity' : 'P3 • Moderate Risk',
          shortLabel: 'P3 Moderate',
          className: 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
        };
      case 'P4':
      default:
        return {
          tier: 'P4',
          label: 'P4 • Low Impact',
          shortLabel: 'P4 Low',
          className: 'bg-slate-50 text-slate-500 border-slate-200 font-normal',
        };
    }
  };

  const getEvidenceHealthBadge = (evidenceStatus?: string, isUncertain?: boolean, hasConflict?: boolean) => {
    if (hasConflict || evidenceStatus === 'conflicting') {
      return {
        label: 'Conflicting',
        className: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: '⚠️',
      };
    }
    if (evidenceStatus === 'stale') {
      return {
        label: 'Stale (>60d)',
        className: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: '🟡',
      };
    }
    if (evidenceStatus === 'incomplete') {
      return {
        label: 'Incomplete',
        className: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: '🟠',
      };
    }
    if (isUncertain || evidenceStatus === 'unverified') {
      return {
        label: 'Unverified',
        className: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: '🔍',
      };
    }
    return {
      label: 'Fresh Evidence',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: '🟢',
    };
  };

  const renderSignalCard = (sig: DetectedSignal, columnVariant: 'opportunity' | 'risk' | 'hybrid') => {
    const isSelected = selectedSignalIds.includes(sig.id);
    const borderAccent =
      columnVariant === 'opportunity'
        ? 'border-l-4 border-l-emerald-500'
        : columnVariant === 'risk'
        ? 'border-l-4 border-l-rose-500'
        : 'border-l-4 border-l-amber-500';

    const evidence = sig.evidence || sig.metadata?.evidence;
    const whyItMatters =
      sig.why_it_matters_now ||
      (evidence && (evidence as any).why_it_matters_now);

    const evidenceStatus =
      (evidence && (evidence as any).evidence_status) ||
      (sig.has_conflict ? 'conflicting' : sig.is_uncertain ? 'unverified' : 'fresh');

    const healthBadge = getEvidenceHealthBadge(evidenceStatus, sig.is_uncertain, sig.has_conflict);

    const priorityTier =
      sig.priority_tier ||
      sig.metadata?.priority_tier ||
      (sig.score && sig.score >= 90
        ? 'P0'
        : sig.score && sig.score >= 75
        ? 'P1'
        : sig.score && sig.score >= 50
        ? 'P2'
        : sig.score && sig.score >= 25
        ? 'P3'
        : 'P4');

    const effPolarity =
      sig.effective_polarity ||
      sig.metadata?.effective_polarity ||
      sig.signal?.category ||
      columnVariant;

    const priorityBadge = getPriorityBadge(priorityTier, effPolarity);
    const priorityScore =
      sig.priority_score !== undefined && sig.priority_score !== null
        ? Math.round(Number(sig.priority_score))
        : sig.score !== undefined && sig.score !== null
        ? Math.round(Number(sig.score))
        : null;

    const breakdown: PriorityBreakdown | Record<string, any> | undefined =
      sig.priority_breakdown || sig.metadata?.priority_breakdown;

    return (
      <div
        key={sig.id}
        className={`bg-white rounded-xl border ${
          isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
        } shadow-sm hover:shadow-md transition p-4 flex flex-col justify-between gap-3 ${borderAccent}`}
      >
        <div className="space-y-2 min-w-0">
          {/* Top Status & Indicator Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Selection Checkbox */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelectSignal(sig.id)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer mr-1"
              title="Select signal for bulk actions"
            />

            {/* Priority Tier & Impact Badge */}
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${priorityBadge.className}`}
              title={
                breakdown?.impact_rationale ||
                `Priority Tier: ${priorityTier} (Business Impact Score: ${priorityScore ?? 'N/A'}/100)`
              }
            >
              <span>⭐</span>
              <span>{priorityBadge.label}</span>
              {priorityScore !== null && (
                <span className="opacity-80 font-normal">({priorityScore} pts)</span>
              )}
            </span>

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
              {sig.status === 'snoozed' && sig.snoozed_until
                ? `💤 Snoozed until ${new Date(sig.snoozed_until).toLocaleDateString()}`
                : sig.status}
            </span>

            {/* Evidence Health Pill */}
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${healthBadge.className}`}
            >
              <span>{healthBadge.icon}</span>
              <span>{healthBadge.label}</span>
            </span>

            {/* Reopened Alert Indicator */}
            {sig.reopen_count !== undefined && sig.reopen_count > 0 && (
              <span
                className="text-[11px] px-2 py-0.5 rounded-full border bg-amber-100 text-amber-900 border-amber-300 font-bold flex items-center gap-1"
                title={`Signal re-alerted with new evidence (${sig.reopen_count}x). Last reopened: ${
                  sig.last_reopened_at ? new Date(sig.last_reopened_at).toLocaleDateString() : 'recently'
                }`}
              >
                <span>🔄</span>
                <span>Reopened ({sig.reopen_count}x)</span>
              </span>
            )}

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
                <span>Verification Recommended</span>
              </span>
            )}
            <span className="text-[11px] text-slate-400">
              {new Date(sig.detected_at).toLocaleDateString()}
            </span>
          </div>

          {/* Business Impact 4-Dimension Mini Breakdown Meter */}
          {breakdown && (
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-[10px] text-slate-600"
              title={breakdown.impact_rationale || 'Business Impact Breakdown'}
            >
              <span className="font-semibold text-slate-700">Impact Drivers:</span>
              <span className="flex items-center gap-0.5">
                <span className="text-slate-400">Account:</span>
                <span className="font-bold text-slate-800">{breakdown.account_importance_score ?? 0}/25</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <span className="text-slate-400">Relationship:</span>
                <span className="font-bold text-slate-800">{breakdown.relationship_context_score ?? 0}/25</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <span className="text-slate-400">Urgency:</span>
                <span className="font-bold text-slate-800">{breakdown.urgency_score ?? 0}/25</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <span className="text-slate-400">Impact:</span>
                <span className="font-bold text-slate-800">{breakdown.business_impact_score ?? 0}/25</span>
              </span>
            </div>
          )}

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

            {/* Why It Matters Callout */}
            {whyItMatters && (
              <div className="mt-1.5 p-2 bg-amber-50/70 border border-amber-200/60 rounded-lg text-[11px] text-amber-900 leading-snug">
                <span className="font-bold">⚡ Why it matters: </span>
                <span>{whyItMatters}</span>
              </div>
            )}

            {sig.resolution_notes && (
              <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1.5 italic">
                💬 <strong>Notes:</strong> {sig.resolution_notes}
              </p>
            )}
          </div>

          {/* Associated Context Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
                const pName = p.name || 'Contact';
                return (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]"
                  >
                    <span>👤</span>
                    <Link
                      href={`/persons/${p.id}`}
                      className="hover:underline font-semibold truncate max-w-[120px]"
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
              {sig.suggested_persons.map((sp, idx) =>
                sp.person_id ? (
                  <button
                    key={sp.person_id || idx}
                    onClick={() =>
                      handleLinkPerson(sig.id, sp.person_id!, sp.role || 'counterparty')
                    }
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
              )}
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

          <div className="flex items-center gap-1">
            {sig.status === 'active' && (
              <button
                onClick={() => handleAcknowledge(sig.id)}
                disabled={actionInProgress === sig.id}
                className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap"
                title="Mark as Acknowledged"
              >
                Acknowledge
              </button>
            )}

            {(sig.status === 'active' || sig.status === 'acknowledged') && (
              <button
                onClick={() => handleOpenActionModal(sig, 'actioned')}
                disabled={actionInProgress === sig.id}
                className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap"
                title="Record Action"
              >
                Take Action
              </button>
            )}

            {/* Snooze Control */}
            {sig.status !== 'dismissed' && sig.status !== 'resolved' && (
              <button
                onClick={() => handleOpenActionModal(sig, 'snoozed')}
                disabled={actionInProgress === sig.id}
                className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap"
                title="Snooze Alert"
              >
                💤 Snooze
              </button>
            )}

            {/* Resolve Control */}
            {sig.status !== 'resolved' && sig.status !== 'dismissed' && (
              <button
                onClick={() => handleOpenActionModal(sig, 'resolved')}
                disabled={actionInProgress === sig.id}
                className="px-2 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap"
                title="Resolve Signal"
              >
                Resolve
              </button>
            )}

            {/* Dismiss Control */}
            {sig.status !== 'dismissed' && (
              <button
                onClick={() => handleOpenActionModal(sig, 'dismissed')}
                disabled={actionInProgress === sig.id}
                className="px-1.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs transition cursor-pointer"
                title="Dismiss Signal"
              >
                Dismiss
              </button>
            )}

            {(sig.status === 'dismissed' || sig.status === 'resolved') && (
              <button
                onClick={() => handleOpenActionModal(sig, 'actioned')}
                disabled={actionInProgress === sig.id}
                className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
                title="Reopen or take follow-up action"
              >
                Reopen
              </button>
            )}
          </div>
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
              displacements with complete lifecycle triage.
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
                <option value={90} className="bg-slate-900 text-white">
                  3 Months (Default)
                </option>
                <option value={180} className="bg-slate-900 text-white">
                  6 Months
                </option>
                <option value={365} className="bg-slate-900 text-white">
                  1 Year
                </option>
                <option value={730} className="bg-slate-900 text-white">
                  2 Years (Max)
                </option>
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
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs uppercase ml-4 cursor-pointer"
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
              Snoozed Signals
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1">
              {stats?.total_snoozed ?? signals.filter((s) => s.status === 'snoozed').length}
            </p>
            <p className="text-xs text-purple-500 mt-1">Suppressed until review date</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-xl text-purple-600">
            💤
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
          {/* View Switcher & Bulk Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setViewMode('feed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'feed'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📋</span>
                <span>Feed View</span>
              </button>
              <button
                onClick={() => setViewMode('account_group')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'account_group'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🏢</span>
                <span>Group by Account / Organization</span>
              </button>
            </div>

            {/* Bulk Selection Bar */}
            {selectedSignalIds.length > 0 && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs">
                <span className="font-bold text-emerald-900">
                  {selectedSignalIds.length} signal(s) selected
                </span>
                <button
                  onClick={() => handleBulkAction('snoozed')}
                  className="px-2.5 py-1 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition cursor-pointer"
                >
                  💤 Bulk Snooze 14d
                </button>
                <button
                  onClick={() => handleBulkAction('resolved')}
                  className="px-2.5 py-1 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition cursor-pointer"
                >
                  Resolve Selected
                </button>
                <button
                  onClick={() => handleBulkAction('dismissed')}
                  className="px-2.5 py-1 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition cursor-pointer"
                >
                  Dismiss Selected
                </button>
                <button
                  onClick={() => setSelectedSignalIds([])}
                  className="text-slate-500 hover:text-slate-700 ml-1 cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

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
                <option value="snoozed">Status: Snoozed</option>
                <option value="resolved">Status: Resolved</option>
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
                id="priority-filter"
                aria-label="Filter by Priority Tier"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-amber-50/60 border border-amber-300/80 rounded-lg text-amber-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Priority: All Tiers</option>
                <option value="P0">P0 • Critical Emergency</option>
                <option value="P1">P1 • High Impact</option>
                <option value="P2">P2 • Medium Impact</option>
                <option value="P3">P3 • Moderate Impact</option>
                <option value="P4">P4 • Low Impact</option>
              </select>

              <select
                id="sort-by-filter"
                aria-label="Sort Signals"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-emerald-50/70 border border-emerald-300 rounded-lg text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="priority">Sort: Business Impact (Default)</option>
                <option value="newest">Sort: Newest First</option>
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
                priorityFilter !== 'all' ||
                sortBy !== 'priority' ||
                lookbackDays !== 90 ||
                searchQuery.trim().length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('active');
                    setCategoryFilter('all');
                    setSeverityFilter('all');
                    setSignalTypeFilter('all');
                    setPriorityFilter('all');
                    setSortBy('priority');
                    setSearchQuery('');
                    setLookbackDays(90);
                    loadData(90);
                  }}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-dashed border-slate-300 transition-colors cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Select All Toggle Bar */}
          {filteredSignals.length > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={
                    selectedSignalIds.length === filteredSignals.length &&
                    filteredSignals.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span>
                  Select all {filteredSignals.length} filtered signal(s)
                </span>
              </label>
              <span>Showing {filteredSignals.length} items</span>
            </div>
          )}

          {/* Feed List / Grouped List */}
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
                className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                Run Detection Sweep Now
              </button>
            </div>
          ) : viewMode === 'account_group' ? (
            /* GROUPED BY ACCOUNT VIEW */
            <div className="space-y-6">
              {groupedByAccount.map(([key, group]) => (
                <div
                  key={key}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏢</span>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          {group.companyId ? (
                            <Link
                              href={`/companies/${group.companyId}`}
                              className="hover:text-emerald-600 transition hover:underline"
                            >
                              {group.groupName}
                            </Link>
                          ) : (
                            <span>{group.groupName}</span>
                          )}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Account Clustered Signals · {group.signals.length} alert(s) detected
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {group.signals.length} Signal{group.signals.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.signals.map((sig) => {
                      const variant =
                        sig.has_conflict || sig.signal?.category === 'hybrid'
                          ? 'hybrid'
                          : sig.signal?.category === 'risk'
                          ? 'risk'
                          : 'opportunity';
                      return renderSignalCard(sig, variant);
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* 3-COLUMN TRIAGE FEED */
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
                    No opportunity signals matching filter
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
                        Dormancy, Churn & Unanswered Comms
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-200 text-rose-900 border border-rose-300">
                    {riskSignals.length}
                  </span>
                </div>

                {riskSignals.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                    No risk signals matching filter
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

      {/* TAB: SUCCESS & QUALITY METRICS */}
      {activeTab === 'metrics' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Signal Quality, MTTA Latency & Business Outcomes
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluation window: {lookbackDays} days. Comprehensive operational precision and revenue impact.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              {[
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
                      {metrics.latency.sla_breach_count} ({(metrics.latency.sla_breach_rate * 100).toFixed(1)}%)
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

              {/* Detailed Breakdown by Signal Type Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Performance Breakdown by Signal Type
                    </h3>
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
                            {row.mean_time_to_action_hours !== null &&
                            row.mean_time_to_action_hours !== undefined
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
            </div>
          )}
        </div>
      )}

      {/* TAB: CATALOG */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalog.map((def) => (
            <div
              key={def.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{def.icon || '⚡'}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getSeverityBadge(
                        def.severity
                      )}`}
                    >
                      {def.severity.toUpperCase()}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border ${getCategoryBadge(
                        def.category
                      )}`}
                    >
                      {def.category}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{def.name}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Target: {def.target_entity}</p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{def.business_interpretation}</p>
              </div>

              {def.recommended_action && def.recommended_action.title && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <p className="font-bold text-slate-700">
                    💡 Playbook: {def.recommended_action.title}
                  </p>
                  {def.recommended_action.description && (
                    <p className="text-slate-500 mt-1">{def.recommended_action.description}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action / Dismiss / Snooze / Resolve Modal */}
      {modalSignal && modalActionType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {modalActionType === 'actioned'
                  ? 'Record Taken Action'
                  : modalActionType === 'snoozed'
                  ? '💤 Snooze Signal Alert'
                  : modalActionType === 'resolved'
                  ? '✅ Resolve Signal'
                  : 'Dismiss Signal Alert'}
              </h3>
              <button
                onClick={() => {
                  setModalSignal(null);
                  setModalActionType(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Signal:{' '}
                <strong className="text-slate-800 font-semibold">{modalSignal.title}</strong>
              </p>

              {/* Snooze Options */}
              {modalActionType === 'snoozed' && (
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

              {/* Dismiss Reason */}
              {modalActionType === 'dismissed' && (
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
                  {modalActionType === 'actioned'
                    ? 'Action Notes / Commercial Next Step'
                    : modalActionType === 'resolved'
                    ? 'Resolution Notes'
                    : modalActionType === 'snoozed'
                    ? 'Optional Snooze Reason'
                    : 'Additional Context / Notes'}
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder={
                    modalActionType === 'actioned'
                      ? 'e.g., Scheduled executive check-in for next Tuesday via email...'
                      : modalActionType === 'resolved'
                      ? 'e.g., Re-engagement call completed and QBR scheduled.'
                      : modalActionType === 'snoozed'
                      ? 'e.g., Lead asked to reconnect after holiday period.'
                      : 'e.g., Contact already communicated via WhatsApp.'
                  }
                  className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
                />
              </div>
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
                    : modalActionType === 'snoozed'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : modalActionType === 'resolved'
                    ? 'bg-teal-600 hover:bg-teal-700'
                    : 'bg-slate-800 hover:bg-slate-900'
                }`}
              >
                {modalActionType === 'actioned'
                  ? 'Mark as Actioned'
                  : modalActionType === 'snoozed'
                  ? 'Confirm Snooze'
                  : modalActionType === 'resolved'
                  ? 'Confirm Resolution'
                  : 'Dismiss Signal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
