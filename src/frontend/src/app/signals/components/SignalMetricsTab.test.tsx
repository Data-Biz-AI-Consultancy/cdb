import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignalMetricsTab } from './SignalMetricsTab';
import { SignalMetricsResponse } from '../types';

const mockMetrics: SignalMetricsResponse = {
  lookback_days: 90,
  evaluated_at: '2026-09-20T10:00:00Z',
  quality: {
    total_detected: 150,
    total_actioned: 90,
    total_dismissed: 15,
    total_resolved: 30,
    total_snoozed: 15,
    total_active: 80,
    total_reopened: 5,
    action_rate: 0.60,
    dismissal_rate: 0.10,
    precision_proxy: 0.857,
    needs_verification_rate: 0.045,
    conflict_rate: 0.02,
  },
  latency: {
    mean_time_to_action_hours: 14.5,
    median_time_to_action_hours: 8.0,
    sla_breach_count: 3,
    sla_breach_rate: 0.033,
    total_actioned_measured: 90,
  },
  outcomes: {
    attribution_window_days: 90,
    opportunities_created_count: 12,
    opportunity_conversion_rate: 0.133,
    account_reactivations_count: 8,
    account_reactivation_rate: 0.225,
    contracts_renewed_count: 14,
    contract_renewal_rate: 0.933,
  },
  revenue: {
    influenced_pipeline_total: '450000',
    weighted_influenced_pipeline_total: '320000',
    protected_revenue_total: '850000',
    currency: 'USD',
    value_coverage_rate: 0.785,
  },
  by_signal: [
    {
      key: 'dormant_strategic_accounts',
      label: 'Dormant Strategic Accounts',
      category: 'risk',
      severity: 'high',
      total_detected: 40,
      actioned_count: 30,
      dismissed_count: 4,
      action_rate: 0.75,
      mean_time_to_action_hours: 12.0,
      opportunities_created_count: 5,
      influenced_pipeline: '120000',
    },
  ],
  by_category: [],
  by_severity: [
    {
      key: 'high',
      label: 'High Severity',
      severity: 'high',
      total_detected: 50,
      actioned_count: 35,
      dismissed_count: 5,
      action_rate: 0.70,
      opportunities_created_count: 6,
      influenced_pipeline: '180000',
    },
  ],
};

describe('SignalMetricsTab component', () => {
  it('renders quality, latency, and revenue outcome cards', () => {
    render(
      <SignalMetricsTab
        metrics={mockMetrics}
        lookbackDays={90}
        onLookbackChange={vi.fn()}
        onDrilldownSignal={vi.fn()}
        onDrilldownSeverity={vi.fn()}
      />
    );

    expect(screen.getByText(/85\.7%/i)).toBeInTheDocument();
    expect(screen.getByText(/450,000/i)).toBeInTheDocument();
    expect(screen.getByText(/850,000/i)).toBeInTheDocument();
    expect(screen.getByText('Dormant Strategic Accounts')).toBeInTheDocument();
  });

  it('triggers onLookbackChange when lookback window button is clicked', () => {
    const onLookbackChange = vi.fn();
    render(
      <SignalMetricsTab
        metrics={mockMetrics}
        lookbackDays={90}
        onLookbackChange={onLookbackChange}
        onDrilldownSignal={vi.fn()}
        onDrilldownSeverity={vi.fn()}
      />
    );

    const btn180d = screen.getByText('180d');
    fireEvent.click(btn180d);
    expect(onLookbackChange).toHaveBeenCalledWith(180);
  });

  it('triggers onDrilldownSignal when clicking a breakdown row', () => {
    const onDrilldownSignal = vi.fn();
    render(
      <SignalMetricsTab
        metrics={mockMetrics}
        lookbackDays={90}
        onLookbackChange={vi.fn()}
        onDrilldownSignal={onDrilldownSignal}
        onDrilldownSeverity={vi.fn()}
      />
    );

    const rowText = screen.getByText('Dormant Strategic Accounts');
    fireEvent.click(rowText);
    expect(onDrilldownSignal).toHaveBeenCalledWith('dormant_strategic_accounts', 'risk', 'high');
  });

  it('triggers onDrilldownSeverity when clicking a severity card', () => {
    const onDrilldownSeverity = vi.fn();
    render(
      <SignalMetricsTab
        metrics={mockMetrics}
        lookbackDays={90}
        onLookbackChange={vi.fn()}
        onDrilldownSignal={vi.fn()}
        onDrilldownSeverity={onDrilldownSeverity}
      />
    );

    const sevBtn = screen.getByRole('button', { name: /50 Detected/i });
    fireEvent.click(sevBtn);
    expect(onDrilldownSeverity).toHaveBeenCalledWith('high');
  });
});
