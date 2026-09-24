'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiResponse } from '@/lib/api';
import { Opportunity, OpportunityDetectedSignal } from '../types';

export function useOpportunitySignals(activeOpportunity: Opportunity | null) {
  const [signals, setSignals] = useState<OpportunityDetectedSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signalSubFilter, setSignalSubFilter] = useState<'all' | 'active' | 'risk' | 'opportunity'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadSignalsForOpportunity = useCallback(async (opp: Opportunity) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Collect query params: check for opportunity_id and attached company_ids
      const params = new URLSearchParams({
        page_size: '100',
        sort_by: 'priority',
      });

      const companyId = opp.companies && opp.companies.length > 0 ? opp.companies[0].company_id : null;
      if (opp.id) {
        params.append('opportunity_id', opp.id);
      }
      if (companyId) {
        params.append('company_id', companyId);
      }

      const res = await apiFetch<ApiResponse<OpportunityDetectedSignal[]>>(`/api/v1/signals/detected?${params.toString()}`);
      
      let fetchedSignals = res.data || [];

      // If no signals returned specifically by opportunity_id & company_id combined or if company has signals not explicitly tagged with opp_id
      if (companyId && fetchedSignals.length === 0) {
        const compRes = await apiFetch<ApiResponse<OpportunityDetectedSignal[]>>(`/api/v1/signals/detected?company_id=${companyId}&page_size=50&sort_by=priority`);
        fetchedSignals = compRes.data || [];
      }

      setSignals(fetchedSignals);
    } catch (err: any) {
      setError(err.message || 'Failed to load signals for this opportunity');
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeOpportunity) {
      loadSignalsForOpportunity(activeOpportunity);
    } else {
      setSignals([]);
    }
  }, [activeOpportunity, loadSignalsForOpportunity]);

  const updateSignalStatus = async (
    signalId: string,
    newStatus: 'active' | 'acknowledged' | 'actioned' | 'snoozed' | 'dismissed' | 'resolved',
    resolutionNotes?: string
  ) => {
    setActionLoadingId(signalId);
    try {
      await apiFetch(`/api/v1/signals/detected/${signalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          resolution_notes: resolutionNotes || `Updated status to ${newStatus} from Opportunity workflow`,
        }),
      });

      // Update local state
      setSignals((prev) =>
        prev.map((s) => (s.id === signalId ? { ...s, status: newStatus } : s))
      );
    } catch (err: any) {
      console.error('Failed to update signal status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredSignals = signals.filter((sig) => {
    if (signalSubFilter === 'active') return sig.status === 'active';
    if (signalSubFilter === 'risk') {
      return (
        sig.effective_polarity === 'risk' ||
        sig.signal?.category === 'risk' ||
        sig.signal_id?.includes('dormant') ||
        sig.signal_id?.includes('unanswered') ||
        sig.signal_id?.includes('competitor')
      );
    }
    if (signalSubFilter === 'opportunity') {
      return (
        sig.effective_polarity === 'opportunity' ||
        sig.signal?.category === 'opportunity' ||
        sig.signal_id?.includes('hiring') ||
        sig.signal_id?.includes('funding') ||
        sig.signal_id?.includes('expansion')
      );
    }
    return true;
  });

  const activeSignals = signals.filter((s) => s.status === 'active');
  const riskSignals = signals.filter(
    (s) =>
      s.effective_polarity === 'risk' ||
      s.signal?.category === 'risk' ||
      s.signal_id?.includes('dormant') ||
      s.signal_id?.includes('unanswered') ||
      s.signal_id?.includes('competitor')
  );
  const oppSignals = signals.filter(
    (s) =>
      s.effective_polarity === 'opportunity' ||
      s.signal?.category === 'opportunity' ||
      s.signal_id?.includes('hiring') ||
      s.signal_id?.includes('funding') ||
      s.signal_id?.includes('expansion')
  );

  return {
    signals,
    filteredSignals,
    activeSignals,
    riskSignals,
    oppSignals,
    loading,
    error,
    signalSubFilter,
    setSignalSubFilter,
    actionLoadingId,
    updateSignalStatus,
    refreshSignals: () => activeOpportunity && loadSignalsForOpportunity(activeOpportunity),
  };
}
