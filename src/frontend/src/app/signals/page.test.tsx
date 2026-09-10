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
      expect(screen.getByRole('heading', { name: 'Hybrid & Conflicts' })).toBeInTheDocument();
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

  it('splits signals into 3 columns: Opportunities, Risks, and Hybrid & Conflicts', async () => {
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Opportunities' })).toBeInTheDocument();
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
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/signals/evaluate', {
        method: 'POST',
      });
      expect(screen.getByText(/Radar sweep completed: 1 new signals flagged/)).toBeInTheDocument();
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
});

