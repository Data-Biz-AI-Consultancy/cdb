import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserSelect from './UserSelect';
import * as api from '@/lib/api';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    fetchUsers: vi.fn(),
  };
});

describe('UserSelect', () => {
  const mockUsers = [
    {
      id: 'usr-1',
      email: 'alice@example.com',
      full_name: 'Alice Smith',
      role: 'ae',
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'usr-2',
      email: 'bob@example.com',
      full_name: 'Bob Jones',
      role: 'sdr',
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ];

  beforeEach(() => {
    vi.mocked(api.fetchUsers).mockResolvedValue({
      items: mockUsers,
      total: 2,
      page: 1,
      page_size: 100,
    });
  });

  it('renders dropdown and loads team members', async () => {
    const handleChange = vi.fn();
    render(<UserSelect value="" onChange={handleChange} label="Assign Owner" />);

    expect(screen.getByText('Assign Owner')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Alice Smith \(alice@example.com\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Bob Jones \(bob@example.com\)/i)).toBeInTheDocument();
    });
  });

  it('calls onChange when selection changes', async () => {
    const handleChange = vi.fn();
    render(<UserSelect value="" onChange={handleChange} />);

    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'usr-1' } });

    expect(handleChange).toHaveBeenCalledWith('usr-1', mockUsers[0]);
  });
});
