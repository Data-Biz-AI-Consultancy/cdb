import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';
import * as api from '@/lib/api';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockReset();
  });

  it('renders login form with inputs and submit button', () => {
    render(<LoginPage />);

    expect(screen.getByText('CDB Login')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('handles successful login and redirects to / (Overview)', async () => {
    vi.spyOn(api, 'apiFetch').mockResolvedValueOnce({ access_token: 'valid-jwt-token' });
    const setAuthTokenSpy = vi.spyOn(api, 'setAuthToken');

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(setAuthTokenSpy).toHaveBeenCalledWith('valid-jwt-token');
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('displays error banner when authentication fails', async () => {
    vi.spyOn(api, 'apiFetch').mockRejectedValueOnce(new Error('Invalid email or password'));

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });
});
