'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch, ApiResponse } from '@/lib/api';
import { Opportunity, OpportunityDetectedSignal } from '../types';

export interface CompanySignalSummary {
  totalActive: number;
  risksCount: number;
  oppsCount: number;
  highestPriorityTier?: string;
  signals: OpportunityDetectedSignal[];
}

export function useOpportunities() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [signalFilter, setSignalFilter] = useState<'all' | 'has_signals' | 'has_risks' | 'has_opps'>('all');

  // Drag and Drop state
  const [draggedOppId, setDraggedOppId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Signal summary indexed by company_id, opp_id, and person_id
  const [signalSummaryMap, setSignalSummaryMap] = useState<Record<string, CompanySignalSummary>>({});

  const loadOpps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ApiResponse<Opportunity[]>>('/api/v1/opportunities?page_size=200');
      const loadedOpps = res.data || [];
      setOpps(loadedOpps);

      // Fetch active signals in batch to decorate cards
      try {
        const sigRes = await apiFetch<ApiResponse<OpportunityDetectedSignal[]>>(
          '/api/v1/signals/detected?status=active&page_size=200&sort_by=priority'
        );
        const activeSignals = sigRes.data || [];
        const summary: Record<string, CompanySignalSummary> = {};

        for (const sig of activeSignals) {
          const keys: string[] = [];
          if (sig.company_id) keys.push(`company:${sig.company_id}`);
          if (sig.person_id) keys.push(`person:${sig.person_id}`);
          if (sig.opportunity_id) keys.push(`opp:${sig.opportunity_id}`);
          if (sig.routed_opportunity_id) keys.push(`opp:${sig.routed_opportunity_id}`);

          for (const key of keys) {
            if (!summary[key]) {
              summary[key] = {
                totalActive: 0,
                risksCount: 0,
                oppsCount: 0,
                signals: [],
              };
            }
            summary[key].totalActive += 1;
            summary[key].signals.push(sig);

            const isRisk =
              sig.effective_polarity === 'risk' ||
              sig.signal?.category === 'risk' ||
              sig.signal_id?.includes('dormant') ||
              sig.signal_id?.includes('unanswered') ||
              sig.signal_id?.includes('competitor');
            if (isRisk) {
              summary[key].risksCount += 1;
            } else {
              summary[key].oppsCount += 1;
            }

            if (
              !summary[key].highestPriorityTier ||
              sig.priority_tier === 'P0' ||
              (sig.priority_tier === 'P1' && summary[key].highestPriorityTier !== 'P0')
            ) {
              summary[key].highestPriorityTier = sig.priority_tier || 'P2';
            }
          }
        }
        setSignalSummaryMap(summary);
      } catch {
        // Non-blocking signal summary fetch
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOpps();
  }, [loadOpps]);

  const getOppSignalSummary = useCallback(
    (opp: Opportunity): CompanySignalSummary | undefined => {
      const allSignalsMap: Record<string, OpportunityDetectedSignal> = {};
      const keys = [`opp:${opp.id}`];
      if (opp.companies) {
        for (const c of opp.companies) {
          if (c.company_id) keys.push(`company:${c.company_id}`);
        }
      }
      if (opp.persons) {
        for (const p of opp.persons) {
          if (p.person_id) keys.push(`person:${p.person_id}`);
        }
      }

      for (const key of keys) {
        const item = signalSummaryMap[key];
        if (item && item.signals) {
          for (const s of item.signals) {
            allSignalsMap[s.id] = s;
          }
        }
      }

      const mergedSignals = Object.values(allSignalsMap);
      if (mergedSignals.length === 0) return undefined;

      let risksCount = 0;
      let oppsCount = 0;
      let highestPriorityTier = 'P4';
      const tierOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };

      for (const sig of mergedSignals) {
        const isRisk =
          sig.effective_polarity === 'risk' ||
          sig.signal?.category === 'risk' ||
          sig.signal_id?.includes('dormant') ||
          sig.signal_id?.includes('unanswered') ||
          sig.signal_id?.includes('competitor');
        if (isRisk) {
          risksCount += 1;
        } else {
          oppsCount += 1;
        }

        const currentTier = sig.priority_tier || 'P2';
        if (
          tierOrder[currentTier] !== undefined &&
          tierOrder[currentTier] < (tierOrder[highestPriorityTier] ?? 99)
        ) {
          highestPriorityTier = currentTier;
        }
      }

      return {
        totalActive: mergedSignals.length,
        risksCount,
        oppsCount,
        highestPriorityTier,
        signals: mergedSignals,
      };
    },
    [signalSummaryMap]
  );

  const filteredOpps = useMemo(() => {
    return opps.filter((opp) => {
      // Stage filter
      if (stageFilter !== 'all' && opp.stage !== stageFilter) {
        return false;
      }

      // Signal filter
      if (signalFilter !== 'all') {
        const summary = getOppSignalSummary(opp);
        if (signalFilter === 'has_signals' && (!summary || summary.totalActive === 0)) {
          return false;
        }
        if (signalFilter === 'has_risks' && (!summary || summary.risksCount === 0)) {
          return false;
        }
        if (signalFilter === 'has_opps' && (!summary || summary.oppsCount === 0)) {
          return false;
        }
      }

      // Search Query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTitle = opp.title.toLowerCase().includes(q);
      const matchDesc = opp.description?.toLowerCase().includes(q);
      const matchCompany = opp.companies?.some((c) => c.company_name?.toLowerCase().includes(q));
      const matchPerson = opp.persons?.some(
        (p) => p.person_name?.toLowerCase().includes(q) || p.person_email?.toLowerCase().includes(q)
      );
      return matchTitle || matchDesc || matchCompany || matchPerson;
    });
  }, [opps, stageFilter, signalFilter, searchQuery, getOppSignalSummary]);

  const handleStageChange = async (oppId: string, newStage: string) => {
    try {
      const res = await apiFetch<Opportunity>(`/api/v1/opportunities/${oppId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      setOpps((prev) => prev.map((o) => (o.id === oppId ? { ...o, stage: res.stage || newStage } : o)));
    } catch (err: any) {
      alert(err.message || 'Failed to update stage');
    }
  };

  const handleAdvanceStage = async (oppId: string) => {
    try {
      const res = await apiFetch<Opportunity>(`/api/v1/opportunities/${oppId}/advance`, {
        method: 'POST',
      });
      setOpps((prev) => prev.map((o) => (o.id === oppId ? { ...o, stage: res.stage } : o)));
    } catch (err: any) {
      alert(err.message || 'Failed to advance stage');
    }
  };

  const handleConfirmClose = async (oppId: string, outcome: 'closed_won' | 'closed_lost', notes: string) => {
    try {
      const res = await apiFetch<Opportunity>(`/api/v1/opportunities/${oppId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, close_notes: notes }),
      });
      setOpps((prev) => prev.map((o) => (o.id === oppId ? { ...o, stage: res.stage } : o)));
      return true;
    } catch (err: any) {
      alert(err.message || 'Failed to close opportunity');
      return false;
    }
  };

  const handleDeleteOpp = async (oppId: string) => {
    if (!confirm('Are you sure you want to delete this opportunity?')) return false;
    try {
      await apiFetch(`/api/v1/opportunities/${oppId}`, {
        method: 'DELETE',
      });
      setOpps((prev) => prev.filter((o) => o.id !== oppId));
      return true;
    } catch (err: any) {
      alert(err.message || 'Failed to delete opportunity');
      return false;
    }
  };

  return {
    opps,
    filteredOpps,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    stageFilter,
    setStageFilter,
    signalFilter,
    setSignalFilter,
    draggedOppId,
    setDraggedOppId,
    dragOverStage,
    setDragOverStage,
    handleStageChange,
    handleAdvanceStage,
    handleConfirmClose,
    handleDeleteOpp,
    getOppSignalSummary,
    refreshOpps: loadOpps,
  };
}
