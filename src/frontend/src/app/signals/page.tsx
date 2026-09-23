'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
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
} from './types';
import { normalizeSlug } from './utils';
import { SignalStatsOverview } from './components/SignalStatsOverview';
import { SignalTriageFeed } from './components/SignalTriageFeed';
import { SignalCard } from './components/SignalCard';
import { SignalCatalogTab } from './components/SignalCatalogTab';
import { SignalMetricsTab } from './components/SignalMetricsTab';
import { SignalActionModal } from './components/SignalActionModal';

// Subcomponents, types, and utils are imported from their respective modules


function SignalsPageContent() {
  const searchParams = useSearchParams();
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

  // Modal state for Action / Dismiss / Snooze / Resolve
  const [modalSignal, setModalSignal] = useState<DetectedSignal | null>(null);
  const [modalActionType, setModalActionType] = useState<
    'actioned' | 'dismissed' | 'snoozed' | 'resolved' | null
  >(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [dismissalReason, setDismissalReason] = useState('Not Relevant');
  const [snoozeDays, setSnoozeDays] = useState<number>(14);
  const [customSnoozeDate, setCustomSnoozeDate] = useState<string>('');

  // Read URL search params on mount or param changes
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
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatusFilter(statusParam.toLowerCase());
    }
    const tabParam = searchParams.get('tab');
    if (tabParam && ['triage', 'conflicts', 'uncertain', 'metrics', 'catalog'].includes(tabParam.toLowerCase())) {
      setActiveTab(tabParam.toLowerCase() as any);
    }
    const qParam = searchParams.get('q') || searchParams.get('search');
    if (qParam) {
      setSearchQuery(qParam);
    }
  }, [searchParams]);

  // Dynamic catalog options based on active category filter
  const availableCatalog = useMemo(() => {
    if (categoryFilter === 'all') return catalog;
    return catalog.filter(
      (def) =>
        def.category?.toLowerCase() === categoryFilter.toLowerCase() ||
        def.category?.toLowerCase() === 'hybrid'
    );
  }, [catalog, categoryFilter]);

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

  const handleDrilldownSignal = (
    signalKey: string,
    category?: string | null,
    severity?: string | null
  ) => {
    setActiveTab('triage');
    setSignalTypeFilter(signalKey);
    if (category) setCategoryFilter(category);
    if (severity) setSeverityFilter(severity);
  };

  const handleDrilldownSeverity = (severityKey: string) => {
    setActiveTab('triage');
    setSeverityFilter(severityKey);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('active');
    setCategoryFilter('all');
    setSeverityFilter('all');
    setSignalTypeFilter('all');
    setPriorityFilter('all');
    setSortBy('priority');
  };

  const renderCard = (sig: DetectedSignal, columnVariant: 'opportunity' | 'risk' | 'hybrid') => (
    <SignalCard
      key={sig.id}
      sig={sig}
      columnVariant={columnVariant}
      isSelected={selectedSignalIds.includes(sig.id)}
      actionInProgress={actionInProgress}
      onToggleSelect={toggleSelectSignal}
      onAcknowledge={handleAcknowledge}
      onOpenActionModal={handleOpenActionModal}
      onLinkPerson={handleLinkPerson}
      onUnlinkPerson={handleUnlinkPerson}
    />
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header & Stats Overview */}
      <SignalStatsOverview
        stats={stats}
        signals={signals}
        metrics={metrics}
        catalog={catalog}
        evaluating={evaluating}
        evaluationBanner={evaluationBanner}
        activeTab={activeTab}
        severityFilter={severityFilter}
        onRunEvaluation={handleRunEvaluation}
        onDismissBanner={() => setEvaluationBanner(null)}
        onSetSeverityFilter={setSeverityFilter}
        onSelectTab={setActiveTab}
      />

      {/* Main Tab Content */}
      {activeTab === 'catalog' ? (
        <SignalCatalogTab catalog={availableCatalog} />
      ) : activeTab === 'metrics' ? (
        <SignalMetricsTab
          metrics={metrics}
          lookbackDays={lookbackDays}
          onLookbackChange={handleLookbackChange}
          onDrilldownSignal={handleDrilldownSignal}
          onDrilldownSeverity={handleDrilldownSeverity}
        />
      ) : (
        <SignalTriageFeed
          loading={loading}
          viewMode={viewMode}
          setViewMode={setViewMode}
          selectedSignalIds={selectedSignalIds}
          setSelectedSignalIds={setSelectedSignalIds}
          onBulkAction={handleBulkAction}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
          signalTypeFilter={signalTypeFilter}
          setSignalTypeFilter={setSignalTypeFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          lookbackDays={lookbackDays}
          onLookbackChange={handleLookbackChange}
          onResetFilters={handleResetFilters}
          catalog={catalog}
          availableCatalog={availableCatalog}
          filteredSignals={filteredSignals}
          opportunitySignals={opportunitySignals}
          hybridSignals={hybridSignals}
          riskSignals={riskSignals}
          groupedByAccount={groupedByAccount}
          onToggleSelectAll={toggleSelectAll}
          onRunEvaluation={handleRunEvaluation}
          renderCard={renderCard}
        />
      )}

      {/* Action / Resolve / Snooze / Dismiss Modal */}
      <SignalActionModal
        modalSignal={modalSignal}
        modalActionType={modalActionType}
        actionInProgress={actionInProgress}
        resolutionNotes={resolutionNotes}
        dismissalReason={dismissalReason}
        snoozeDays={snoozeDays}
        customSnoozeDate={customSnoozeDate}
        onClose={() => {
          setModalSignal(null);
          setModalActionType(null);
        }}
        onSave={handleSaveModalAction}
        setResolutionNotes={setResolutionNotes}
        setDismissalReason={setDismissalReason}
        setSnoozeDays={setSnoozeDays}
        setCustomSnoozeDate={setCustomSnoozeDate}
      />
    </div>
  );
}

export default function SignalsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto space-y-4 animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl" />
            ))}
          </div>
          <div className="h-96 bg-slate-200 rounded-xl" />
        </div>
      }
    >
      <SignalsPageContent />
    </Suspense>
  );
}
