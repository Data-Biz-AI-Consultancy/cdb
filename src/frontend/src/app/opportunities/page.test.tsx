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
    expected_close_date: '2026-09-15',
    persons: [],
    companies: [],
    created_at: '2026-08-29T10:00:00Z',
    updated_at: '2026-08-29T10:00:00Z',
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

describe('OpportunitiesPage Kanban Board', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiModule.apiFetch as any).mockImplementation((url: string, opts?: any) => {
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

  it('renders Kanban board with stages and pipeline metrics', async () => {
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
      expect(screen.getByText('👥 Attached People & Orgs')).toBeInTheDocument();
      expect(screen.getByText('⏱️ History & Activity')).toBeInTheDocument();
    });

    // Switch to history tab
    const historyTab = screen.getByText('⏱️ History & Activity');
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
});
