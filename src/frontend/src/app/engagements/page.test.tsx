import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EngagementsPage from './page';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/lib/api';

const mockEngagements = [
  {
    id: 'eng-1',
    title: 'Enterprise Data Platform & ML Ops Delivery',
    company_id: 'comp-1',
    status: 'active',
    engagement_type: 'consultancy',
    rate_type: 'daily',
    rate_value: 1650,
    currency: 'USD',
    total_value: 82500,
    contract_ref: 'MSA-SYN-2026-088',
    contract_status: 'signed',
    signed_at: '2026-08-15',
    terms_and_conditions: 'Net 30 days payment. 40 hours/week delivery cap.',
    start_date: '2026-08-20',
    expected_end_date: '2026-11-30',
    created_at: '2026-08-15T10:00:00Z',
    updated_at: '2026-08-15T10:00:00Z',
    company: { id: 'comp-1', name: 'Synthetix Corp', domain: 'synthetix.io' },
    persons: [
      { person_id: 'pers-1', person_name: 'Elena Rostova', role: 'client_lead' }
    ],
    recent_activity: 'Architecture review meeting',
  },
];

const mockCompanies = [{ id: 'comp-1', name: 'Synthetix Corp' }];
const mockPersons = [{ id: 'pers-1', first_name: 'Elena', last_name: 'Rostova', primary_email: 'elena@synthetix.io' }];

describe('EngagementsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockImplementation(async (url: string) => {
      if (url.includes('/api/v1/engagements')) {
        return { data: mockEngagements };
      }
      if (url.includes('/api/v1/companies')) {
        return { data: mockCompanies };
      }
      if (url.includes('/api/v1/persons')) {
        return { data: mockPersons };
      }
      return { data: [] };
    });
  });

  it('renders client engagements header, metrics and list cards', async () => {
    render(<EngagementsPage />);

    expect(screen.getByText('Client Engagements')).toBeInTheDocument();
    expect(screen.getByText('Active Client Delivery')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Engagement/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Enterprise Data Platform & ML Ops Delivery')).toBeInTheDocument();
      expect(screen.getByText(/Synthetix Corp/i)).toBeInTheDocument();
      expect(screen.getByText('MSA-SYN-2026-088')).toBeInTheDocument();
    });
  });

  it('opens new engagement modal and submits properly', async () => {
    (apiFetch as any).mockImplementation(async (url: string, opts?: any) => {
      if (opts?.method === 'POST') {
        return {
          id: 'eng-2',
          title: 'GenAI Strategy Advisory',
          company_id: 'comp-1',
          status: 'active',
          engagement_type: 'advisory',
          rate_type: 'daily',
          rate_value: 2000,
          currency: 'USD',
          total_value: 40000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          company: { id: 'comp-1', name: 'Synthetix Corp' },
          persons: [],
        };
      }
      if (url.includes('/api/v1/engagements')) return { data: mockEngagements };
      if (url.includes('/api/v1/companies')) return { data: mockCompanies };
      if (url.includes('/api/v1/persons')) return { data: mockPersons };
      return { data: [] };
    });

    render(<EngagementsPage />);

    await waitFor(() => {
      expect(screen.getByText('Enterprise Data Platform & ML Ops Delivery')).toBeInTheDocument();
    });

    const newBtn = screen.getByRole('button', { name: /New Engagement/i });
    fireEvent.click(newBtn);

    expect(screen.getByText('Create Client Engagement')).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/e.g. AI Data Platform/i);
    fireEvent.change(titleInput, { target: { value: 'GenAI Strategy Advisory' } });

    const submitBtn = screen.getByText('Save Engagement');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('GenAI Strategy Advisory')).toBeInTheDocument();
    });
  });
});
