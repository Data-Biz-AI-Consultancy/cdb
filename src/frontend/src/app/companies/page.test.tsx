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

  it('supports sorting by Connected People, Related Leads, and Pipeline Value', async () => {
    render(<CompaniesPage />);

    await waitFor(() => {
      expect(screen.getByText('Acme AI Corp')).toBeInTheDocument();
    });

    const sortSelect = screen.getByRole('combobox', { name: /Sort companies/i });
    expect(sortSelect).toBeInTheDocument();

    // Change sort to Pipeline Value
    fireEvent.change(sortSelect, { target: { value: 'pipeline' } });
    expect(screen.getByText('Acme AI Corp')).toBeInTheDocument();

    // Change sort to Leads
    fireEvent.change(sortSelect, { target: { value: 'leads' } });
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
