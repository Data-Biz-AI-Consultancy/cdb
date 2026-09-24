'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { SignalMetricsResponse } from '../types';

export function useAnalyticsMetrics() {
  const [metrics, setMetrics] = useState<SignalMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lookbackDays, setLookbackDays] = useState<number>(90);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const loadMetrics = useCallback(async (days: number = lookbackDays) => {
    try {
      setLoading(true);
      const res = await apiFetch<SignalMetricsResponse>(
        `/api/v1/signals/metrics?lookback_days=${days}`
      );
      if (res && res.quality) {
        setMetrics(res);
      }
    } catch (err) {
      console.error('Failed to load analytics metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [lookbackDays]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const handleLookbackChange = (days: number) => {
    setLookbackDays(days);
    loadMetrics(days);
  };

  return {
    metrics,
    loading,
    lookbackDays,
    selectedCategory,
    setSelectedCategory,
    handleLookbackChange,
    loadMetrics,
  };
}
