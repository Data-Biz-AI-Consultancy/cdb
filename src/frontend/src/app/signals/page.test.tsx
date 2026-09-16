import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignalsPage from './page';

// Mock apiFetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/lib/api';

const mockCatalog = [
  {
    id: 'dormant_strategic_accounts',
    name: 'Dormant Strategic Accounts',
    category: 'risk',
    target_entity: 'company',
    severity: 'high',
    detection_mechanism: 'temporal_cadence',
    business_interpretation:
      'Identifies high-value or strategic client accounts with no logged interactions.',
    parameters: { cadence_days: 90 },
    recommended_action: {
      playbook: 'executive_reengagement',
      title: 'Strategic Re-Engagement Outreach',
      description: 'Review past projects and reach out with executive updates.',
    },
    icon: '🏢',
    is_active: true,
  },
  {
    id: 'unanswered_conversations',
    name: 'Unanswered Conversations',
    category: 'risk',
    target_entity: 'person',
    severity: 'critical',
    detection_mechanism: 'text_pattern',
    business_interpretation:
      'Inbound message from a client or prospect waiting for our reply.',
    parameters: { stale_days: 7 },
    recommended_action: {
      playbook: 'urgent_follow_up',
      title: 'Direct Response Needed',
      description: 'Reply immediately to avoid commercial drop-off.',
    },
    icon: '💬',
    is_active: true,
  },
];

const mockDetectedSignals = [
  {
    id: 'sig-001',
    signal_id: 'dormant_strategic_accounts',
    signal: mockCatalog[0],
    company_id: 'comp-101',
    company_name: 'Acme Corp',
    person_id: null,
    person_name: null,
    opportunity_id: null,
    opportunity_title: null,
    engagement_id: null,
    engagement_title: null,
    status: 'active',
    severity: 'high',
    confidence_score: 0.9,
    confidence_tier: 'high',
    has_conflict: true,
    conflicting_signal_ids: ['sig-002'],
    conflict_summary: 'Company-level conflict: Account exhibits both Opportunity momentum and Risk indicators.',
    evidence: {
      evidence_type: 'temporal_inactivity',
      excerpt: 'No touchpoints recorded for 120 days on Acme Corp',
      verification_status: 'verified',
    },
    title: 'Dormant Account Alert: Acme Corp',
    summary: 'No activities logged for 120 days (threshold: 90 days).',
    detected_at: '2026-09-08T10:00:00Z',
    created_at: '2026-09-08T10:00:00Z',
    updated_at: '2026-09-08T10:00:00Z',
  },
  {
    id: 'sig-002',
    signal_id: 'hiring_or_funding_events',
    signal: {
      id: 'hiring_or_funding_events',
      name: 'Hiring or Funding Event',
      category: 'opportunity',
      target_entity: 'company',
      severity: 'medium',
      detection_mechanism: 'text_pattern',
      business_interpretation: 'Growth signal',
      parameters: {},
      recommended_action: {},
      is_active: true,
    },
    company_id: 'comp-102',
    company_name: 'Beta Inc',
    person_id: null,
    person_name: null,
    opportunity_id: null,
    opportunity_title: null,
    engagement_id: null,
    engagement_title: null,
    status: 'active',
    severity: 'medium',
    confidence_score: 0.45,
    confidence_tier: 'low',
    is_uncertain: true,
    uncertainty_reasons: ['Evidence is 75 days old; growth context may have evolved'],
    has_conflict: false,
    evidence: {
      evidence_type: 'text_pattern',
      excerpt: 'Matched hiring expansion phrase',
      verification_status: 'uncertain',
    },
    title: 'Hiring Expansion: Beta Inc',
    summary: 'Potential advisory expansion opportunity.',
    detected_at: '2026-09-08T10:00:00Z',
    created_at: '2026-09-08T10:00:00Z',
    updated_at: '2026-09-08T10:00:00Z',
  },
];

const mockStats = {
  total_active: 2,
  total_conflicting: 1,
  total_uncertain: 1,
  by_severity: { high: 1, medium: 1 },
  by_category: { risk: 1, opportunity: 1 },
  by_signal: { dormant_strategic_accounts: 1, hiring_or_funding_events: 1 },
  by_status: { active: 2 },
};

const mockMetrics = {
  lookback_days: 90,
  evaluated_at: '2026-09-16T12:00:00Z',
  quality: {
    total_detected: 10,
    total_actioned: 6,
    total_dismissed: 2,
    total_resolved: 1,
    total_active: 1,
    action_rate: 0.7,
    dismissal_rate: 0.2,
    precision_proxy: 0.8,
    needs_verification_rate: 0.1,
    conflict_rate: 0.1,
  },
  latency: {
    mean_time_to_action_hours: 18.5,
    median_time_to_action_hours: 12.0,
    sla_breach_count: 1,
    sla_breach_rate: 0.14,
    total_actioned_measured: 7,
  },
  outcomes: {
    attribution_window_days: 90,
    opportunities_created_count: 3,
    opportunity_conversion_rate: 0.43,
    account_reactivations_count: 4,
    account_reactivation_rate: 0.57,
    contracts_renewed_count: 2,
    contract_renewal_rate: 1.0,
  },
  revenue: {
    influenced_pipeline_total: '150000.00',
    weighted_influenced_pipeline_total: '120000.00',
    protected_revenue_total: '85000.00',
    currency: 'USD',
    value_coverage_rate: 1.0,
  },
  by_signal: [
    {
      key: 'dormant_strategic_account',
      label: 'Dormant Strategic Account',
      category: 'risk',
      severity: 'high',
      total_detected: 4,
      actioned_count: 3,
      dismissed_count: 1,
      action_rate: 0.75,
      mean_time_to_action_hours: 14.0,
      opportunities_created_count: 1,
      influenced_pipeline: '50000.00',
    },
  ],
  by_category: [
    {
      key: 'risk',
      label: 'Risk',
      category: 'risk',
      severity: null,
      total_detected: 6,
      actioned_count: 4,
      dismissed_count: 1,
      action_rate: 0.67,
      mean_time_to_action_hours: 16.0,
      opportunities_created_count: 1,
      influenced_pipeline: '50000.00',
    },
  ],
  by_severity: [
    {
      key: 'high',
      label: 'High',
      category: null,
      severity: 'high',
      total_detected: 5,
      actioned_count: 4,
      dismissed_count: 1,
      action_rate: 0.8,
      mean_time_to_action_hours: 15.0,
      opportunities_created_count: 2,
      influenced_pipeline: '100000.00',
    },
  ],
};

describe('SignalsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockImplementation((url: string, options?: any) => {
      if (url.includes('/signals/catalog')) {
        return Promise.resolve({ data: mockCatalog });
      }
      if (url.includes('/signals/detected/stats')) {
        return Promise.resolve(mockStats);
      }
      if (url.includes('/signals/metrics')) {
        return Promise.resolve(mockMetrics);
      }
      if (url.includes('/signals/detected') && (!options || options.method === 'GET')) {
        return Promise.resolve({ data: mockDetectedSignals });
      }
      if (url.includes('/signals/evaluate')) {
        return Promise.resolve({
          status: 'success',
          evaluated_at: new Date().toISOString(),
          total_active_signals: 2,
          total_conflicting: 1,
          total_uncertain: 1,
          new_signals_detected: 1,
          refreshed_signals: 1,
          by_signal: { dormant_strategic_accounts: 2 },
        });
      }
      if (url.includes('/signals/detected/') && options?.method === 'PATCH') {
        return Promise.resolve({ ...mockDetectedSignals[0], status: 'acknowledged' });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders header, KPI metrics, confidence badge, and triage tab by default', async () => {
    render(<SignalsPage />);

    expect(screen.getByText('Opportunity & Risk Signals Radar')).toBeInTheDocument();
    expect(screen.getByText('Run Signal Detection')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Opportunities' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Risks' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Mixed' })).toBeInTheDocument();
      expect(screen.getByText('Dormant Account Alert: Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText(/90% Confidence/)).toBeInTheDocument();
      expect(screen.getByText(/Opposing Signal Polarity Detected/)).toBeInTheDocument();
      expect(screen.getAllByText(/View Details/)[0]).toBeInTheDocument();
      expect(screen.getAllByText('Acknowledge')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Take Action')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Dismiss')[0]).toBeInTheDocument();
    });
  });

  it('splits signals into 3 columns: Opportunities, Mixed, and Risks', async () => {
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Opportunities' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Mixed' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Risks' })).toBeInTheDocument();
      expect(screen.getByText('No active risk signals detected')).toBeInTheDocument();
      expect(screen.getByText('Hiring Expansion: Beta Inc')).toBeInTheDocument();
      expect(screen.getByText('Dormant Account Alert: Acme Corp')).toBeInTheDocument();
    });
  });

  it('filters to conflicting signals when selecting Conflicting Signals tab', async () => {
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText('⚠️ Conflicting Signals')).toBeInTheDocument();
    });

    const conflictTab = screen.getByText('⚠️ Conflicting Signals');
    fireEvent.click(conflictTab);

    await waitFor(() => {
      expect(screen.getByText('Dormant Account Alert: Acme Corp')).toBeInTheDocument();
      expect(screen.queryByText('Hiring Expansion: Beta Inc')).not.toBeInTheDocument();
    });
  });

  it('filters to uncertain signals when selecting Needs Verification tab', async () => {
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText('🔍 Needs Verification')).toBeInTheDocument();
    });

    const uncertainTab = screen.getByText('🔍 Needs Verification');
    fireEvent.click(uncertainTab);

    await waitFor(() => {
      expect(screen.getByText('Hiring Expansion: Beta Inc')).toBeInTheDocument();
      expect(screen.getByText('Classification Uncertainty — Verification Recommended')).toBeInTheDocument();
      expect(screen.queryByText('Dormant Account Alert: Acme Corp')).not.toBeInTheDocument();
    });
  });

  it('switches to Signal Dimension Catalog tab', async () => {
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Signal Dimension Catalog')).toBeInTheDocument();
    });

    const catalogTab = screen.getByText('Signal Dimension Catalog');
    fireEvent.click(catalogTab);

    await waitFor(() => {
      expect(screen.getByText('Unanswered Conversations')).toBeInTheDocument();
      expect(
        screen.getByText('Identifies high-value or strategic client accounts with no logged interactions.')
      ).toBeInTheDocument();
    });
  });

  it('triggers signal evaluation sweep on button click', async () => {
    render(<SignalsPage />);

    const evalBtn = screen.getByText('Run Signal Detection');
    fireEvent.click(evalBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/signals/evaluate'),
        {
          method: 'POST',
        }
      );
      expect(screen.getByText(/Radar sweep completed/)).toBeInTheDocument();
    });
  });

  it('allows acknowledging a detected signal', async () => {
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Acknowledge')[0]).toBeInTheDocument();
    });

    const ackBtn = screen.getAllByText('Acknowledge')[0];
    fireEvent.click(ackBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/signals\/detected\/(sig-001|sig-002)/),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  it('filters detected signals by signal type using the Signal: All Types dropdown', async () => {
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Dormant Account Alert: Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Hiring Expansion: Beta Inc')).toBeInTheDocument();
    });

    const signalFilterSelect = screen.getByLabelText('Filter by Signal Type');

    // Filter to dormant_strategic_accounts
    fireEvent.change(signalFilterSelect, { target: { value: 'dormant_strategic_accounts' } });

    await waitFor(() => {
      expect(screen.getByText('Dormant Account Alert: Acme Corp')).toBeInTheDocument();
      expect(screen.queryByText('Hiring Expansion: Beta Inc')).not.toBeInTheDocument();
    });

    // Reset back to All Types
    fireEvent.change(signalFilterSelect, { target: { value: 'all' } });

    await waitFor(() => {
      expect(screen.getByText('Dormant Account Alert: Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Hiring Expansion: Beta Inc')).toBeInTheDocument();
    });
  });

  it('resets active filters when clicking the Reset filters button', async () => {
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Dormant Account Alert: Acme Corp')).toBeInTheDocument();
    });

    const signalFilterSelect = screen.getByLabelText('Filter by Signal Type');
    fireEvent.change(signalFilterSelect, { target: { value: 'dormant_strategic_accounts' } });

    await waitFor(() => {
      expect(screen.getByText('Reset filters')).toBeInTheDocument();
      expect(screen.queryByText('Hiring Expansion: Beta Inc')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Reset filters'));

    await waitFor(() => {
      expect(screen.getByText('Hiring Expansion: Beta Inc')).toBeInTheDocument();
      expect(screen.queryByText('Reset filters')).not.toBeInTheDocument();
    });
  });

  it('displays the default sorting option and supports changing sorting options', async () => {
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Dormant Account Alert: Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Hiring Expansion: Beta Inc')).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText('Sort Signals') as HTMLSelectElement;
    expect(sortSelect).toBeInTheDocument();
    expect(sortSelect.value).toBe('newest');
    expect(screen.getByText('Sort: Newest First (Default)')).toBeInTheDocument();

    // Switch to Highest Severity
    fireEvent.change(sortSelect, { target: { value: 'severity' } });
    expect(sortSelect.value).toBe('severity');

    // Switch to Highest Confidence
    fireEvent.change(sortSelect, { target: { value: 'confidence_desc' } });
    expect(sortSelect.value).toBe('confidence_desc');

    // Switch to Oldest First
    fireEvent.change(sortSelect, { target: { value: 'oldest' } });
    expect(sortSelect.value).toBe('oldest');

    // Reset filters restores default sort
    const resetBtn = screen.getByText('Reset filters');
    fireEvent.click(resetBtn);
    expect(sortSelect.value).toBe('newest');
  });

  it('renders multiple connected person pills and supports filtering by connected person name', async () => {
    const multiPersonSignals = [
      {
        ...mockDetectedSignals[0],
        id: 'sig-multi-persons',
        title: 'Competitor Mention: Acme Corp',
        connected_persons: [
          { id: 'p-1', name: 'Louis Guitton', role: 'primary' },
          { id: 'p-2', name: 'Jodi Barrow', role: 'counterparty' },
        ],
      },
    ];

    (apiFetch as any).mockImplementation((url: string) => {
      if (url.includes('/signals/catalog')) return Promise.resolve({ data: mockCatalog });
      if (url.includes('/signals/detected/stats')) return Promise.resolve(mockStats);
      if (url.includes('/signals/detected')) return Promise.resolve({ data: multiPersonSignals });
      return Promise.resolve({ data: [] });
    });

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Louis Guitton')).toBeInTheDocument();
      expect(screen.getByText('Jodi Barrow')).toBeInTheDocument();
    });

    const louisLink = screen.getByRole('link', { name: /Louis Guitton/i });
    expect(louisLink).toHaveAttribute('href', '/persons/p-1');

    const jodiLink = screen.getByRole('link', { name: /Jodi Barrow/i });
    expect(jodiLink).toHaveAttribute('href', '/persons/p-2');

    // Filter by searching for "Jodi"
    const searchInput = screen.getByPlaceholderText(/Search signals by entity/i);
    fireEvent.change(searchInput, { target: { value: 'Jodi' } });

    await waitFor(() => {
      expect(screen.getByText('Louis Guitton')).toBeInTheDocument();
      expect(screen.getByText('Jodi Barrow')).toBeInTheDocument();
    });

    // Filter by searching for a name not in connected_persons
    fireEvent.change(searchInput, { target: { value: 'Nonexistent Person' } });

    await waitFor(() => {
      expect(screen.queryByText('Louis Guitton')).not.toBeInTheDocument();
    });
  });

  it('allows user to change the lookback window and triggers evaluation with chosen lookback', async () => {
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Opportunity & Risk Signals Radar')).toBeInTheDocument();
    });

    // Initial fetch includes lookback_days=90
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/signals/detected?page_size=100&lookback_days=90')
    );

    // Change lookback window in toolbar
    const lookbackSelect = screen.getByLabelText(/Filter by Lookback Window/i);
    fireEvent.change(lookbackSelect, { target: { value: '180' } });

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/signals/detected?page_size=100&lookback_days=180')
      );
    });

    // Run signal detection and check evaluate call with lookback_days=180
    const runBtn = screen.getByText('Run Signal Detection');
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/signals/evaluate?lookback_days=180',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('renders the Success & Quality Metrics tab with KPIs, MTTA, and breakdown tables', async () => {
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText('📊 Success & Quality Metrics')).toBeInTheDocument();
    });

    // Switch to Metrics Tab
    const metricsTabBtn = screen.getByText('📊 Success & Quality Metrics');
    fireEvent.click(metricsTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Signal Performance & Success Metrics')).toBeInTheDocument();
      // Check Action Rate KPI
      expect(screen.getByText('70.0%')).toBeInTheDocument();
      // Check MTTA
      expect(screen.getByText('18.5 hrs')).toBeInTheDocument();
      // Check Influenced Pipeline
      expect(screen.getByText('$150,000')).toBeInTheDocument();
      // Check Deals Created
      expect(screen.getByText('3 Deals')).toBeInTheDocument();
      // Check Breakdown by Signal table
      expect(screen.getByText('Performance Breakdown by Signal Type')).toBeInTheDocument();
    });
  });
});

