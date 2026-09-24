import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OpportunitiesPage from './page';
import * as apiModule from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockOpportunities = [
  {
    id: 'opp-1',
    title: 'Enterprise Cloud Migration',
    description: 'Multi-phase data platform transition',
    stage: 'prospect',
    value: 120000,
    currency: 'USD',
    probability: 40,
    expected_close_date: '2026-11-30',
    notes: 'Initial intro call scheduled',
    is_stale: true,
    is_expired: false,
    days_inactive: 35,
    staleness_status: 'stale',
    persons: [
      {
        person_id: 'p-1',
        role: 'decision_maker',
        person_name: 'Alice Smith',
        person_email: 'alice@acme.corp',
      },
    ],
    companies: [
      {
        company_id: 'c-1',
        role: 'client',
        company_name: 'Acme Corp',
        company_domain: 'acme.corp',
      },
    ],
    created_at: '2026-08-30T10:00:00Z',
    updated_at: '2026-08-30T10:00:00Z',
  },
  {
    id: 'opp-2',
    title: 'AI Copilot Pilot',
    description: 'Quarterly proof of concept for internal support team',
    stage: 'proposal',
    value: 45000,
    currency: 'USD',
    probability: 70,
    expected_close_date: '2026-08-01',
    is_stale: false,
    is_expired: true,
    days_inactive: 95,
    staleness_status: 'expired',
    is_overdue: true,
    days_overdue: 30,
    persons: [],
    companies: [],
    created_at: '2026-08-29T10:00:00Z',
    updated_at: '2026-08-29T10:00:00Z',
  },
];

const mockDetectedSignals = [
  {
    id: 'sig-1',
    signal_id: 'dormant_account_warning',
    title: 'Account Inactivity Warning',
    summary: 'No logged communications or touchpoints in the past 45 days.',
    company_id: 'c-1',
    company_name: 'Acme Corp',
    opportunity_id: 'opp-1',
    opportunity_title: 'Enterprise Cloud Migration',
    status: 'active',
    severity: 'high',
    priority_tier: 'P1',
    effective_polarity: 'risk',
    score: 85,
    priority_score: 88.5,
    why_it_matters_now: 'Impending renewal cycle with declining stakeholder engagement.',
    evidence: {
      evidence_type: 'inactivity_cadence',
      occurred_at: '2026-08-10T10:00:00Z',
      excerpt: 'Last activity was 45 days ago: Strategy Sync Notes',
      verification_status: 'verified',
      source_reliability: 'high',
    },
    connected_persons: [
      {
        id: 'p-1',
        name: 'Alice Smith',
        role: 'decision_maker',
        primary_email: 'alice@acme.corp',
      },
    ],
    detected_at: '2026-09-20T10:00:00Z',
  },
  {
    id: 'sig-2',
    signal_id: 'tech_expansion_hiring',
    title: 'Key Executive Engineering Hire',
    summary: 'Acme Corp announced VP of Cloud Infrastructure hire.',
    company_id: 'c-1',
    company_name: 'Acme Corp',
    opportunity_id: 'opp-1',
    opportunity_title: 'Enterprise Cloud Migration',
    status: 'active',
    severity: 'medium',
    priority_tier: 'P2',
    effective_polarity: 'opportunity',
    score: 75,
    priority_score: 78.0,
    why_it_matters_now: 'New budget allocated for modernization tooling.',
    evidence: {
      evidence_type: 'enrichment_feed',
      occurred_at: '2026-09-18T10:00:00Z',
      excerpt: 'Job posting & public LinkedIn announcement',
      verification_status: 'verified',
      source_reliability: 'high',
    },
    connected_persons: [],
    detected_at: '2026-09-22T10:00:00Z',
  },
];

const mockHistory = [
  {
    id: 'h-1',
    opportunity_id: 'opp-1',
    action_id: 'opp_created',
    action: {
      id: 'opp_created',
      name: 'Opportunity Created',
      category: 'pipeline',
      icon: '✨',
      color: 'emerald',
    },
    changes: { title: 'Enterprise Cloud Migration' },
    summary: "Created opportunity 'Enterprise Cloud Migration'",
    created_at: '2026-08-30T10:00:00Z',
  },
];

describe('OpportunitiesPage Kanban Board & Signal Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiModule.apiFetch as any).mockImplementation((url: string, opts?: any) => {
      if (url.includes('/api/v1/signals/detected')) {
        return Promise.resolve({ data: mockDetectedSignals });
      }
      if (url.includes('/api/v1/opportunities') && (!opts || opts.method === 'GET')) {
        if (url.includes('/history')) {
          return Promise.resolve({ data: mockHistory });
        }
        return Promise.resolve({ data: mockOpportunities });
      }
      if (url.includes('/api/v1/persons')) {
        return Promise.resolve({
          data: [{ id: 'p-1', first_name: 'Alice', last_name: 'Smith', primary_email: 'alice@acme.corp' }],
        });
      }
      if (url.includes('/api/v1/companies')) {
        return Promise.resolve({
          data: [{ id: 'c-1', name: 'Acme Corp', domain: 'acme.corp' }],
        });
      }
      if (opts?.method === 'PATCH') {
        const body = JSON.parse(opts.body);
        return Promise.resolve({ ...mockOpportunities[0], ...body });
      }
      if (opts?.method === 'POST') {
        if (url.includes('/history/notes')) {
          return Promise.resolve({ id: 'h-2', action_id: 'note_added', summary: 'New Note' });
        }
        return Promise.resolve({ id: 'opp-new', title: 'New Deal', stage: 'prospect' });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders Kanban board with stages, pipeline metrics, and signal indicators on cards', async () => {
    render(<OpportunitiesPage />);

    expect(screen.getByText('Opportunities Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Interactive Kanban')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Enterprise Cloud Migration')).toBeInTheDocument();
      expect(screen.getByText('AI Copilot Pilot')).toBeInTheDocument();
    });

    // Check stage columns
    expect(screen.getByTestId('kanban-column-prospect')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-qualified')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-proposal')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-negotiation')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-closed_won')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-closed_lost')).toBeInTheDocument();

    // Check attached contact and organization rendered on card
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();

    // Check staleness & overdue badges
    expect(screen.getByText(/⚠️ Stale/)).toBeInTheDocument();
    expect(screen.getByText(/⛔ Expired/)).toBeInTheDocument();
    expect(screen.getByText(/🚨 Overdue/)).toBeInTheDocument();

    // Verify signal indicator badges on cards
    await waitFor(() => {
      expect(screen.getByTestId('opp-signals-badge-opp-1')).toBeInTheDocument();
      expect(screen.getByText(/1 Risk/)).toBeInTheDocument();
      expect(screen.getByText(/1 Opp/)).toBeInTheDocument();
      expect(screen.getByText('P1')).toBeInTheDocument();
    });
  });

  it('filters opportunities using search bar', async () => {
    render(<OpportunitiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Enterprise Cloud Migration')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search deals, contacts, companies...');
    fireEvent.change(searchInput, { target: { value: 'Copilot' } });

    expect(screen.queryByText('Enterprise Cloud Migration')).not.toBeInTheDocument();
    expect(screen.getByText('AI Copilot Pilot')).toBeInTheDocument();
  });

  it('filters opportunities by signal triggers (Critical Risks, Growth Triggers)', async () => {
    render(<OpportunitiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Enterprise Cloud Migration')).toBeInTheDocument();
      expect(screen.getByText('AI Copilot Pilot')).toBeInTheDocument();
    });

    // Click Critical Risks filter
    const risksFilterBtn = screen.getByRole('button', { name: /Critical Risks/ });
    fireEvent.click(risksFilterBtn);

    // opp-1 has a risk signal, opp-2 does not
    expect(screen.getByText('Enterprise Cloud Migration')).toBeInTheDocument();
    expect(screen.queryByText('AI Copilot Pilot')).not.toBeInTheDocument();

    // Reset to All Deals
    const allDealsBtn = screen.getByRole('button', { name: 'All Deals' });
    fireEvent.click(allDealsBtn);
    expect(screen.getByText('AI Copilot Pilot')).toBeInTheDocument();
  });

  it('surfaces prioritized signals in the Signals tab with supporting context and affected account', async () => {
    render(<OpportunitiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Enterprise Cloud Migration')).toBeInTheDocument();
    });

    // Open detail drawer
    fireEvent.click(screen.getByText('Enterprise Cloud Migration'));

    await waitFor(() => {
      expect(screen.getByText('📋 Overview & Edit')).toBeInTheDocument();
      expect(screen.getByText(/Signals & Risks/)).toBeInTheDocument();
    });

    // Click on Signals & Risks tab
    const signalsTabBtn = screen.getByText(/Signals & Risks/);
    fireEvent.click(signalsTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId('opportunity-signals-tab')).toBeInTheDocument();
      expect(screen.getByText('Account Inactivity Warning')).toBeInTheDocument();
      expect(screen.getByText('Key Executive Engineering Hire')).toBeInTheDocument();
    });

    // Check visual distinction between risk and opportunity
    expect(screen.getByText('Risk Signal')).toBeInTheDocument();
    expect(screen.getByText('Growth Opportunity')).toBeInTheDocument();

    // Check supporting context
    expect(
      screen.getByText('"Impending renewal cycle with declining stakeholder engagement."')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Last activity was 45 days ago: Strategy Sync Notes')
    ).toBeInTheDocument();

    // Check affected account chip & link
    const affectedAccountLinks = screen.getAllByRole('link', { name: 'Acme Corp' });
    expect(affectedAccountLinks.length).toBeGreaterThanOrEqual(1);

    // Check connected contact
    expect(screen.getByText(/Connected Contact/)).toBeInTheDocument();

    // Test sub-filtering (Risks only)
    const riskSubFilterBtn = screen.getByRole('button', { name: /Risks \(1\)/ });
    fireEvent.click(riskSubFilterBtn);

    expect(screen.getByText('Account Inactivity Warning')).toBeInTheDocument();
    expect(screen.queryByText('Key Executive Engineering Hire')).not.toBeInTheDocument();
  });

  it('opens details drawer and loads history and attached items', async () => {
    render(<OpportunitiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Enterprise Cloud Migration')).toBeInTheDocument();
    });

    // Click details
    const card = screen.getByText('Enterprise Cloud Migration');
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByText('📋 Overview & Edit')).toBeInTheDocument();
      expect(screen.getByText(/Attached People & Orgs/)).toBeInTheDocument();
      expect(screen.getByText(/History & Activity/)).toBeInTheDocument();
    });

    // Switch to history tab
    const historyTab = screen.getByText(/History & Activity/);
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText("Created opportunity 'Enterprise Cloud Migration'")).toBeInTheDocument();
      expect(screen.getByText('📝 Log Meeting Note / Activity')).toBeInTheDocument();
    });

    // Switch to contacts tab
    const contactsTab = screen.getByText(/Attached People & Orgs/);
    fireEvent.click(contactsTab);

    await waitFor(() => {
      expect(screen.getByText('+ Link Person to Opportunity')).toBeInTheDocument();
      expect(screen.getByText('+ Link Company to Opportunity')).toBeInTheDocument();
    });
  });

  it('handles HTML5 drag and drop stage change', async () => {
    render(<OpportunitiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Enterprise Cloud Migration')).toBeInTheDocument();
    });

    const card = screen.getByTestId('opp-card-opp-1');
    const qualifiedColumn = screen.getByTestId('kanban-column-qualified');

    // Drag start
    fireEvent.dragStart(card, {
      dataTransfer: {
        setData: vi.fn(),
        getData: () => 'opp-1',
      },
    });

    // Drag over qualified
    fireEvent.dragOver(qualifiedColumn, {
      preventDefault: vi.fn(),
      dataTransfer: { dropEffect: 'move' },
    });

    // Drop into qualified
    fireEvent.drop(qualifiedColumn, {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: () => 'opp-1',
      },
    });

    await waitFor(() => {
      expect(apiModule.apiFetch).toHaveBeenCalledWith(
        '/api/v1/opportunities/opp-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ stage: 'qualified' }),
        })
      );
    });
  });

  it('searches and attaches a company like Taxfix to an opportunity', async () => {
    (apiModule.apiFetch as any).mockImplementation((url: string, opts?: any) => {
      if (url.includes('/api/v1/signals/detected')) {
        return Promise.resolve({ data: mockDetectedSignals });
      }
      if (url.includes('/api/v1/opportunities/opp-1/companies') && opts?.method === 'POST') {
        return Promise.resolve({
          ...mockOpportunities[0],
          companies: [
            ...mockOpportunities[0].companies,
            { company_id: 'c-taxfix', company_name: 'Taxfix', company_domain: 'taxfix.com', role: 'client' },
          ],
        });
      }
      if (url.includes('/api/v1/companies') && url.includes('q=Taxfix')) {
        return Promise.resolve({
          data: [{ id: 'c-taxfix', name: 'Taxfix', domain: 'taxfix.com' }],
        });
      }
      if (url.includes('/api/v1/opportunities') && (!opts || opts.method === 'GET')) {
        return Promise.resolve({ data: mockOpportunities });
      }
      if (url.includes('/api/v1/persons')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/api/v1/companies')) {
        return Promise.resolve({ data: [{ id: 'c-1', name: 'Acme Corp', domain: 'acme.corp' }] });
      }
      return Promise.resolve({ data: [] });
    });

    render(<OpportunitiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Enterprise Cloud Migration')).toBeInTheDocument();
    });

    // Open detail drawer
    fireEvent.click(screen.getByText('Enterprise Cloud Migration'));

    await waitFor(() => {
      expect(screen.getByText(/Attached People & Orgs/)).toBeInTheDocument();
    });

    // Switch to contacts tab
    fireEvent.click(screen.getByText(/Attached People & Orgs/));

    const companyCombobox = screen.getByTestId('drawer-attach-company-select');
    expect(companyCombobox).toBeInTheDocument();

    // Open combobox dropdown
    fireEvent.click(companyCombobox.querySelector('[role="button"]')!);

    const searchInput = screen.getByPlaceholderText('Type company name (e.g. Taxfix)...');
    fireEvent.change(searchInput, { target: { value: 'Taxfix' } });

    await waitFor(() => {
      expect(screen.getByText('Taxfix')).toBeInTheDocument();
    });

    // Select Taxfix
    fireEvent.click(screen.getByText('Taxfix'));

    // Submit attach company form
    const attachBtn = screen.getByRole('button', { name: 'Attach Company' });
    fireEvent.click(attachBtn);

    await waitFor(() => {
      expect(apiModule.apiFetch).toHaveBeenCalledWith(
        '/api/v1/opportunities/opp-1/companies',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ company_id: 'c-taxfix', role: 'client' }),
        })
      );
    });
  });
});
