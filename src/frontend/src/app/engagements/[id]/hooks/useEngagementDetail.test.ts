import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEngagementDetail } from './useEngagementDetail';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockEngagementDetail = {
  id: 'eng-123',
  title: 'Security Audit Retainer',
  company_id: 'comp-123',
  status: 'active',
  created_at: '2026-09-20T10:00:00Z',
  updated_at: '2026-09-20T10:00:00Z',
};

describe('useEngagementDetail hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches engagement detail, activities, and linked contacts', async () => {
    const showSuccess = vi.fn();
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/v1/engagements/eng-123') {
        return Promise.resolve(mockEngagementDetail);
      }
      if (url.includes('/activities')) return Promise.resolve({ items: [] });
      if (url.includes('/stakeholders')) return Promise.resolve({ items: [] });
      if (url.includes('/persons')) return Promise.resolve({ items: [] });
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useEngagementDetail('eng-123', showSuccess));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.engagement?.title).toBe('Security Audit Retainer');
    });
  });
});
