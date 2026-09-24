'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DetectedSignal, SignalDefinition } from '../types';
import { normalizeSlug } from '../utils';

export function useSignalsFilter(catalog: SignalDefinition[], signals: DetectedSignal[]) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    'triage' | 'escalated' | 'conflicts' | 'uncertain' | 'metrics' | 'catalog'
  >('triage');
  const [viewMode, setViewMode] = useState<'feed' | 'account_group'>('feed');
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
    availableCatalog,
    filteredSignals,
    feedOpportunities,
    feedRisks,
    feedHybrids,
    feedConflicts,
    feedUncertain,
    feedEscalated,
    accountGroupMap,
    groupedByAccount,
    handleResetFilters,
    handleDrilldownSignal,
    handleDrilldownSeverity,
    toggleSelectSignal,
    handleSelectAllInView,
  };
}
