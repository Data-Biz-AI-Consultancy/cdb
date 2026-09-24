'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch, ApiResponse } from '@/lib/api';
import {
  DetectedSignal,
  DetectedSignalStatsResponse,
  SignalCatalogResponse,
  SignalDefinition,
  SignalEvaluationResult,
  SignalMetricsResponse,
  DetectedSignalStatus,
} from '../types';
import { normalizeSlug } from '../utils';

export function useSignalsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    'triage' | 'escalated' | 'conflicts' | 'uncertain' | 'metrics' | 'catalog'
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
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('priority');
  const [lookbackDays, setLookbackDays] = useState<number>(90);

  // Modal state
  const [modalSignal, setModalSignal] = useState<DetectedSignal | null>(null);
  const [modalActionType, setModalActionType] = useState<
    | 'actioned'
    | 'dismissed'
    | 'snoozed'
    | 'resolved'
    | 'false_positive'
    | 'assign'
    | 'escalate'
    | 'create_opportunity'
    | null
  >(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [dismissalReason, setDismissalReason] = useState('Not Relevant');
  const [feedbackReason, setFeedbackReason] = useState('incorrect_intent');
  const [alsoDismiss, setAlsoDismiss] = useState(true);
  const [snoozeDays, setSnoozeDays] = useState<number>(14);
  const [customSnoozeDate, setCustomSnoozeDate] = useState<string>('');

  // Ownership & Escalation Modal State
  const [assignedOwnerId, setAssignedOwnerId] = useState('');
  const [escalationLevel, setEscalationLevel] = useState('escalated');
  const [escalationReason, setEscalationReason] = useState('');

  // Deal Creation Modal State
  const [oppTitle, setOppTitle] = useState('');
  const [oppValue, setOppValue] = useState<string | number>('');
  const [oppCurrency, setOppCurrency] = useState('EUR');
  const [oppStage, setOppStage] = useState('prospect');
  const [oppProbability, setOppProbability] = useState<string | number>(50);

  // Read URL search params
  useEffect(() => {
    if (!searchParams) return;
    const sevParam = searchParams.get('severity');
    if (sevParam && ['critical', 'high', 'medium', 'low', 'all'].includes(sevParam.toLowerCase())) {
      setSeverityFilter(sevParam.toLowerCase());
    }
    const catParam = searchParams.get('category');
    if (catParam && ['opportunity', 'risk', 'hybrid', 'all'].includes(catParam.toLowerCase())) {
      setCategoryFilter(catParam.toLowerCase());
    }
    const sigTypeParam = searchParams.get('signal_type') || searchParams.get('signal_id');
    if (sigTypeParam) {
      setSignalTypeFilter(sigTypeParam);
    }
    const priorityParam = searchParams.get('priority') || searchParams.get('priority_tier');
    if (priorityParam && ['P0', 'P1', 'P2', 'P3', 'P4', 'ALL'].includes(priorityParam.toUpperCase())) {
      setPriorityFilter(priorityParam.toUpperCase());
    }
    const qualParam = searchParams.get('quality');
    if (qualParam && ['all', 'warnings_only', 'reliable_only', 'restricted_only'].includes(qualParam.toLowerCase())) {
      setQualityFilter(qualParam.toLowerCase());
    }
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatusFilter(statusParam.toLowerCase());
    }
    const tabParam = searchParams.get('tab');
    if (
      tabParam &&
      ['triage', 'escalated', 'conflicts', 'uncertain', 'metrics', 'catalog'].includes(
        tabParam.toLowerCase()
      )
    ) {
      setActiveTab(tabParam.toLowerCase() as any);
    }
    const qParam = searchParams.get('q') || searchParams.get('search');
    if (qParam) {
      setSearchQuery(qParam);
    }
  }, [searchParams]);

  // Dynamic catalog options
  const availableCatalog = useMemo(() => {
    if (categoryFilter === 'all') return catalog;
    return catalog.filter(
      (def) =>
        def.category?.toLowerCase() === categoryFilter.toLowerCase() ||
        def.category?.toLowerCase() === 'hybrid'
    );
  }, [catalog, categoryFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catalogRes, signalsRes, statsRes, metricsRes] = await Promise.all([
        apiFetch<SignalCatalogResponse>('/api/v1/signals/catalog?active_only=true').catch(() => ({
          definitions: [],
          total_definitions: 0,
          categories: { opportunity: 0, risk: 0, hybrid: 0 },
          by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
        })),
        apiFetch<ApiResponse<DetectedSignal[]>>('/api/v1/signals/detected?limit=200').catch(() => ({
          data: [],
        })),
        apiFetch<DetectedSignalStatsResponse>('/api/v1/signals/detected/stats').catch(() => null),
        apiFetch<SignalMetricsResponse>(`/api/v1/signals/metrics?lookback_days=${lookbackDays}`).catch(
          () => null
        ),
      ]);

      setCatalog((catalogRes as any).definitions || (catalogRes as any).data || []);
      setSignals(signalsRes.data || []);
      setStats(statsRes);
      setMetrics(metricsRes);
    } catch {
      // Handled by fallbacks
    } finally {
      setLoading(false);
    }
  }, [lookbackDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLookbackChange = async (days: number) => {
    setLookbackDays(days);
    try {
      const metricsRes = await apiFetch<SignalMetricsResponse>(
        `/api/v1/signals/metrics?lookback_days=${days}`
      );
      setMetrics(metricsRes);
    } catch {
      // Ignored
    }
  };

  const handleRunEvaluation = async () => {
    setEvaluating(true);
    setEvaluationBanner(null);
    try {
      const res = await apiFetch<SignalEvaluationResult>(
        `/api/v1/signals/evaluate?lookback_days=${lookbackDays}`,
        {
          method: 'POST',
        }
      );
      setEvaluationBanner(
        `Radar sweep completed: ${(res as any).new_signals_detected ?? res.signals_created ?? (res as any).created_count ?? 0} new signals detected, ${(res as any).refreshed_signals ?? res.signals_updated ?? (res as any).updated_count ?? 0} existing updated across ${(res as any).total_active_signals ?? res.total_evaluated ?? (res as any).evaluated_companies ?? 0} entities.`
      );
      await loadData();
    } catch (err: unknown) {
      setEvaluationBanner(
        `Radar sweep failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setEvaluating(false);
    }
  };

  const handleAcknowledge = async (signalId: string) => {
    setActionInProgress(signalId);
    try {
      const updated = await apiFetch<DetectedSignal>(`/api/v1/signals/detected/${signalId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'acknowledged' }),
      });
      setSignals((prev) => prev.map((s) => (s.id === signalId ? { ...s, ...updated } : s)));
      if (stats) {
        setStats({
          ...stats,
          by_status: {
            ...stats.by_status,
            active: Math.max(0, stats.by_status.active - 1),
            acknowledged: (stats.by_status.acknowledged || 0) + 1,
          },
        });
      }
    } catch (err: unknown) {
      alert(`Failed to acknowledge signal: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleLinkPerson = async (signalId: string, personId: string, role?: string) => {
    setActionInProgress(signalId);
    try {
      const updated = await apiFetch<DetectedSignal>(`/api/v1/signals/detected/${signalId}/persons`, {
        method: 'POST',
        body: JSON.stringify({ person_id: personId, role: role || 'stakeholder' }),
      });
      setSignals((prev) => prev.map((s) => (s.id === signalId ? { ...s, ...updated } : s)));
    } catch (err: unknown) {
      alert(`Failed to link person to signal: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUnlinkPerson = async (signalId: string, personId: string) => {
    setActionInProgress(signalId);
    try {
      const updated = await apiFetch<DetectedSignal>(
        `/api/v1/signals/detected/${signalId}/persons/${personId}`,
        { method: 'DELETE' }
      );
      setSignals((prev) => prev.map((s) => (s.id === signalId ? { ...s, ...updated } : s)));
    } catch (err: unknown) {
      alert(`Failed to unlink person from signal: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleOpenActionModal = (
    sig: DetectedSignal,
    type:
      | 'actioned'
      | 'dismissed'
      | 'snoozed'
      | 'resolved'
      | 'false_positive'
      | 'assign'
      | 'escalate'
      | 'create_opportunity'
  ) => {
    setModalSignal(sig);
    setModalActionType(type);
    setResolutionNotes(sig.resolution_notes || '');
    setDismissalReason(sig.dismissal_reason || 'Not Relevant');
    setFeedbackReason('incorrect_intent');
    setAlsoDismiss(true);
    setSnoozeDays(14);
    setCustomSnoozeDate('');
    setAssignedOwnerId(sig.owner_id || '');
    setEscalationLevel(sig.escalation_level && sig.escalation_level !== 'none' ? sig.escalation_level : 'escalated');
    setEscalationReason(sig.escalation_reason || '');
    setOppTitle(sig.title ? `Deal: ${sig.title}` : `Deal from ${sig.company_name || 'Signal'}`);
    setOppValue(sig.metadata?.commercial_value || sig.metadata?.arr_impact || 50000);
    setOppCurrency('EUR');
    setOppStage('prospect');
    setOppProbability(50);
  };

  const handleCloseActionModal = () => {
    setModalSignal(null);
    setModalActionType(null);
  };

  const handleSaveModalAction = async () => {
    if (!modalSignal || !modalActionType) return;
    const signalId = modalSignal.id;
    setActionInProgress(signalId);

    try {
      if (modalActionType === 'false_positive') {
        await apiFetch('/api/v1/signals/feedback', {
          method: 'POST',
          body: JSON.stringify({
            signal_id: signalId,
            reason: feedbackReason,
            notes: resolutionNotes || undefined,
            dismiss_signal: alsoDismiss,
          }),
        });

        if (alsoDismiss) {
          setSignals((prev) =>
            prev.map((s) =>
              s.id === signalId
                ? {
                    ...s,
                    status: 'dismissed',
                    dismissal_reason: `False Positive: ${feedbackReason}`,
                    actioned_at: new Date().toISOString(),
                  }
                : s
            )
          );
        }
      } else if (modalActionType === 'assign') {
        const updated = await apiFetch<DetectedSignal>(`/api/v1/signals/detected/${signalId}/assign`, {
          method: 'POST',
          body: JSON.stringify({
            owner_id: assignedOwnerId ? assignedOwnerId : null,
          }),
        });
        setSignals((prev) => prev.map((s) => (s.id === signalId ? { ...s, ...updated } : s)));
      } else if (modalActionType === 'escalate') {
        const updated = await apiFetch<DetectedSignal>(`/api/v1/signals/detected/${signalId}/escalate`, {
          method: 'POST',
          body: JSON.stringify({
            escalation_level: escalationLevel,
            reason: escalationReason || undefined,
          }),
        });
        setSignals((prev) => prev.map((s) => (s.id === signalId ? { ...s, ...updated } : s)));
      } else if (modalActionType === 'create_opportunity') {
        const updated = await apiFetch<DetectedSignal>(
          `/api/v1/signals/detected/${signalId}/create-opportunity`,
          {
            method: 'POST',
            body: JSON.stringify({
              title: oppTitle,
              estimated_value: oppValue ? Number(oppValue) : undefined,
              currency: oppCurrency,
              stage: oppStage,
              probability: oppProbability ? Number(oppProbability) : undefined,
              notes: resolutionNotes || undefined,
            }),
          }
        );
        setSignals((prev) => prev.map((s) => (s.id === signalId ? { ...s, ...updated } : s)));
      } else {
        const payload: Record<string, any> = {
          status: modalActionType,
        };

        if (modalActionType === 'actioned' || modalActionType === 'resolved') {
          payload.resolution_notes = resolutionNotes;
        } else if (modalActionType === 'dismissed') {
          payload.dismissal_reason = dismissalReason;
          if (resolutionNotes) payload.resolution_notes = resolutionNotes;
        } else if (modalActionType === 'snoozed') {
          if (customSnoozeDate) {
            payload.snoozed_until = new Date(customSnoozeDate).toISOString();
          } else {
            const date = new Date();
            date.setDate(date.getDate() + snoozeDays);
            payload.snoozed_until = date.toISOString();
          }
          if (resolutionNotes) payload.resolution_notes = resolutionNotes;
        }

        const updated = await apiFetch<DetectedSignal>(`/api/v1/signals/detected/${signalId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        setSignals((prev) => prev.map((s) => (s.id === signalId ? { ...s, ...updated } : s)));
      }

      handleCloseActionModal();
    } catch (err: unknown) {
      alert(`Action failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleBulkAction = async (
    action: 'snoozed' | 'resolved' | 'dismissed' | 'acknowledged' | 'acknowledge' | 'resolve' | 'dismiss'
  ) => {
    if (selectedSignalIds.length === 0) return;
    let targetStatus: DetectedSignalStatus = 'acknowledged';
    let snoozeUntil: string | undefined = undefined;
    if (action === 'snoozed') {
      targetStatus = 'snoozed';
      const d = new Date();
      d.setDate(d.getDate() + 14);
      snoozeUntil = d.toISOString();
    } else if (action === 'resolve' || action === 'resolved') {
      targetStatus = 'resolved';
    } else if (action === 'dismiss' || action === 'dismissed') {
      targetStatus = 'dismissed';
    } else if (action === 'acknowledge' || action === 'acknowledged') {
      targetStatus = 'acknowledged';
    }

    setActionInProgress('bulk');
    try {
      await apiFetch('/api/v1/signals/detected/bulk-status', {
        method: 'POST',
        body: JSON.stringify({
          signal_ids: selectedSignalIds,
          status: targetStatus,
          snoozed_until: snoozeUntil,
          resolution_notes:
            targetStatus === 'dismissed'
              ? 'Bulk dismissed via Signals Radar.'
              : targetStatus === 'resolved'
              ? 'Bulk resolved via Signals Radar.'
              : targetStatus === 'snoozed'
              ? 'Bulk snoozed for 14 days.'
              : undefined,
          dismissal_reason: targetStatus === 'dismissed' ? 'Bulk Dismissed' : undefined,
        }),
      });

      setSignals((prev) =>
        prev.map((s) =>
          selectedSignalIds.includes(s.id)
            ? {
                ...s,
                status: targetStatus,
                snoozed_until: snoozeUntil || s.snoozed_until,
                dismissal_reason: targetStatus === 'dismissed' ? 'Bulk Dismissed' : s.dismissal_reason,
              }
            : s
        )
      );
      setSelectedSignalIds([]);
    } catch (err: unknown) {
      alert(`Bulk action failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const toggleSelectSignal = (signalId: string) => {
    setSelectedSignalIds((prev) =>
      prev.includes(signalId) ? prev.filter((id) => id !== signalId) : [...prev, signalId]
    );
  };

  const handleSelectAllInView = (signalsToSelect: DetectedSignal[]) => {
    const ids = signalsToSelect.map((s) => s.id);
    const allSelected = ids.every((id) => selectedSignalIds.includes(id));
    if (allSelected) {
      setSelectedSignalIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedSignalIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('active');
    setCategoryFilter('all');
    setSeverityFilter('all');
    setSignalTypeFilter('all');
    setPriorityFilter('all');
    setQualityFilter('all');
    setOwnerFilter('all');
    setSortBy('priority');
  };

  const handleDrilldownSignal = (signalType: string) => {
    setActiveTab('triage');
    setSignalTypeFilter(signalType);
  };

  const handleDrilldownSeverity = (severity: string) => {
    setActiveTab('triage');
    setSeverityFilter(severity);
  };

  // Filtered & Sorted Signals
  const filteredSignals = useMemo(() => {
    return signals
      .filter((s) => {
        // Tab Filters
        if (activeTab === 'escalated') {
          if (!s.is_escalated) return false;
        } else if (activeTab === 'conflicts') {
          if (!s.has_conflict && !s.metadata?.has_polarity_conflict && !s.metadata?.conflict_risk) return false;
        } else if (activeTab === 'uncertain') {
          const score = s.confidence_score ?? s.score ?? 0.8;
          if (score >= 0.5) return false;
        } else if (activeTab === 'triage') {
          if (statusFilter !== 'all' && s.status !== statusFilter) return false;
        }

        // Quality Filter
        if (qualityFilter === 'warnings_only') {
          if (!s.metadata?.data_quality_warnings || s.metadata.data_quality_warnings.length === 0)
            return false;
        } else if (qualityFilter === 'reliable_only') {
          if (s.metadata?.data_quality_warnings && s.metadata.data_quality_warnings.length > 0)
            return false;
        } else if (qualityFilter === 'restricted_only') {
          if (!s.metadata?.data_quality_warnings?.some((w: string) => w.includes('RESTRICTED_SOURCE')))
            return false;
        }

        // Priority Filter
        if (priorityFilter !== 'all') {
          const tier =
            s.metadata?.priority_tier ||
            (s.severity === 'critical'
              ? 'P0'
              : s.severity === 'high'
              ? 'P1'
              : s.severity === 'medium'
              ? 'P2'
              : 'P3');
          if (tier.toUpperCase() !== priorityFilter.toUpperCase()) return false;
        }

        // Category Filter
        if (categoryFilter !== 'all') {
          const cat = s.category || s.signal?.category || s.metadata?.category || 'opportunity';
          if (cat.toLowerCase() !== categoryFilter.toLowerCase()) return false;
        }

        // Severity Filter
        if (severityFilter !== 'all' && s.severity !== severityFilter) return false;

        // Signal Type Filter
        if (signalTypeFilter !== 'all') {
          const sigType = s.signal_id || s.signal_type || '';
          if (normalizeSlug(sigType) !== normalizeSlug(signalTypeFilter)) return false;
        }

        // Owner Filter
        if (ownerFilter === 'unassigned') {
          if (s.owner_id) return false;
        } else if (ownerFilter === 'assigned') {
          if (!s.owner_id) return false;
        } else if (ownerFilter !== 'all') {
          if (s.owner_id !== ownerFilter) return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = s.title?.toLowerCase().includes(q);
          const matchCompany = s.company_name?.toLowerCase().includes(q);
          const matchPerson = s.person_name?.toLowerCase().includes(q);
          const matchSummary = s.summary?.toLowerCase().includes(q);
          const matchConnectedPerson = s.connected_persons?.some(
            (cp) => cp.name?.toLowerCase().includes(q) || cp.role?.toLowerCase().includes(q)
          );
          const matchEvidence = s.evidence_payload
            ? JSON.stringify(s.evidence_payload).toLowerCase().includes(q)
            : s.evidence
            ? JSON.stringify(s.evidence).toLowerCase().includes(q)
            : false;
          if (
            !matchTitle &&
            !matchCompany &&
            !matchPerson &&
            !matchSummary &&
            !matchEvidence &&
            !matchConnectedPerson
          )
            return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          const pScoreA = a.metadata?.priority_score ?? (a.severity === 'critical' ? 95 : a.severity === 'high' ? 80 : 50);
          const pScoreB = b.metadata?.priority_score ?? (b.severity === 'critical' ? 95 : b.severity === 'high' ? 80 : 50);
          if (pScoreA !== pScoreB) return pScoreB - pScoreA;
          return new Date(b.detected_at || b.created_at).getTime() - new Date(a.detected_at || a.created_at).getTime();
        } else if (sortBy === 'severity') {
          const rank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
          return (rank[b.severity] || 0) - (rank[a.severity] || 0);
        } else if (sortBy === 'confidence_desc') {
          const scoreA = a.confidence_score ?? a.score ?? 0.8;
          const scoreB = b.confidence_score ?? b.score ?? 0.8;
          return scoreB - scoreA;
        } else if (sortBy === 'confidence_asc') {
          const scoreA = a.confidence_score ?? a.score ?? 0.8;
          const scoreB = b.confidence_score ?? b.score ?? 0.8;
          return scoreA - scoreB;
        } else if (sortBy === 'oldest') {
          return new Date(a.detected_at || a.created_at).getTime() - new Date(b.detected_at || b.created_at).getTime();
        }
        // Default: Newest first
        return new Date(b.detected_at || b.created_at).getTime() - new Date(a.detected_at || a.created_at).getTime();
      });
  }, [
    signals,
    activeTab,
    statusFilter,
    qualityFilter,
    priorityFilter,
    categoryFilter,
    severityFilter,
    signalTypeFilter,
    ownerFilter,
    searchQuery,
    sortBy,
  ]);

  const feedHybrids = useMemo(
    () =>
      filteredSignals.filter(
        (s) =>
          s.has_conflict ||
          s.metadata?.has_polarity_conflict ||
          s.metadata?.conflict_risk ||
          (s.category || s.signal?.category || s.metadata?.category) === 'hybrid'
      ),
    [filteredSignals]
  );
  const feedOpportunities = useMemo(
    () =>
      filteredSignals.filter(
        (s) =>
          !s.has_conflict &&
          !s.metadata?.has_polarity_conflict &&
          !s.metadata?.conflict_risk &&
          (s.category || s.signal?.category || s.metadata?.category) === 'opportunity'
      ),
    [filteredSignals]
  );
  const feedRisks = useMemo(
    () =>
      filteredSignals.filter(
        (s) =>
          !s.has_conflict &&
          !s.metadata?.has_polarity_conflict &&
          !s.metadata?.conflict_risk &&
          (s.category || s.signal?.category || s.metadata?.category) === 'risk'
      ),
    [filteredSignals]
  );
  const feedConflicts = useMemo(
    () => filteredSignals.filter((s) => s.has_conflict || s.metadata?.has_polarity_conflict || s.metadata?.conflict_risk),
    [filteredSignals]
  );
  const feedUncertain = useMemo(
    () => filteredSignals.filter((s) => (s.confidence_score ?? s.score ?? 0.8) < 0.5),
    [filteredSignals]
  );
  const feedEscalated = useMemo(
    () => filteredSignals.filter((s) => s.is_escalated),
    [filteredSignals]
  );

  // Group by Account
  const accountGroupMap = useMemo(() => {
    const map = new Map<string, { company_name: string; signals: DetectedSignal[] }>();
    for (const sig of filteredSignals) {
      const key = sig.company_id || 'unassigned_account';
      const name = sig.company_name || 'Individual / Unlinked Account';
      if (!map.has(key)) {
        map.set(key, { company_name: name, signals: [] });
      }
      map.get(key)!.signals.push(sig);
    }
    return map;
  }, [filteredSignals]);

  const groupedByAccount = useMemo(() => {
    return Array.from(accountGroupMap.entries()).map(([key, data]) => [
      key,
      {
        companyId: key === 'unassigned_account' ? null : key,
        groupName: data.company_name,
        signals: data.signals,
      },
    ]) as [string, { companyId: string | null; groupName: string; signals: DetectedSignal[] }][];
  }, [accountGroupMap]);

  return {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    catalog,
    availableCatalog,
    signals,
    stats,
    metrics,
    loading,
    evaluating,
    evaluationBanner,
    setEvaluationBanner,
    actionInProgress,
    selectedSignalIds,
    setSelectedSignalIds,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    severityFilter,
    setSeverityFilter,
    signalTypeFilter,
    setSignalTypeFilter,
    priorityFilter,
    setPriorityFilter,
    qualityFilter,
    setQualityFilter,
    ownerFilter,
    setOwnerFilter,
    sortBy,
    setSortBy,
    lookbackDays,
    modalSignal,
    modalActionType,
    resolutionNotes,
    setResolutionNotes,
    dismissalReason,
    setDismissalReason,
    feedbackReason,
    setFeedbackReason,
    alsoDismiss,
    setAlsoDismiss,
    snoozeDays,
    setSnoozeDays,
    customSnoozeDate,
    setCustomSnoozeDate,
    assignedOwnerId,
    setAssignedOwnerId,
    escalationLevel,
    setEscalationLevel,
    escalationReason,
    setEscalationReason,
    oppTitle,
    setOppTitle,
    oppValue,
    setOppValue,
    oppCurrency,
    setOppCurrency,
    oppStage,
    setOppStage,
    oppProbability,
    setOppProbability,
    filteredSignals,
    feedOpportunities,
    feedRisks,
    feedHybrids,
    feedConflicts,
    feedUncertain,
    feedEscalated,
    accountGroupMap,
    groupedByAccount,
    loadData,
    handleLookbackChange,
    handleRunEvaluation,
    handleAcknowledge,
    handleLinkPerson,
    handleUnlinkPerson,
    handleOpenActionModal,
    handleCloseActionModal,
    handleSaveModalAction,
    handleBulkAction,
    toggleSelectSignal,
    handleSelectAllInView,
    handleResetFilters,
    handleDrilldownSignal,
    handleDrilldownSeverity,
  };
}
