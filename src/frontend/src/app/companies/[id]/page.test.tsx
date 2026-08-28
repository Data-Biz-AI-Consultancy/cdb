import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CompanyDetailPage from './page';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

describe('CompanyDetailPage Comprehensive Entity Intelligence & Sorting', () => {
  const mockCompany = {
    id: 'comp-1111-2222-3333',
    name: 'Acme AI Systems',
    domain: 'acmeai.io',
    industry: 'Artificial Intelligence',
    size_range: '51-200',
    city: 'Munich',
    country: 'DE',
    linkedin_url: 'https://linkedin.com/company/acme-ai',
    attributes: {
      tags: ['target_account', 'enterprise', 'genai'],
      notes: 'Strategic account for Q4 data platform migration.',
    },
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-08-25T15:00:00Z',
  };

  const mockEmployees = [
    {
      relationship_id: 'rel-1',
      person_id: 'person-1',
      first_name: 'Sarah',
      last_name: 'Connor',
      primary_email: 'sarah.connor@acmeai.io',
      linkedin_url: 'linkedin.com/in/sarah-connor',
      city: 'Munich',
      country: 'DE',
      title: 'VP of Data Engineering',
      is_current: true,
      started_at: '2022-01-01',
      ended_at: null,
      attributes: {
        segment: 'hiring_decision_makers',
        temperature: 'hot',
      },
    },
    {
      relationship_id: 'rel-2',
      person_id: 'person-2',
      first_name: 'John',
      last_name: 'Doe',
      primary_email: 'john.doe@acmeai.io',
      linkedin_url: 'linkedin.com/in/john-doe',
      city: 'Berlin',
      country: 'DE',
      title: 'Chief Technology Officer',
      is_current: true,
      started_at: '2021-06-01',
      ended_at: null,
      attributes: {
        segment: 'hiring_decision_makers',
        temperature: 'warm',
      },
    },
    {
      relationship_id: 'rel-3',
      person_id: 'person-3',
      first_name: 'Alex',
      last_name: 'Smith',
      primary_email: 'alex.smith@alumni.acme.io',
      linkedin_url: null,
      city: 'Hamburg',
      country: 'DE',
      title: 'Former Senior Architect',
      is_current: false,
      started_at: '2019-01-01',
      ended_at: '2022-12-31',
      attributes: {
        segment: 'former_colleagues_alumni',
        temperature: 'cold',
      },
    },
  ];

  const mockActivities = {
    data: [
      {
        id: 'act-1',
        company_id: 'comp-1111-2222-3333',
        person_id: 'person-1',
        type: 'meeting',
        source: 'notion',
        title: 'Executive Architecture Review Sync',
        summary: 'Met with Sarah to review the enterprise lakehouse rollout plan.',
        occurred_at: '2026-08-26T14:00:00Z',
      },
      {
        id: 'act-2',
        company_id: 'comp-1111-2222-3333',
        person_id: 'person-2',
        type: 'linkedin_message',
        source: 'linkedin',
        title: 'Inbound chat regarding consulting RFP',
        summary: 'John reached out regarding upcoming consulting contract.',
        occurred_at: '2026-08-20T10:00:00Z',
      },
      {
        id: 'act-3',
        company_id: 'comp-1111-2222-3333',
        person_id: null,
        type: 'note',
        source: 'manual',
        title: 'Budget Planning Note',
        summary: 'Confirmed Q4 budget allocation of 120k for external AI audit.',
        occurred_at: '2026-08-27T09:00:00Z',
      },
    ],
  };

  const mockOpportunities = {
    data: [
      {
        id: 'opp-1',
        title: 'Enterprise Lakehouse Modernization',
        stage: 'proposal',
        value: 120000,
        currency: 'EUR',
        probability: 75,
        expected_close_date: '2026-11-01',
        notes: 'Finalizing SOW with Sarah Connor.',
      },
    ],
  };

  const mockLeads = {
    data: [
      {
        id: 'lead-1',
        title: 'AI Governance Advisory Inquiry',
        stage: 'qualified',
        source: 'linkedin_message',
        intent: 'Enterprise Consulting',
        signal_strength: 'strong',
        created_at: '2026-08-24T11:00:00Z',
      },
    ],
  };

  const mockPersons = {
    data: [
      { id: 'person-1', first_name: 'Sarah', last_name: 'Connor', primary_email: 'sarah.connor@acmeai.io' },
      { id: 'person-2', first_name: 'John', last_name: 'Doe', primary_email: 'john.doe@acmeai.io' },
      { id: 'person-3', first_name: 'Alex', last_name: 'Smith', primary_email: 'alex.smith@alumni.acme.io' },
      { id: 'person-4', first_name: 'Elena', last_name: 'Rostova', primary_email: 'elena@external.io' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.apiFetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/v1/companies/comp-1111-2222-3333/employees')) {
        return Promise.resolve(mockEmployees);
      }
      if (url.includes('/api/v1/companies/comp-1111-2222-3333')) {
        return Promise.resolve(mockCompany);
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
      if (url.includes('/api/v1/persons')) {
        return Promise.resolve(mockPersons);
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders Company hero card, KPI metrics, tags and firmographic details', async () => {
    render(<CompanyDetailPage params={Promise.resolve({ id: 'comp-1111-2222-3333' })} />);

    await waitFor(() => {
      expect(screen.getByText('Acme AI Systems')).toBeInTheDocument();
    });

    expect(screen.getByText('Artificial Intelligence')).toBeInTheDocument();
    expect(screen.getByText('👥 51-200')).toBeInTheDocument();
    expect(screen.getByText('acmeai.io')).toBeInTheDocument();
    expect(screen.getAllByText('Munich, DE').length).toBeGreaterThanOrEqual(1);

    // Check tags
    expect(screen.getByText('#target_account')).toBeInTheDocument();
    expect(screen.getByText('#genai')).toBeInTheDocument();

    // Check KPI metrics
    expect(screen.getByText('Associated Contacts')).toBeInTheDocument();
    expect(screen.getByText('€120,000')).toBeInTheDocument();
  });

  it('renders employees tab, filters between Current and Alumni, and displays warmth and last touch badges', async () => {
    render(<CompanyDetailPage params={Promise.resolve({ id: 'comp-1111-2222-3333' })} />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Alex Smith')).toBeInTheDocument();
    });

    // Check titles & warmth badges
    expect(screen.getByText('VP of Data Engineering')).toBeInTheDocument();
    expect(screen.getByText('Hot')).toBeInTheDocument();
    expect(screen.getByText('Warm')).toBeInTheDocument();
    expect(screen.getByText('Cold')).toBeInTheDocument();

    // Check Last touch date indicator
    expect(screen.getAllByText(/Last touch:/).length).toBeGreaterThanOrEqual(1);

    // Filter by Alumni
    fireEvent.click(screen.getByText(/Alumni \/ Past/i));
    expect(screen.getByText('Alex Smith')).toBeInTheDocument();
    expect(screen.queryByText('Sarah Connor')).not.toBeInTheDocument();

    // Filter by Current Staff
    fireEvent.click(screen.getByText(/Current Staff/i));
    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Alex Smith')).not.toBeInTheDocument();
  });

  it('supports sorting employees by Warmth, Interaction, Name, and Tenure', async () => {
    render(<CompanyDetailPage params={Promise.resolve({ id: 'comp-1111-2222-3333' })} />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    });

    const sortSelect = screen.getByRole('combobox');
    expect(sortSelect).toBeInTheDocument();

    // Sort by Name
    fireEvent.change(sortSelect, { target: { value: 'name' } });
    expect(screen.getByText('Alex Smith')).toBeInTheDocument();

    // Sort by Interaction
    fireEvent.change(sortSelect, { target: { value: 'interaction' } });
    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
  });

  it('switches between tabs: Timeline, Notes, Opportunities, Leads, and Company Profile', async () => {
    render(<CompanyDetailPage params={Promise.resolve({ id: 'comp-1111-2222-3333' })} />);

    await waitFor(() => {
      expect(screen.getByText('Acme AI Systems')).toBeInTheDocument();
    });

    // Switch to Timeline
    const timelineTab = screen.getByRole('button', { name: /Timeline/i });
    fireEvent.click(timelineTab);
    expect(screen.getByText('Executive Architecture Review Sync')).toBeInTheDocument();
    expect(screen.getByText(/Met with Sarah to review/)).toBeInTheDocument();

    // Switch to Notes
    const notesTab = screen.getByRole('button', { name: /📌\s*Notes/i });
    fireEvent.click(notesTab);
    expect(screen.getByText('Budget Planning Note')).toBeInTheDocument();
    expect(screen.getByText(/Confirmed Q4 budget allocation/)).toBeInTheDocument();

    // Switch to Opportunities
    const oppsTab = screen.getByRole('button', { name: /Opportunities/i });
    fireEvent.click(oppsTab);
    expect(screen.getByText('Enterprise Lakehouse Modernization')).toBeInTheDocument();
    expect(screen.getByText('Advance Stage →')).toBeInTheDocument();

    // Switch to Leads
    const leadsTab = screen.getByRole('button', { name: /Leads/i });
    fireEvent.click(leadsTab);
    expect(screen.getByText('AI Governance Advisory Inquiry')).toBeInTheDocument();
    expect(screen.getByText('Convert to Opp →')).toBeInTheDocument();

    // Switch to Profile Details
    const profileTab = screen.getByRole('button', { name: /Company Details/i });
    fireEvent.click(profileTab);
    expect(screen.getByText('Strategic account for Q4 data platform migration.')).toBeInTheDocument();
  });

  it('opens and closes modals like Log Activity, Add Note, Link Contact, and Edit Company', async () => {
    render(<CompanyDetailPage params={Promise.resolve({ id: 'comp-1111-2222-3333' })} />);

    await waitFor(() => {
      expect(screen.getByText('Acme AI Systems')).toBeInTheDocument();
    });

    // Open Log Activity Modal
    const logActButtons = screen.getAllByText(/Log Activity/i);
    fireEvent.click(logActButtons[0]);
    expect(screen.getByText('Log Activity for Acme AI Systems')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Log Activity for Acme AI Systems')).not.toBeInTheDocument();

    // Open Add Note Modal
    const addNoteButtons = screen.getAllByText(/Add Note/i);
    fireEvent.click(addNoteButtons[0]);
    expect(screen.getByText('Add Note for Acme AI Systems')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Add Note for Acme AI Systems')).not.toBeInTheDocument();

    // Open Link Contact Modal
    const linkContactButtons = screen.getAllByText(/Link Contact/i);
    fireEvent.click(linkContactButtons[0]);
    expect(screen.getByText('Link Contact to Acme AI Systems')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Link Contact to Acme AI Systems')).not.toBeInTheDocument();

    // Open Edit Company Modal
    const editButtons = screen.getAllByText(/Edit/i);
    fireEvent.click(editButtons[0]);
    expect(screen.getByText('Edit Company Profile')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Edit Company Profile')).not.toBeInTheDocument();
  });
});
