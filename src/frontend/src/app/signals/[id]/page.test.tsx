import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignalDetailPage from './page';

// Mock apiFetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/lib/api';

const mockSignalDetail = {
  id: 'sig-test-123',
  signal_id: 'dormant_strategic_account',
  signal: {
    id: 'dormant_strategic_account',
    name: 'Dormant Strategic Account',
    category: 'risk',
    target_entity: 'company',
    severity: 'high',
    icon: '💤',
    business_interpretation:
      'In consulting and advisory, repeat business and account expansion represent 60-80% of revenue.',
    recommended_action: {
      playbook: 'executive_touchpoint',
      action_type: 'schedule_sync',
      title: 'Schedule Executive Check-In or QBR',
      description: 'Reach out to past client sponsors with a relevant industry benchmark.',
    },
    is_active: true,
  },
  company_id: 'comp-999',
  company_name: 'Acme Enterprise Solutions',
  person_id: 'pers-888',
  person_name: 'Sarah Connor',
  opportunity_id: null,
  opportunity_title: null,
  engagement_id: 'eng-777',
  engagement_title: 'Cloud Transformation Retainer',
  activity_id: 'act-666',
  status: 'active',
  severity: 'high',
  confidence_score: 0.88,
  confidence_tier: 'high',
  is_uncertain: true,
  uncertainty_reasons: ['Touchpoint history has gap between 60d and 90d'],
  has_conflict: true,
  conflict_scope: 'company',
  conflicting_signal_ids: ['sig-conflict-456'],
  conflict_summary:
    'Conflicting signals on Company: High Risk (dormant_strategic_account) vs Medium Opportunity (hiring_funding_event)',
  evidence: {
    evidence_type: 'touchpoint_cadence',
    summary: 'No activity logged for strategic account in 75 days.',
    timestamp: '2026-06-25T10:00:00Z',
    source_entity_type: 'company',
    source_entity_id: 'comp-999',
    excerpt: 'Last interaction was 75 days ago',
    verification_status: 'verified',
    context: { days_inactive: 75, qualifying_type: 'signed_engagement' },
  },
  title: 'Dormant Strategic Account: Acme Enterprise Solutions',
  summary: 'No activity recorded in 75 days on signed retainer account.',
  detected_at: '2026-09-08T10:00:00Z',
  created_at: '2026-09-08T10:00:00Z',
  updated_at: '2026-09-08T10:00:00Z',
};

describe('SignalDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders signal details, confidence meter, conflict alert, evidence dossier, and entities', async () => {
    (apiFetch as any).mockResolvedValue(mockSignalDetail);

    render(<SignalDetailPage params={Promise.resolve({ id: 'sig-test-123' })} />);

    await waitFor(() => {
      expect(
        screen.getByText('Dormant Strategic Account: Acme Enterprise Solutions')
      ).toBeInTheDocument();
      expect(
        screen.getByText('No activity recorded in 75 days on signed retainer account.')
      ).toBeInTheDocument();
      expect(screen.getByText('🎯 88% Confidence')).toBeInTheDocument();
      expect(screen.getByText('Status: active')).toBeInTheDocument();
    });

    // Conflict Alert
    expect(screen.getByText(/Opposing Signal Polarity Detected \(company level\)/)).toBeInTheDocument();
    expect(screen.getByText(/High Risk \(dormant_strategic_account\)/)).toBeInTheDocument();

    // Uncertainty Callout
    expect(
      screen.getByText('Classification Uncertainty — Verification Recommended')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Touchpoint history has gap between 60d and 90d')
    ).toBeInTheDocument();

    // Supporting Evidence Dossier
    expect(screen.getByText('Supporting Evidence Dossier')).toBeInTheDocument();
    expect(screen.getByText('“Last interaction was 75 days ago”')).toBeInTheDocument();
    expect(
      screen.getByText('No activity logged for strategic account in 75 days.')
    ).toBeInTheDocument();

    // Connected Entities
    expect(screen.getAllByText('Acme Enterprise Solutions').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sarah Connor').length).toBeGreaterThan(0);
    expect(screen.getByText('Cloud Transformation Retainer')).toBeInTheDocument();

    const viewPersonLink = screen.getByRole('link', { name: /View Person/i });
    expect(viewPersonLink).toHaveAttribute('href', '/persons/pers-888');

    const viewCompanyLink = screen.getByRole('link', { name: /View Company/i });
    expect(viewCompanyLink).toHaveAttribute('href', '/companies/comp-999');

    // Playbook
    expect(screen.getByText('Schedule Executive Check-In or QBR')).toBeInTheDocument();
    expect(
      screen.getByText('Reach out to past client sponsors with a relevant industry benchmark.')
    ).toBeInTheDocument();
  });

  it('handles multi-person contact names with individual search links and direct person link', async () => {
    const multiPersonSignal = {
      ...mockSignalDetail,
      person_id: 'pers-multi-123',
      person_name: 'Louis Guitton, Jodi Barrow',
    };
    (apiFetch as any).mockResolvedValue(multiPersonSignal);

    render(<SignalDetailPage params={Promise.resolve({ id: 'sig-test-123' })} />);

    await waitFor(() => {
      expect(screen.getAllByText('Louis Guitton').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Jodi Barrow').length).toBeGreaterThan(0);
    });

    const louisLinks = screen.getAllByRole('link', { name: /Louis Guitton/i });
    expect(louisLinks.some((l) => l.getAttribute('href')?.includes('Louis%20Guitton'))).toBe(true);

    const jodiLinks = screen.getAllByRole('link', { name: /Jodi Barrow/i });
    expect(jodiLinks.some((l) => l.getAttribute('href')?.includes('Jodi%20Barrow'))).toBe(true);

    const viewPersonBtn = screen.getByRole('link', { name: /View Person/i });
    expect(viewPersonBtn).toHaveAttribute('href', '/persons/pers-multi-123');
  });

  it('renders multiple distinct connected persons with individual direct view person links', async () => {
    const multiConnectedSignal = {
      ...mockSignalDetail,
      person_id: 'pers-louis-1',
      person_name: 'Louis Guitton',
      connected_persons: [
        {
          id: 'pers-louis-1',
          name: 'Louis Guitton',
          email: 'louis@example.com',
          role: 'primary',
        },
        {
          id: 'pers-jodi-2',
          name: 'Jodi Barrow',
          email: 'jodi@example.com',
          role: 'counterparty',
        },
      ],
    };
    (apiFetch as any).mockResolvedValue(multiConnectedSignal);

    render(<SignalDetailPage params={Promise.resolve({ id: 'sig-test-123' })} />);

    await waitFor(() => {
      expect(screen.getByText('Connected People (2)')).toBeInTheDocument();
      expect(screen.getAllByText('Louis Guitton').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Jodi Barrow').length).toBeGreaterThan(0);
    });

    const viewPersonLinks = screen.getAllByRole('link', { name: /View Person/i });
    expect(viewPersonLinks).toHaveLength(2);
    expect(viewPersonLinks[0]).toHaveAttribute('href', '/persons/pers-louis-1');
    expect(viewPersonLinks[1]).toHaveAttribute('href', '/persons/pers-jodi-2');
  });

  it('allows acknowledging signal and updates status', async () => {
    (apiFetch as any).mockResolvedValueOnce(mockSignalDetail);
    (apiFetch as any).mockResolvedValueOnce({
      ...mockSignalDetail,
      status: 'acknowledged',
    });

    render(<SignalDetailPage params={Promise.resolve({ id: 'sig-test-123' })} />);

    await waitFor(() => {
      expect(screen.getByText('Acknowledge')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Acknowledge'));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/signals/detected/sig-test-123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'acknowledged' }),
        })
      );
      expect(screen.getByText('Status: acknowledged')).toBeInTheDocument();
    });
  });

  it('allows taking action with resolution notes modal', async () => {
    (apiFetch as any).mockResolvedValueOnce(mockSignalDetail);
    (apiFetch as any).mockResolvedValueOnce({
      ...mockSignalDetail,
      status: 'actioned',
      resolution_notes: 'Scheduled QBR for Friday',
    });

    render(<SignalDetailPage params={Promise.resolve({ id: 'sig-test-123' })} />);

    await waitFor(() => {
      expect(screen.getByText('Take Action')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Take Action'));

    expect(screen.getByText('Record Completed Action')).toBeInTheDocument();
    const textarea = screen.getByPlaceholderText(/e.g. Scheduled QBR meeting/);
    fireEvent.change(textarea, { target: { value: 'Scheduled QBR for Friday' } });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/signals/detected/sig-test-123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            status: 'actioned',
            resolution_notes: 'Scheduled QBR for Friday',
          }),
        })
      );
      expect(screen.getByText('Resolution Recorded')).toBeInTheDocument();
      expect(screen.getByText('Scheduled QBR for Friday')).toBeInTheDocument();
    });
  });

  it('renders error state if signal is not found', async () => {
    (apiFetch as any).mockRejectedValueOnce(new Error('Signal not found'));

    render(<SignalDetailPage params={Promise.resolve({ id: 'non-existent' })} />);

    await waitFor(() => {
      expect(screen.getByText('Signal Not Found')).toBeInTheDocument();
      expect(screen.getByText('← Back to Signals Radar')).toBeInTheDocument();
    });
  });
});
