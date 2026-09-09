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
    title: 'Dormant Account Alert: Acme Corp',
    summary: 'No activities logged for 120 days (threshold: 90 days).',
    detected_at: '2026-09-08T10:00:00Z',
    created_at: '2026-09-08T10:00:00Z',
    updated_at: '2026-09-08T10:00:00Z',
  },
];

const mockStats = {
  total_active: 1,
  by_severity: { high: 1 },
  by_category: { risk: 1 },
  by_signal: { dormant_strategic_accounts: 1 },
  by_status: { active: 1 },
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

  it('renders header, KPI metrics, and triage tab by default', async () => {
    render(<SignalsPage />);

    expect(screen.getByText('Opportunity & Risk Signals Radar')).toBeInTheDocument();
    expect(screen.getByText('Run Signal Detection')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Dormant Account Alert: Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Acknowledge')).toBeInTheDocument();
      expect(screen.getByText('Take Action')).toBeInTheDocument();
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });
  });

  it('switches between Triage Feed and Signal Dimension Catalog tabs', async () => {
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
      expect(screen.getByText('Acknowledge')).toBeInTheDocument();
    });

    const ackBtn = screen.getByText('Acknowledge');
    fireEvent.click(ackBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/signals/detected/sig-001'),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });
});
