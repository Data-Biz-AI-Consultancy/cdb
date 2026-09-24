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
      const companyIds = (opp.companies || []).map((c) => c.company_id).filter(Boolean);
      const personIds = (opp.persons || []).map((p) => p.person_id).filter(Boolean);

      const fetchPromises: Promise<ApiResponse<OpportunityDetectedSignal[]>>[] = [];

      // 1. Fetch by opportunity_id
      if (opp.id) {
        fetchPromises.push(
          apiFetch<ApiResponse<OpportunityDetectedSignal[]>>(
            `/api/v1/signals/detected?opportunity_id=${opp.id}&page_size=100&sort_by=priority`
          )
        );
      }

      // 2. Fetch by all attached companies
      for (const cId of companyIds) {
        fetchPromises.push(
          apiFetch<ApiResponse<OpportunityDetectedSignal[]>>(
            `/api/v1/signals/detected?company_id=${cId}&page_size=100&sort_by=priority`
          )
        );
      }

      // 3. Fetch by all attached persons
      for (const pId of personIds) {
        fetchPromises.push(
          apiFetch<ApiResponse<OpportunityDetectedSignal[]>>(
            `/api/v1/signals/detected?person_id=${pId}&page_size=100&sort_by=priority`
          )
        );
      }

      const results = await Promise.allSettled(fetchPromises);
      const signalsMap: Record<string, OpportunityDetectedSignal> = {};

      for (const res of results) {
        if (res.status === 'fulfilled' && res.value?.data) {
          for (const sig of res.value.data) {
            signalsMap[sig.id] = sig;
          }
        }
      }

      setSignals(Object.values(signalsMap));
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
