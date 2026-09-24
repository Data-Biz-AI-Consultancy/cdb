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

  it('renders trigger button and loads team members on click', async () => {
    const handleChange = vi.fn();
    render(<UserSelect value="" onChange={handleChange} label="Assign Owner" />);

    expect(screen.getByText('Assign Owner')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Search & select a team member...')).toBeInTheDocument();
    });

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    });
  });

  it('filters team members when typing into search input', async () => {
    const handleChange = vi.fn();
    render(<UserSelect value="" onChange={handleChange} />);

    await waitFor(() => {
      expect(screen.getByText('Search & select a team member...')).toBeInTheDocument();
    });

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Type name or email/i);
    fireEvent.change(searchInput, { target: { value: 'Jones' } });

    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();

    // Select Bob Jones
    fireEvent.click(screen.getByText('Bob Jones'));
    expect(handleChange).toHaveBeenCalledWith('usr-2', mockUsers[1]);
  });

  it('allows unassigning or clearing owner', async () => {
    const handleChange = vi.fn();
    render(<UserSelect value="usr-1" onChange={handleChange} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    const clearBtn = screen.getByTitle('Clear selection');
    fireEvent.click(clearBtn);

    expect(handleChange).toHaveBeenCalledWith('', null);
  });
});
