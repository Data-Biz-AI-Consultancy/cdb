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
  is_uncertain: false,
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
  evidence_fingerprint: 'sha256-abcdef1234567890',
  reopen_count: 1,
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

  it('renders signal details, confidence meter, conflict alert, audit card, and entities', async () => {
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

    // Lifecycle audit card
    expect(screen.getByText('Lifecycle & Deduplication Audit')).toBeInTheDocument();
    expect(screen.getByText('1 time(s) re-opened')).toBeInTheDocument();
    expect(screen.getByText(/sha256-abcde/)).toBeInTheDocument();

    // Conflict Alert
    expect(
      screen.getByText(/Opposing Signal Polarity Detected \(company level\)/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Conflicting signals on Company/)).toBeInTheDocument();

    // Supporting Detection Evidence & Why It Matters Now
    expect(screen.getByText('Why This Signal Matters Now')).toBeInTheDocument();
    expect(screen.getByText('Supporting Detection Evidence')).toBeInTheDocument();
    expect(screen.getByText('Triggering Event')).toBeInTheDocument();
    expect(screen.getAllByText(/touchpoint_cadence/)[0]).toBeInTheDocument();

    // Connected Entities
    expect(screen.getAllByText('Acme Enterprise Solutions')[0]).toBeInTheDocument();
    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();

    const companyLink = screen.getAllByRole('link', { name: /Acme Enterprise Solutions/i })[0];
    expect(companyLink).toHaveAttribute('href', '/companies/comp-999');

    const personLink = screen.getByRole('link', { name: /Sarah Connor/i });
    expect(personLink).toHaveAttribute('href', '/persons/pers-888');

    // Playbook
    expect(screen.getByText('Schedule Executive Check-In or QBR')).toBeInTheDocument();
    expect(
      screen.getByText('Reach out to past client sponsors with a relevant industry benchmark.')
    ).toBeInTheDocument();

    // Action buttons
    expect(screen.getByText('Acknowledge')).toBeInTheDocument();
    expect(screen.getByText('Take Action')).toBeInTheDocument();
    expect(screen.getByText('💤 Snooze')).toBeInTheDocument();
    expect(screen.getByText('Resolve')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('renders multiple distinct connected persons with individual direct links', async () => {
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
      expect(screen.getByText('Louis Guitton')).toBeInTheDocument();
      expect(screen.getByText('Jodi Barrow')).toBeInTheDocument();
    });

    const louisLink = screen.getByRole('link', { name: /Louis Guitton/i });
    expect(louisLink).toHaveAttribute('href', '/persons/pers-louis-1');

    const jodiLink = screen.getByRole('link', { name: /Jodi Barrow/i });
    expect(jodiLink).toHaveAttribute('href', '/persons/pers-jodi-2');
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

    expect(screen.getByText('Record Taken Action')).toBeInTheDocument();
    const textarea = screen.getByPlaceholderText(/e.g., Scheduled executive check-in/);
    fireEvent.change(textarea, { target: { value: 'Scheduled QBR for Friday' } });

    fireEvent.click(screen.getByText('Mark as Actioned'));

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
      expect(screen.getByText('Lifecycle Notes')).toBeInTheDocument();
      expect(screen.getByText('Scheduled QBR for Friday')).toBeInTheDocument();
    });
  });

  it('allows snoozing signal with duration options', async () => {
    (apiFetch as any).mockResolvedValueOnce(mockSignalDetail);
    (apiFetch as any).mockResolvedValueOnce({
      ...mockSignalDetail,
      status: 'snoozed',
      snoozed_until: '2026-09-25T10:00:00Z',
      resolution_notes: 'Checking in after client holiday',
    });

    render(<SignalDetailPage params={Promise.resolve({ id: 'sig-test-123' })} />);

    await waitFor(() => {
      expect(screen.getByText('💤 Snooze')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('💤 Snooze'));

    expect(screen.getByText('💤 Snooze Signal Alert')).toBeInTheDocument();
    // Select 7 Days duration
    fireEvent.click(screen.getByText('7 Days'));

    const textarea = screen.getByPlaceholderText(/e.g., Lead requested contact next month/);
    fireEvent.change(textarea, { target: { value: 'Checking in after client holiday' } });

    fireEvent.click(screen.getByText('Confirm Snooze'));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/signals/detected/sig-test-123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            status: 'snoozed',
            snooze_days: 7,
            resolution_notes: 'Checking in after client holiday',
          }),
        })
      );
    });
  });

  it('allows resolving signal', async () => {
    (apiFetch as any).mockResolvedValueOnce(mockSignalDetail);
    (apiFetch as any).mockResolvedValueOnce({
      ...mockSignalDetail,
      status: 'resolved',
      resolution_notes: 'Account relationship reactivated',
    });

    render(<SignalDetailPage params={Promise.resolve({ id: 'sig-test-123' })} />);

    await waitFor(() => {
      expect(screen.getByText('Resolve')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Resolve'));

    expect(screen.getByText('✅ Resolve Signal')).toBeInTheDocument();
    const textarea = screen.getByPlaceholderText(/e.g., Re-engagement call completed/);
    fireEvent.change(textarea, { target: { value: 'Account relationship reactivated' } });

    fireEvent.click(screen.getByText('Confirm Resolution'));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/signals/detected/sig-test-123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            status: 'resolved',
            resolution_notes: 'Account relationship reactivated',
          }),
        })
      );
    });
  });

  it('allows dismissing signal with reason category', async () => {
    (apiFetch as any).mockResolvedValueOnce(mockSignalDetail);
    (apiFetch as any).mockResolvedValueOnce({
      ...mockSignalDetail,
      status: 'dismissed',
      resolution_notes: '[False Positive] Contacted via WhatsApp',
    });

    render(<SignalDetailPage params={Promise.resolve({ id: 'sig-test-123' })} />);

    await waitFor(() => {
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Dismiss'));

    expect(screen.getByText('Dismiss Signal Alert')).toBeInTheDocument();
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'False Positive' } });

    const textarea = screen.getByPlaceholderText(/e.g., Contact already communicated/);
    fireEvent.change(textarea, { target: { value: 'Contacted via WhatsApp' } });

    fireEvent.click(screen.getByText('Dismiss Signal'));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/signals/detected/sig-test-123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            status: 'dismissed',
            resolution_notes: '[False Positive] Contacted via WhatsApp',
          }),
        })
      );
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
