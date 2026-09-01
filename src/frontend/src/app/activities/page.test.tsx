import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ActivitiesPage from './page';
import * as apiModule from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockStats = {
  total: 42,
  by_type: {
    meeting: 15,
    linkedin_message: 20,
    email: 0,
    call: 5,
    note: 2,
  },
  by_source: {
    linkedin: 20,
    notion: 15,
    manual: 7,
  },
};

const mockActivities = [
  {
    id: 'act-1',
    title: 'Executive Sync with Taxfix',
    type: 'meeting',
    source: 'notion',
    occurred_at: '2026-09-01T10:00:00Z',
    summary: 'Reviewed data platform expansion and signed SLA',
    raw_content: 'Meeting notes transcript: Alice and Bob discussed timelines.',
    person: {
      id: 'p-1',
      first_name: 'Alice',
      last_name: 'Smith',
      primary_email: 'alice@taxfix.com',
    },
    company: {
      id: 'c-1',
      name: 'Taxfix',
      domain: 'taxfix.com',
    },
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 'act-2',
    title: 'LinkedIn Outreach on AI Copilot',
    type: 'linkedin_message',
    source: 'linkedin',
    occurred_at: '2026-08-30T14:30:00Z',
    summary: 'Intro message sent inquiring about quarterly pilot',
    raw_content: null,
    person: {
      id: 'p-2',
      first_name: 'Charlie',
      last_name: 'Brown',
      primary_email: 'charlie@peanuts.corp',
    },
    company: null,
    created_at: '2026-08-30T14:30:00Z',
    updated_at: '2026-08-30T14:30:00Z',
  },
];

describe('ActivitiesPage Feed and Controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiModule.apiFetch as any).mockImplementation((url: string, opts?: any) => {
      if (url.includes('/api/v1/activities/stats')) {
        return Promise.resolve(mockStats);
      }
      if (url.includes('/api/v1/activities') && (!opts || opts.method === 'GET')) {
        return Promise.resolve({
          data: mockActivities,
          pagination: { page: 1, page_size: 20, total: 42, has_more: true },
        });
      }
      if (url.includes('/api/v1/persons')) {
        return Promise.resolve({
          data: [{ id: 'p-1', first_name: 'Alice', last_name: 'Smith', primary_email: 'alice@taxfix.com' }],
        });
      }
      if (url.includes('/api/v1/companies')) {
        return Promise.resolve({
          data: [{ id: 'c-1', name: 'Taxfix', domain: 'taxfix.com' }],
        });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders KPI metric cards with correct aggregated counts', async () => {
    render(<ActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Activities Feed')).toBeInTheDocument();
    });

    // Check KPI counts
    expect(screen.getByTestId('kpi-total-activities')).toHaveTextContent('42');
    expect(screen.getByTestId('kpi-linkedin-messages')).toHaveTextContent('20');
    expect(screen.getByTestId('kpi-emails')).toHaveTextContent('0');
    expect(screen.getByTestId('kpi-meetings')).toHaveTextContent('15');
    expect(screen.getByTestId('kpi-calls')).toHaveTextContent('5');

    // Check status tags
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('To be updated')).toBeInTheDocument();
  });

  it('renders timeline activity cards with entity links and relative times', async () => {
    render(<ActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Executive Sync with Taxfix')).toBeInTheDocument();
      expect(screen.getByText('LinkedIn Outreach on AI Copilot')).toBeInTheDocument();
    });

    expect(screen.getByText('Reviewed data platform expansion and signed SLA')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Taxfix')).toBeInTheDocument();
  });

  it('renders pagination information and page controls', async () => {
    render(<ActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('pagination-info')).toHaveTextContent('Showing 1 to 20 of 42 activities');
    });

    expect(screen.getByTestId('pagination-prev')).toBeDisabled();
    expect(screen.getByTestId('pagination-next')).not.toBeDisabled();
  });

  it('opens and closes log activity modal', async () => {
    render(<ActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('log-activity-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('log-activity-button'));
    expect(screen.getByText('Log New Customer Activity')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Log New Customer Activity')).not.toBeInTheDocument();
  });

  it('opens activity detail drawer when clicking an activity card', async () => {
    render(<ActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Executive Sync with Taxfix')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Executive Sync with Taxfix'));

    await waitFor(() => {
      expect(screen.getByTestId('activity-detail-drawer')).toBeInTheDocument();
      expect(screen.getByText('Transcript / Content')).toBeInTheDocument();
      expect(screen.getByText(/Meeting notes transcript: Alice and Bob discussed timelines/)).toBeInTheDocument();
    });
  });

  it('filters activities when clicking type filter pill', async () => {
    render(<ActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Meeting')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Meeting'));

    await waitFor(() => {
      expect(apiModule.apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('type=meeting')
      );
    });
  });
});
