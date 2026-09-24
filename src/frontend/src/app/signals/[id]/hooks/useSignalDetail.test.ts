import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSignalDetail } from './useSignalDetail';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockSignal = {
  id: 'sig-123',
  title: 'Executive Sponsor Left Account',
  severity: 'high',
  status: 'active',
  created_at: '2026-09-20T10:00:00Z',
  updated_at: '2026-09-20T10:00:00Z',
};

describe('useSignalDetail hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches signal detail and manages action modal state', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/v1/signals/detected/sig-123') {
        return Promise.resolve(mockSignal);
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useSignalDetail('sig-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.signal?.title).toBe('Executive Sponsor Left Account');
    });

    act(() => {
      result.current.handleOpenActionModal('snoozed');
    });

    expect(result.current.actionModalOpen).toBe(true);
    expect(result.current.actionType).toBe('snoozed');

    act(() => {
      result.current.handleCloseActionModal();
    });

    expect(result.current.actionModalOpen).toBe(false);
    expect(result.current.actionType).toBe(null);
  });
});
