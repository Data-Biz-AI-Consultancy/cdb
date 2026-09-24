'use client';

import { useState, useCallback, useEffect } from 'react';
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

export function useSignalsData() {
  const [catalog, setCatalog] = useState<SignalDefinition[]>([]);
  const [signals, setSignals] = useState<DetectedSignal[]>([]);
  const [stats, setStats] = useState<DetectedSignalStatsResponse | null>(null);
  const [metrics, setMetrics] = useState<SignalMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationBanner, setEvaluationBanner] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [lookbackDays, setLookbackDays] = useState<number>(90);

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

  const handleBulkAction = async (
    selectedSignalIds: string[],
    setSelectedSignalIds: (ids: string[]) => void,
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

  return {
    catalog,
    setCatalog,
    signals,
    setSignals,
    stats,
    setStats,
    metrics,
    setMetrics,
    loading,
    evaluating,
    evaluationBanner,
    setEvaluationBanner,
    actionInProgress,
    setActionInProgress,
    lookbackDays,
    setLookbackDays,
    loadData,
    handleLookbackChange,
    handleRunEvaluation,
    handleAcknowledge,
    handleLinkPerson,
    handleUnlinkPerson,
    handleBulkAction,
  };
}
