import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePersonDetail } from './usePersonDetail';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockPerson = {
  id: 'pers-123',
  first_name: 'Jane',
  last_name: 'Doe',
  primary_email: 'jane@example.com',
  created_at: '2026-09-20T10:00:00Z',
  updated_at: '2026-09-20T10:00:00Z',
};

describe('usePersonDetail hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches person detail and related records', async () => {
    const showSuccess = vi.fn();
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/v1/persons/pers-123') {
        return Promise.resolve(mockPerson);
      }
      if (url.includes('/timeline')) return Promise.resolve({ items: [] });
      if (url.includes('/relationships/companies')) return Promise.resolve({ items: [] });
      if (url.includes('/opportunities')) return Promise.resolve({ items: [] });
      if (url.includes('/leads')) return Promise.resolve({ items: [] });
      if (url.includes('/history')) return Promise.resolve({ items: [] });
      if (url.includes('/companies')) return Promise.resolve({ items: [] });
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => usePersonDetail('pers-123', showSuccess));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.person?.first_name).toBe('Jane');
    });
  });
});
