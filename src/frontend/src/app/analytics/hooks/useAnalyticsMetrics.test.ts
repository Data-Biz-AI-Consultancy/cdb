import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAnalyticsMetrics } from './useAnalyticsMetrics';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockMetrics = {
  lookback_days: 90,
  evaluated_at: '2026-09-20T10:00:00Z',
  quality: {
    total_detected: 50,
    total_actioned: 40,
    total_dismissed: 10,
    total_resolved: 35,
    total_active: 5,
    action_rate: 0.8,
    dismissal_rate: 0.2,
    precision_proxy: 0.8,
    needs_verification_rate: 0.1,
    conflict_rate: 0.05,
  },
  latency: {
    sla_breach_count: 1,
    sla_breach_rate: 0.02,
    total_actioned_measured: 40,
  },
  outcomes: {
    attribution_window_days: 90,
    opportunities_created_count: 10,
    opportunity_conversion_rate: 0.25,
    account_reactivations_count: 5,
    account_reactivation_rate: 0.1,
    contracts_renewed_count: 3,
    contract_renewal_rate: 0.06,
  },
  revenue: {
    influenced_pipeline_total: '100000',
    weighted_influenced_pipeline_total: '50000',
    protected_revenue_total: '40000',
    currency: 'USD',
    value_coverage_rate: 0.8,
  },
  by_signal: [],
  by_category: [],
  by_severity: [],
};

describe('useAnalyticsMetrics hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches analytics metrics and allows lookback changes', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/v1/signals/metrics')) {
        return Promise.resolve(mockMetrics);
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useAnalyticsMetrics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.metrics?.quality.total_detected).toBe(50);
    });

    act(() => {
      result.current.handleLookbackChange(180);
    });

    expect(result.current.lookbackDays).toBe(180);
  });
});
