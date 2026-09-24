import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useActivities } from './useActivities';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockActivitiesData = {
  data: [
    {
      id: 'act-1',
      activity_type: 'meeting',
      subject: 'Discovery Call',
      description: 'Discussed initial scope',
      occurred_at: '2026-09-20T10:00:00Z',
      direction: 'inbound',
      is_pinned: false,
      created_at: '2026-09-20T10:00:00Z',
    },
  ],
  pagination: {
    total: 1,
    page: 1,
    page_size: 20,
  },
};

describe('useActivities hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches activities, statistics, and entities successfully', async () => {
    const showSuccess = vi.fn();
    (apiFetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/v1/activities/stats')) {
        return Promise.resolve({
          data: {
            total: 10,
            this_month: 3,
            this_week: 1,
            by_type: { meeting: 5, call: 5 },
            pinned: 2,
          },
        });
      }
      if (url.includes('/api/v1/activities')) {
        return Promise.resolve(mockActivitiesData);
      }
      if (url.includes('/api/v1/companies')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/api/v1/persons')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/api/v1/opportunities')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useActivities(showSuccess));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.activities).toHaveLength(1);
      expect(result.current.stats?.total).toBe(10);
    });

    act(() => {
      result.current.setTypeFilter('meeting');
      result.current.setSearchQuery('Scope');
    });

    expect(result.current.typeFilter).toBe('meeting');
    expect(result.current.searchQuery).toBe('Scope');
  });
});
