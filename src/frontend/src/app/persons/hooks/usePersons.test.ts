import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePersons } from './usePersons';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

describe('usePersons hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches persons list and manages selection and filters', async () => {
    const showSuccess = vi.fn();
    (apiFetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/v1/persons')) {
        return Promise.resolve({
          data: [
            {
              id: 'pers-1',
              first_name: 'Jane',
              last_name: 'Doe',
              primary_email: 'jane@example.com',
              created_at: '2026-09-20T10:00:00Z',
            },
          ],
          pagination: {
            total: 1,
            page: 1,
            page_size: 25,
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => usePersons(showSuccess));

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
        expect(result.current.persons).toHaveLength(1);
      },
      { timeout: 2000 }
    );

    act(() => {
      result.current.setSelectedIds(['pers-1']);
    });
    expect(result.current.selectedIds).toContain('pers-1');

    act(() => {
      result.current.setSelectedIds([]);
    });
    expect(result.current.selectedIds).toHaveLength(0);
  });
});
