import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UsersManagementPage from './page';
import * as api from '@/lib/api';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    fetchUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deactivateUser: vi.fn(),
  };
});

describe('UsersManagementPage', () => {
  const mockUsers = [
    {
      id: 'usr-1',
      email: 'carol.danvers@acme.com',
      full_name: 'Carol Danvers',
      role: 'admin',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'usr-2',
      email: 'tony.stark@acme.com',
      full_name: 'Tony Stark',
      role: 'ae',
      is_active: true,
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    },
    {
      id: 'usr-3',
      email: 'peter.parker@acme.com',
      full_name: 'Peter Parker',
      role: 'sdr',
      is_active: false,
      created_at: '2026-01-03T00:00:00Z',
      updated_at: '2026-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.mocked(api.fetchUsers).mockResolvedValue({
      items: mockUsers,
      total: 3,
      page: 1,
      page_size: 200,
    });
    vi.mocked(api.createUser).mockResolvedValue({
      id: 'usr-4',
      email: 'bruce.wayne@acme.com',
      full_name: 'Bruce Wayne',
      role: 'manager',
      is_active: true,
      created_at: '2026-01-04T00:00:00Z',
      updated_at: '2026-01-04T00:00:00Z',
    });
    vi.mocked(api.deactivateUser).mockResolvedValue({
      message: 'Deactivated',
      id: 'usr-2',
    });
  });

  it('renders user directory and summary cards', async () => {
    render(<UsersManagementPage />);

    expect(screen.getByText('Team Directory & User Management')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Carol Danvers')).toBeInTheDocument();
      expect(screen.getByText('Tony Stark')).toBeInTheDocument();
      expect(screen.getByText('Peter Parker')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Users')).toBeInTheDocument();
  });

  it('filters users by search query', async () => {
    render(<UsersManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Tony Stark')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by name or email/i);
    fireEvent.change(searchInput, { target: { value: 'Danvers' } });

    expect(screen.getByText('Carol Danvers')).toBeInTheDocument();
    expect(screen.queryByText('Tony Stark')).not.toBeInTheDocument();
  });

  it('opens Add Member modal and creates user', async () => {
    render(<UsersManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Carol Danvers')).toBeInTheDocument();
    });

    const addBtn = screen.getByText('+ Add Team Member');
    fireEvent.click(addBtn);

    expect(screen.getByText('Add New Team Member')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/Alex Henderson/i);
    const emailInput = screen.getByPlaceholderText(/alex.henderson@company.com/i);
    const pwdInput = screen.getByPlaceholderText(/At least 6 characters/i);

    fireEvent.change(nameInput, { target: { value: 'Bruce Wayne' } });
    fireEvent.change(emailInput, { target: { value: 'bruce.wayne@acme.com' } });
    fireEvent.change(pwdInput, { target: { value: 'gotham123' } });

    const submitBtn = screen.getByText('Create Member');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createUser).toHaveBeenCalledWith({
        full_name: 'Bruce Wayne',
        email: 'bruce.wayne@acme.com',
        password: 'gotham123',
        role: 'member',
        is_active: true,
      });
    });
  });

  it('handles deactivation of active user', async () => {
    render(<UsersManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Tony Stark')).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByText('Deactivate');
    fireEvent.click(deactivateButtons[0]);

    await waitFor(() => {
      expect(api.deactivateUser).toHaveBeenCalled();
    });
  });
});
