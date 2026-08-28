import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CompaniesPage from './page';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

describe('CompaniesPage Search & Aggregates', () => {
  const mockCompaniesResponse = {
    data: [
      {
        id: 'comp-1',
        name: 'Acme AI Corp',
        domain: 'acme.ai',
        industry: 'Artificial Intelligence',
        size_range: '51-200',
        city: 'Munich',
        country: 'DE',
        contacts_count: 5,
        leads_count: 3,
        open_opportunities_count: 2,
        total_opportunities_value: 175000,
        created_at: '2026-01-15T10:00:00Z',
      },
      {
        id: 'comp-2',
        name: 'Cyberdyne Systems',
        domain: 'cyberdyne.io',
        industry: 'Robotics',
        size_range: '500+',
        city: 'Berlin',
        country: 'DE',
        contacts_count: 2,
        leads_count: 1,
        open_opportunities_count: 1,
        total_opportunities_value: 80000,
        created_at: '2026-02-20T12:00:00Z',
      },
    ],
    pagination: {
      total: 2,
      has_more: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.apiFetch as any).mockResolvedValue(mockCompaniesResponse);
  });

  it('renders companies table with connected people, related leads, open deals, and pipeline value', async () => {
    render(<CompaniesPage />);

    await waitFor(() => {
      expect(screen.getByText('Acme AI Corp')).toBeInTheDocument();
      expect(screen.getByText('Cyberdyne Systems')).toBeInTheDocument();
    });

    // Check table headers & KPI texts
    expect(screen.getAllByText('Connected People').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Related Leads').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Opportunities & Value')).toBeInTheDocument();

    // Check Acme row metrics
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1); // 5 connected contacts
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1); // 3 leads
    expect(screen.getByText('€175,000')).toBeInTheDocument(); // 175k pipeline value
    expect(screen.getByText('2 open deals')).toBeInTheDocument();

    // Check Cyberdyne row metrics
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('€80,000')).toBeInTheDocument();
    expect(screen.getByText('1 open deal')).toBeInTheDocument();
  });

  it('calculates top aggregate KPI metrics correctly', async () => {
    render(<CompaniesPage />);

    await waitFor(() => {
      expect(screen.getByText('Acme AI Corp')).toBeInTheDocument();
    });

    // Total Contacts: 5 + 2 = 7
    expect(screen.getByText('👥 7')).toBeInTheDocument();

    // Total Leads: 3 + 1 = 4
    expect(screen.getByText('🎯 4')).toBeInTheDocument();

    // Total Pipeline Value: 175k + 80k = 255k
    expect(screen.getByText('€255,000')).toBeInTheDocument();
  });

  it('orders companies by default: highest deal value -> most leads -> latest updated', async () => {
    const multiCoResponse = {
      data: [
        {
          id: 'c1',
          name: 'Co A (Mid Deal, Few Leads)',
          total_opportunities_value: 100000,
          leads_count: 2,
          updated_at: '2026-08-01T10:00:00Z',
        },
        {
          id: 'c2',
          name: 'Co B (Mid Deal, More Leads)',
          total_opportunities_value: 100000,
          leads_count: 5,
          updated_at: '2026-08-01T10:00:00Z',
        },
        {
          id: 'c3',
          name: 'Co C (Highest Deal)',
          total_opportunities_value: 250000,
          leads_count: 1,
          updated_at: '2026-08-01T10:00:00Z',
        },
        {
          id: 'c4',
          name: 'Co D (No Deal, Same Leads, Older)',
          total_opportunities_value: 0,
          leads_count: 3,
          updated_at: '2026-06-01T10:00:00Z',
        },
        {
          id: 'c5',
          name: 'Co E (No Deal, Same Leads, Newer)',
          total_opportunities_value: 0,
          leads_count: 3,
          updated_at: '2026-08-20T10:00:00Z',
        },
      ],
      pagination: { total: 5, has_more: false },
    };
    (api.apiFetch as any).mockResolvedValue(multiCoResponse);

    render(<CompaniesPage />);

    await waitFor(() => {
      expect(screen.getByText('Co C (Highest Deal)')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row');
    // Header is row 0.
    // Row 1 should be Co C (250k)
    expect(rows[1]).toHaveTextContent('Co C (Highest Deal)');
    // Row 2 should be Co B (100k, 5 leads)
    expect(rows[2]).toHaveTextContent('Co B (Mid Deal, More Leads)');
    // Row 3 should be Co A (100k, 2 leads)
    expect(rows[3]).toHaveTextContent('Co A (Mid Deal, Few Leads)');
    // Row 4 should be Co E (0 deal, 3 leads, newer: Aug 20)
    expect(rows[4]).toHaveTextContent('Co E (No Deal, Same Leads, Newer)');
    // Row 5 should be Co D (0 deal, 3 leads, older: June 1)
    expect(rows[5]).toHaveTextContent('Co D (No Deal, Same Leads, Older)');
  });

  it('supports changing sort to Connected People, Related Leads, and Recently Added', async () => {
    render(<CompaniesPage />);

    await waitFor(() => {
      expect(screen.getByText('Acme AI Corp')).toBeInTheDocument();
    });

    const sortSelect = screen.getByRole('combobox', { name: /Sort companies/i });
    expect(sortSelect).toBeInTheDocument();

    // Change sort to Leads
    fireEvent.change(sortSelect, { target: { value: 'leads' } });
    expect(screen.getByText('Acme AI Corp')).toBeInTheDocument();

    // Change sort to Contacts
    fireEvent.change(sortSelect, { target: { value: 'contacts' } });
    expect(screen.getByText('Acme AI Corp')).toBeInTheDocument();
  });

  it('toggles Create Company drawer and submits new company', async () => {
    render(<CompaniesPage />);

    await waitFor(() => {
      expect(screen.getByText('Acme AI Corp')).toBeInTheDocument();
    });

    // Click + New Company
    fireEvent.click(screen.getByRole('button', { name: /\+ New Company/i }));
    expect(screen.getByText('Register New Company')).toBeInTheDocument();

    // Fill form and submit
    fireEvent.change(screen.getByPlaceholderText(/e.g. Acme AI Corp/i), { target: { value: 'New Test Co' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Company/i }));

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith(
        '/api/v1/companies',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});
