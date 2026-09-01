import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import EngagementDetailPage from './page';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/lib/api';

const mockEngagement = {
  id: 'eng-123',
  title: 'Enterprise Data Platform & ML Ops Delivery',
  company_id: 'comp-1',
  status: 'active',
  engagement_type: 'consultancy',
  rate_type: 'daily',
  rate_value: 1650,
  currency: 'EUR',
  total_value: 82500,
  contract_ref: 'MSA-SYN-2026-088',
  contract_status: 'signed',
  signed_at: '2026-08-15',
  terms_and_conditions: 'Net 30 days payment. 40 hours/week delivery cap.',
  start_date: '2026-08-20',
  expected_end_date: '2026-11-30',
  notes: 'Weekly sprint demos on Thursdays',
  created_at: '2026-08-15T10:00:00Z',
  updated_at: '2026-08-15T10:00:00Z',
  company: { id: 'comp-1', name: 'Synthetix Corp', domain: 'synthetix.io' },
  persons: [
    { person_id: 'pers-1', person_name: 'Elena Rostova', person_email: 'elena@synthetix.io', role: 'client_lead' }
  ],
  ai_summary: {
    executive_summary: 'Synthetix Corp data platform delivery is on track with steady progress.',
    client_sentiment: 'positive',
    sentiment_reasoning: 'Stable delivery velocity reported in recent syncs.',
    key_highlights: ['Architecture design finalized', 'Signed MSA in place'],
    blockers_and_risks: ['No critical blockers'],
    action_items: [{ task: 'Prepare weekly demo', priority: 'high', suggested_role: 'Technical Lead' }],
    activity_count_analyzed: 3,
    generated_at: '2026-09-01T12:00:00Z',
  },
  contract_file: {
    filename: 'Signed_MSA_Synthetix_2026.pdf',
    storage_key: 'contracts/eng-123/Signed_MSA_Synthetix_2026.pdf',
    content_type: 'application/pdf',
    size_bytes: 2450000,
    uploaded_at: '2026-08-16T12:00:00Z',
    download_url: '/api/v1/engagements/eng-123/contract/download',
  },
};

const mockActivities = [
  {
    id: 'act-1',
    title: 'Milestone 1 Architecture Review',
    type: 'meeting',
    source: 'notion',
    summary: 'Reviewed data ingest performance and finalized SLA terms.',
    raw_content: 'Detailed discussion on Kafka cluster scaling and schema registry setup.',
    occurred_at: '2026-08-25T10:00:00Z',
  },
  {
    id: 'act-2',
    title: 'Sprint Planning Call',
    type: 'call',
    source: 'zoom',
    summary: 'Sprint 3 backlog refined.',
    occurred_at: '2026-08-28T14:00:00Z',
  }
];

describe('EngagementDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockImplementation(async (url: string) => {
      if (url.includes('/api/v1/engagements/eng-123/activities')) {
        return mockActivities;
      }
      if (url.includes('/api/v1/engagements/eng-123')) {
        return mockEngagement;
      }
      if (url.includes('/api/v1/persons')) {
        return { data: [] };
      }
      return null;
    });
  });

  it('renders engagement detail view with contract, rates, contacts, and activity notes', async () => {
    const paramsPromise = Promise.resolve({ id: 'eng-123' });
    render(<EngagementDetailPage params={paramsPromise} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Enterprise Data Platform & ML Ops Delivery/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /Synthetix Corp/i })).toBeInTheDocument();
    expect(screen.getByText('MSA-SYN-2026-088')).toBeInTheDocument();
    expect(screen.getByText(/Net 30 days payment/i)).toBeInTheDocument();
    expect(screen.getByText(/Elena Rostova/i)).toBeInTheDocument();
    expect(screen.getByText('Milestone 1 Architecture Review')).toBeInTheDocument();
    expect(screen.getByText('AI Engagement Intelligence Briefing')).toBeInTheDocument();
    expect(screen.getByText(/Synthetix Corp data platform delivery is on track/i)).toBeInTheDocument();
    expect(screen.getByText('Prepare weekly demo')).toBeInTheDocument();
    expect(screen.getAllByText(/Link LinkedIn/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Signed_MSA_Synthetix_2026.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View \/ Download/i })).toBeInTheDocument();
  });
});
