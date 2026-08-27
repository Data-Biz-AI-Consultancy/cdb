import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PersonsPage from './page';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockPersonsData = {
  data: [
    {
      id: 'p1',
      first_name: 'Alice',
      last_name: 'Smith',
      primary_email: 'alice@example.com',
      primary_phone: '+1 555 0100',
      linkedin_url: 'linkedin.com/in/alicesmith',
      city: 'New York',
      country: 'US',
      sources: ['linkedin', 'manual'],
      created_at: '2026-08-20T10:00:00Z',
      updated_at: '2026-08-27T15:30:00Z',
    },
    {
      id: 'p2',
      first_name: 'Bob',
      last_name: 'Jones',
      primary_email: 'bob@example.com',
      primary_phone: '+44 7911 123456',
      linkedin_url: 'linkedin.com/in/bobjones',
      city: 'London',
      country: 'GB',
      sources: ['notion'],
      created_at: '2026-08-21T11:00:00Z',
      updated_at: '2026-08-27T16:00:00Z',
    },
  ],
  pagination: {
    total: 25,
    has_more: true,
  },
};

describe('PersonsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockResolvedValue(mockPersonsData);
  });

  it('renders persons list with sorting headers, timestamps, and pagination', async () => {
    render(<PersonsPage />);

    // Header & Total Count
    expect(screen.getByRole('heading', { level: 1, name: /Persons/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    });

    // Column Headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Created At')).toBeInTheDocument();
    expect(screen.getByText('Last Edited')).toBeInTheDocument();

    // Pagination info
    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getAllByText(/25/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('toggles column sorting and triggers api reload', async () => {
    render(<PersonsPage />);
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument());

    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('sort=first_name')
      );
    });
  });

  it('allows selecting rows and displays the bulk actions toolbar', async () => {
    render(<PersonsPage />);
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument());

    // Initially no bulk actions bar
    expect(screen.queryByText(/Bulk actions for dirty records cleanup/i)).not.toBeInTheDocument();

    // Select first row checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is header "select all", second is row 1
    fireEvent.click(checkboxes[1]);

    // Bulk actions bar appears
    expect(screen.getByText('1 Selected')).toBeInTheDocument();
    expect(screen.getByText('✏️ Bulk Edit')).toBeInTheDocument();
    expect(screen.getByText('🗑 Bulk Delete')).toBeInTheDocument();

    // Open Bulk Edit modal
    fireEvent.click(screen.getByText('✏️ Bulk Edit'));
    expect(screen.getByText('Bulk Edit Dirty Data')).toBeInTheDocument();
  });
});
