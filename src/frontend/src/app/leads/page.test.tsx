import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LeadsPage from './page';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

describe('LeadsPage Component', () => {
  const mockLeadsResponse = {
    data: [
      {
        id: 'lead-1',
        person_id: 'person-1',
        person_name: 'Abdul Reyyan',
        person_email: 'abdul@example.com',
        company_id: 'comp-1',
        company_name: 'Data Biz Consulting',
        stage: 'new',
        source: 'linkedin_message',
        intent: 'networking_inquiry',
        signal_strength: 'medium',
        description: 'LinkedIn Conversation Summary (3 messages):\nAbdul: Congrats on the new role!\nJimmy: Thanks',
        notes: 'LinkedIn Conversation Summary (3 messages):\nAbdul: Congrats on the new role!\nJimmy: Thanks',
        created_at: '2026-08-07T22:01:31Z',
        updated_at: '2026-08-07T22:01:31Z',
      },
      {
        id: 'lead-2',
        person_id: 'person-2',
        person_name: 'Matthieu Carmeille',
        person_email: 'matthieu@example.com',
        company_id: null,
        company_name: null,
        stage: 'qualified',
        source: 'linkedin_message',
        intent: 'business_collaboration',
        signal_strength: 'strong',
        description: 'Interested in AI Strategy consulting for Q4 rollout.',
        notes: 'Interested in AI Strategy consulting for Q4 rollout.',
        created_at: '2026-08-06T15:30:00Z',
        updated_at: '2026-08-06T15:30:00Z',
      },
    ],
    pagination: {
      total: 2,
      has_more: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.apiFetch as any).mockResolvedValue(mockLeadsResponse);
  });

  it('renders leads list with contacts, descriptions, stages, and metrics', async () => {
    render(<LeadsPage />);

    await waitFor(() => {
      expect(screen.getByText('Abdul Reyyan')).toBeInTheDocument();
      expect(screen.getByText('Matthieu Carmeille')).toBeInTheDocument();
      expect(screen.getByText('Data Biz Consulting')).toBeInTheDocument();
    });

    // Check independent Intent column
    expect(screen.getByText(/Networking Inquiry/i)).toBeInTheDocument();
    expect(screen.getByText(/Business Collaboration/i)).toBeInTheDocument();

    // Check Description & Summary
    expect(screen.getByText(/LinkedIn Conversation Summary/)).toBeInTheDocument();
    expect(screen.getByText(/Interested in AI Strategy consulting/)).toBeInTheDocument();
    expect(screen.getAllByText(/Most Recent/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Showing/i)).toHaveTextContent('Showing 1 to 2 of 2 leads');

    // Check Created and Updated timestamps
    expect(screen.getAllByText(/Created:/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Updated:/i).length).toBeGreaterThanOrEqual(2);
  });

  it('handles page navigation and page size updates', async () => {
    (api.apiFetch as any).mockResolvedValue({
      data: mockLeadsResponse.data,
      pagination: {
        total: 100,
        page: 1,
        page_size: 25,
        has_more: true,
      },
    });

    render(<LeadsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Showing/i)).toHaveTextContent('Showing 1 to 25 of 100 leads');
      expect(screen.getByText('Page 1 of 4')).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole('button', { name: /^Next$/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith(expect.stringContaining('page=2'));
    });
  });

  it('filters by stage when selecting quick filter pills', async () => {
    render(<LeadsPage />);

    await waitFor(() => {
      expect(screen.getByText('Abdul Reyyan')).toBeInTheDocument();
    });

    const newStagePill = screen.getByRole('button', { name: /^New$/i });
    fireEvent.click(newStagePill);

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith(expect.stringContaining('stage=new'));
    });
  });

  it('opens convert to opportunity modal and submits successfully', async () => {
    render(<LeadsPage />);

    await waitFor(() => {
      expect(screen.getByText('Abdul Reyyan')).toBeInTheDocument();
    });

    const convertButtons = screen.getAllByRole('button', { name: /Convert to Opp/i });
    fireEvent.click(convertButtons[0]);

    expect(screen.getByText(/Convert Lead to Opportunity/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Abdul Reyyan/i)).toBeInTheDocument();

    (api.apiFetch as any).mockResolvedValueOnce({ status: 'success' });
    const submitBtn = screen.getByRole('button', { name: /Create Opportunity Deal/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/leads/lead-1/convert'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('selects leads and performs bulk edit successfully', async () => {
    render(<LeadsPage />);

    await waitFor(() => {
      expect(screen.getByText('Abdul Reyyan')).toBeInTheDocument();
    });

    // Check individual checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // lead 1 checkbox

    expect(screen.getByText('1 Selected')).toBeInTheDocument();

    const bulkEditBtn = screen.getByRole('button', { name: /Edit Attributes/i });
    fireEvent.click(bulkEditBtn);

    expect(screen.getByText(/Bulk Edit Lead Attributes \(1 selected\)/i)).toBeInTheDocument();

    (api.apiFetch as any).mockResolvedValueOnce({
      success: true,
      updated_count: 1,
      affected_ids: ['lead-1'],
      message: 'Successfully bulk updated 1 leads.',
    });

    const submitBulkBtn = screen.getByRole('button', { name: /Update 1 Leads/i });
    fireEvent.click(submitBulkBtn);

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith(
        '/api/v1/leads/bulk-update',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"lead_ids":["lead-1"]'),
        })
      );
    });
  });

  it('selects leads and performs bulk convert to opportunity', async () => {
    render(<LeadsPage />);

    await waitFor(() => {
      expect(screen.getByText('Abdul Reyyan')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // lead 1 checkbox

    expect(screen.getByText('1 Selected')).toBeInTheDocument();

    const bulkConvertBtn = screen.getByRole('button', { name: /Bulk Convert to Opp/i });
    fireEvent.click(bulkConvertBtn);

    expect(screen.getByText(/Bulk Convert to Opportunity \(1 leads\)/i)).toBeInTheDocument();

    (api.apiFetch as any).mockResolvedValueOnce({
      success: true,
      updated_count: 1,
      affected_ids: ['lead-1'],
      message: 'Successfully converted 1 leads to opportunities.',
    });

    const submitBulkConvertBtn = screen.getByRole('button', { name: /Convert 1 Leads to Opps/i });
    fireEvent.click(submitBulkConvertBtn);

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith(
        '/api/v1/leads/bulk-convert',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"lead_ids":["lead-1"]'),
        })
      );
    });
  });

  it('selects leads and performs bulk reject/disqualify', async () => {
    render(<LeadsPage />);

    await waitFor(() => {
      expect(screen.getByText('Abdul Reyyan')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // lead 1 checkbox

    const bulkRejectBtn = screen.getByRole('button', { name: /Bulk Reject \/ Disqualify/i });
    fireEvent.click(bulkRejectBtn);

    expect(screen.getByText(/Bulk Reject \/ Disqualify \(1 leads\)/i)).toBeInTheDocument();

    (api.apiFetch as any).mockResolvedValueOnce({
      success: true,
      updated_count: 1,
      affected_ids: ['lead-1'],
      message: 'Successfully rejected 1 leads.',
    });

    const submitBulkRejectBtn = screen.getByRole('button', { name: /Reject & Disqualify 1 Leads/i });
    fireEvent.click(submitBulkRejectBtn);

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith(
        '/api/v1/leads/bulk-disqualify',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"lead_ids":["lead-1"]'),
        })
      );
    });
  });

  it('selects all leads and triggers bulk delete', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<LeadsPage />);

    await waitFor(() => {
      expect(screen.getByText('Abdul Reyyan')).toBeInTheDocument();
    });

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    expect(screen.getByText('2 Selected')).toBeInTheDocument();

    (api.apiFetch as any).mockResolvedValueOnce({
      success: true,
      updated_count: 2,
      affected_ids: ['lead-1', 'lead-2'],
      message: 'Successfully deleted 2 leads.',
    });

    const bulkDeleteBtn = screen.getByTitle(/Permanently remove selected leads/i);
    fireEvent.click(bulkDeleteBtn);

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith(
        '/api/v1/leads/bulk-delete',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"lead_ids":["lead-1","lead-2"]'),
        })
      );
    });
  });
});
