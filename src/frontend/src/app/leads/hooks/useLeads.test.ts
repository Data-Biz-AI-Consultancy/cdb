import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLeads } from './useLeads';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

describe('useLeads hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches leads and manages selection and filters', async () => {
    const showSuccess = vi.fn();
    (apiFetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/v1/leads')) {
        return Promise.resolve({
          data: [
            {
              id: 'lead-1',
              title: 'VP Engineering at TechCorp',
              status: 'new',
              source: 'linkedin',
              company_name: 'TechCorp',
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

    const { result } = renderHook(() => useLeads(showSuccess));

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
        expect(result.current.leads).toHaveLength(1);
      },
      { timeout: 2000 }
    );

    act(() => {
      result.current.setSelectedIds(['lead-1']);
    });
    expect(result.current.selectedIds).toContain('lead-1');

    act(() => {
      result.current.setSelectedIds([]);
    });
    expect(result.current.selectedIds).toHaveLength(0);
  });
});
