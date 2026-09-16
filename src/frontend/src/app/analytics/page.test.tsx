import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnalyticsPage from './page';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockMetricsData = {
  lookback_days: 90,
  evaluated_at: '2026-09-16T12:00:00Z',
  quality: {
    total_detected: 42,
    total_actioned: 35,
    total_dismissed: 7,
    total_resolved: 30,
    total_active: 12,
    action_rate: 0.825,
    dismissal_rate: 0.175,
    precision_proxy: 0.875,
    needs_verification_rate: 0.05,
    conflict_rate: 0.02,
  },
  latency: {
    mean_time_to_action_hours: 4.5,
    median_time_to_action_hours: 3.2,
    sla_breach_count: 2,
    sla_breach_rate: 0.057,
    total_actioned_measured: 35,
  },
  outcomes: {
    attribution_window_days: 90,
    opportunities_created_count: 14,
    opportunity_conversion_rate: 0.4,
    account_reactivations_count: 8,
    account_reactivation_rate: 0.228,
    contracts_renewed_count: 5,
    contract_renewal_rate: 0.143,
  },
  revenue: {
    influenced_pipeline_total: '245000',
    weighted_influenced_pipeline_total: '122500',
    protected_revenue_total: '95000',
    currency: 'USD',
    value_coverage_rate: 0.85,
  },
  by_signal: [
    {
      key: 'dormant_account_activity',
      label: 'Dormant Account Re-engagement',
      category: 'opportunity',
      severity: 'high',
      total_detected: 20,
      actioned_count: 18,
      dismissed_count: 2,
      action_rate: 0.9,
      mean_time_to_action_hours: 3.1,
      opportunities_created_count: 8,
      influenced_pipeline: '150000',
    },
    {
      key: 'contract_expiration_upcoming',
      label: 'Upcoming Contract Renewal',
      category: 'risk',
      severity: 'critical',
      total_detected: 10,
      actioned_count: 9,
      dismissed_count: 1,
      action_rate: 0.9,
      mean_time_to_action_hours: 2.0,
      opportunities_created_count: 4,
      influenced_pipeline: '75000',
    },
  ],
  by_category: [
    {
      key: 'opportunity',
      label: 'Opportunity',
      total_detected: 25,
      actioned_count: 22,
      dismissed_count: 3,
      action_rate: 0.88,
      opportunities_created_count: 10,
      influenced_pipeline: '170000',
    },
    {
      key: 'risk',
      label: 'Risk',
      total_detected: 17,
      actioned_count: 13,
      dismissed_count: 4,
      action_rate: 0.765,
      opportunities_created_count: 4,
      influenced_pipeline: '75000',
    },
  ],
  by_severity: [
    {
      key: 'critical',
      label: 'Critical',
      total_detected: 10,
      actioned_count: 9,
      dismissed_count: 1,
      action_rate: 0.9,
      opportunities_created_count: 4,
      influenced_pipeline: '75000',
    },
  ],
};

describe('AnalyticsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockResolvedValue(mockMetricsData);
  });

  it('renders top intelligence banner and primary KPIs', async () => {
    render(<AnalyticsPage />);

    expect(screen.getByText(/Intelligence & Performance Analytics/i)).toBeInTheDocument();
    expect(screen.getByText('Signal Performance & ROI Analytics')).toBeInTheDocument();

    await waitFor(() => {
      // KPI 1: Action Rate
      expect(screen.getByText('82.5%')).toBeInTheDocument();
      // KPI 2: MTTA
      expect(screen.getByText('4.5 hrs')).toBeInTheDocument();
      // KPI 3: Influenced Pipeline
      expect(screen.getByText('$245,000')).toBeInTheDocument();
      // KPI 4: 90d Outcomes
      expect(screen.getByText('14 Deals')).toBeInTheDocument();
    });
  });

  it('renders quality proxy and health metrics', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Detection Precision Proxy')).toBeInTheDocument();
      expect(screen.getByText('Needs Verification Rate')).toBeInTheDocument();
      expect(screen.getByText('Opposing Conflict Rate')).toBeInTheDocument();
      expect(screen.getByText('Deal Value Coverage')).toBeInTheDocument();
    });
  });

  it('allows switching lookback windows', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('90d (Default)')).toBeInTheDocument();
    });

    const btn30 = screen.getByText('30d');
    fireEvent.click(btn30);

    expect(apiFetch).toHaveBeenCalledWith('/api/v1/signals/metrics?lookback_days=30');
  });

  it('allows filtering by category', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Dormant Account Re-engagement')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Contract Renewal')).toBeInTheDocument();
    });

    const riskFilterBtn = screen.getByText('Risks');
    fireEvent.click(riskFilterBtn);

    expect(screen.queryByText('Dormant Account Re-engagement')).not.toBeInTheDocument();
    expect(screen.getByText('Upcoming Contract Renewal')).toBeInTheDocument();
  });
});
