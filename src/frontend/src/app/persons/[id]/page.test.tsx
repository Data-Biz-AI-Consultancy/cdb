import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PersonDetailPage from './page';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

describe('PersonDetailPage Full History and Pipeline Integration', () => {
  const mockPerson = {
    id: '11111111-1111-1111-1111-111111111111',
    first_name: 'Jane',
    last_name: 'Doe',
    primary_email: 'jane.doe@example.com',
    primary_phone: '+1 555 1234',
    linkedin_url: 'linkedin.com/in/janedoe',
    city: 'Berlin',
    country: 'DE',
    sources: ['linkedin', 'notion'],
    attributes: {
      segment: 'hiring_decision_makers',
      temperature: 'hot',
      tags: ['ai_lead', 'tech_exec'],
    },
    career: [
      {
        relationship_id: 'rel-1',
        company: {
          id: 'comp-1',
          name: 'Acme AI Corp',
          domain: 'acme.ai',
          industry: 'Artificial Intelligence',
        },
        title: 'VP of Data & AI',
        is_current: true,
        started_at: '2023-01-01',
        ended_at: null,
      },
      {
        relationship_id: 'rel-2',
        company: {
          id: 'comp-2',
          name: 'Legacy Soft',
          domain: 'legacy.io',
          industry: 'Software',
        },
        title: 'Lead Data Engineer',
        is_current: false,
        started_at: '2020-01-01',
        ended_at: '2022-12-31',
      },
    ],
  };

  const mockActivities = {
    data: [
      {
        id: 'act-1',
        person_id: '11111111-1111-1111-1111-111111111111',
        type: 'linkedin_message',
        source: 'linkedin',
        title: 'Inbound chat regarding consulting engagement',
        summary: 'Discussed high level requirements for Q4 AI migration project.',
        occurred_at: '2026-08-20T10:00:00Z',
      },
      {
        id: 'act-2',
        person_id: '11111111-1111-1111-1111-111111111111',
        type: 'meeting',
        source: 'notion',
        title: 'Architecture Review Sync',
        summary: 'Met to align on data governance and LLM infrastructure.',
        occurred_at: '2026-08-25T14:30:00Z',
      },
      {
        id: 'act-3',
        person_id: '11111111-1111-1111-1111-111111111111',
        type: 'note',
        source: 'manual',
        title: 'Client Preference Note',
        summary: 'Prefers communication via async email rather than phone calls.',
        occurred_at: '2026-08-26T09:00:00Z',
      },
    ],
  };

  const mockOpportunities = {
    data: [
      {
        id: 'opp-1',
        title: 'Enterprise AI Governance Advisory',
        stage: 'proposal',
        value: 85000,
        currency: 'EUR',
        probability: 70,
        expected_close_date: '2026-10-15',
        notes: 'Finalizing statement of work',
      },
    ],
  };

  const mockLeads = {
    data: [
      {
        id: 'lead-1',
        title: 'Inbound inquiry from LinkedIn',
        stage: 'qualified',
        source: 'linkedin_message',
        intent: 'Architecture Consulting',
        signal_strength: 'strong',
      },
    ],
  };

  const mockHistory = {
    data: [
      {
        id: 'hist-1',
        person_id: '11111111-1111-1111-1111-111111111111',
        action_id: 'profile_updated',
        action: {
          id: 'profile_updated',
          name: 'Profile Updated',
          category: 'profile',
          icon: '✏️',
        },
        summary: 'Updated primary phone and location',
        changes: {
          city: { old: 'Frankfurt', new: 'Berlin' },
          primary_phone: { old: null, new: '+1 555 1234' },
        },
        created_at: '2026-08-27T12:00:00Z',
      },
    ],
  };

  const mockCompanies = {
    data: [
      { id: 'comp-1', name: 'Acme AI Corp', domain: 'acme.ai' },
      { id: 'comp-2', name: 'Legacy Soft', domain: 'legacy.io' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.apiFetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/v1/persons/11111111-1111-1111-1111-111111111111/history')) {
        return Promise.resolve(mockHistory);
      }
      if (url.includes('/api/v1/persons/11111111-1111-1111-1111-111111111111')) {
        return Promise.resolve(mockPerson);
      }
      if (url.includes('/api/v1/activities')) {
        return Promise.resolve(mockActivities);
      }
      if (url.includes('/api/v1/opportunities')) {
        return Promise.resolve(mockOpportunities);
      }
      if (url.includes('/api/v1/leads')) {
        return Promise.resolve(mockLeads);
      }
      if (url.includes('/api/v1/companies')) {
        return Promise.resolve(mockCompanies);
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders Person profile header, segment badge, temperature and tags', async () => {
    render(<PersonDetailPage params={Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' })} />);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    // Check segment badge
    expect(screen.getByText('Hiring Decision-Makers')).toBeInTheDocument();

    // Check temperature badge
    expect(screen.getByText('Hot')).toBeInTheDocument();

    // Check current role & company
    expect(screen.getByText('VP of Data & AI')).toBeInTheDocument();
    expect(screen.getAllByText('Acme AI Corp').length).toBeGreaterThanOrEqual(1);

    // Check tags & sources
    expect(screen.getAllByText(/linkedin/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/ai_lead/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders timeline tab with LinkedIn messages and Notion notes', async () => {
    render(<PersonDetailPage params={Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' })} />);

    await waitFor(() => {
      expect(screen.getByText('Inbound chat regarding consulting engagement')).toBeInTheDocument();
      expect(screen.getByText('Architecture Review Sync')).toBeInTheDocument();
    });

    expect(screen.getByText(/Discussed high level requirements/)).toBeInTheDocument();
  });

  it('switches between tabs to view notes, employment history, opportunities, leads, and changelog', async () => {
    render(<PersonDetailPage params={Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' })} />);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    // Switch to Notes tab
    fireEvent.click(screen.getByText(/Notes \(/i));
    expect(screen.getByText('Client Preference Note')).toBeInTheDocument();
    expect(screen.getByText(/Prefers communication via async email/)).toBeInTheDocument();
    expect(screen.getByText(/Internal CRM Scratchpad/)).toBeInTheDocument();

    // Switch to Employment History
    fireEvent.click(screen.getByText(/Employment \(/i));
    expect(screen.getAllByText('Acme AI Corp').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Legacy Soft')).toBeInTheDocument();
    expect(screen.getByText('Current Role')).toBeInTheDocument();

    // Switch to Opportunities
    fireEvent.click(screen.getByText(/Opportunities \(/i));
    expect(screen.getByText('Enterprise AI Governance Advisory')).toBeInTheDocument();
    expect(screen.getAllByText(/85,000/).length).toBeGreaterThanOrEqual(1);

    // Switch to Leads
    fireEvent.click(screen.getByText(/Leads \(/i));
    expect(screen.getByText('Inbound inquiry from LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Convert to Opp →')).toBeInTheDocument();

    // Switch to Changelog
    fireEvent.click(screen.getByText(/Changelog/i));
    expect(screen.getByText('Profile Updated')).toBeInTheDocument();
    expect(screen.getByText('Updated primary phone and location')).toBeInTheDocument();
    expect(screen.getByText(/Frankfurt/)).toBeInTheDocument();

    // Switch to Profile Details & Intelligence
    fireEvent.click(screen.getByText(/Contact & Intelligence Info/i));
    expect(screen.getByText('jane.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1 555 1234')).toBeInTheDocument();
  });

  it('opens and closes action modals including Add Note', async () => {
    render(<PersonDetailPage params={Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' })} />);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    // Open Add Note modal
    const addNoteButtons = screen.getAllByText(/\+ Add Note/i);
    fireEvent.click(addNoteButtons[0]);
    expect(screen.getByText('Add Note for Jane Doe')).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Add Note for Jane Doe')).not.toBeInTheDocument();
  });
});
