import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEngagements } from './useEngagements';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockEngagement = {
  id: 'eng-1',
  company_id: 'comp-1',
  title: 'Cloud Architecture Retainer',
  status: 'active',
  type: 'retainer',
  total_value: 50000,
  health_status: 'on_track',
  created_at: '2026-09-20T10:00:00Z',
  updated_at: '2026-09-20T10:00:00Z',
};

describe('useEngagements hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches engagements list and computes summary metrics', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/v1/engagements')) {
        return Promise.resolve({ data: [mockEngagement] });
      }
      if (url.includes('/api/v1/companies')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/api/v1/persons')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useEngagements());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.engagements).toHaveLength(1);
      expect(result.current.activeCount).toBe(1);
      expect(result.current.totalValue).toBe(50000);
      expect(result.current.onTrackCount).toBe(1);
    });

    act(() => {
      result.current.setSearchQuery('Cloud');
    });
    expect(result.current.filtered).toHaveLength(1);

    act(() => {
      result.current.setSearchQuery('NonExistent');
    });
    expect(result.current.filtered).toHaveLength(0);
  });
});
