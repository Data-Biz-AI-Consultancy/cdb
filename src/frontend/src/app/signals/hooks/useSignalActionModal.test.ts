import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSignalActionModal } from './useSignalActionModal';
import { DetectedSignal } from '../types';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/lib/api';

const mockSignal: DetectedSignal = {
  id: 'sig-100',
  signal_id: 'dormant_strategic_accounts',
  company_name: 'Acme Corp',
  status: 'active',
  severity: 'high',
  title: 'Dormant Alert',
  detected_at: '2026-09-01T10:00:00Z',
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-01T10:00:00Z',
  owner_id: 'u-1',
};

describe('useSignalActionModal hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens and closes action modal properly', () => {
    const setSignals = vi.fn();
    const setActionInProgress = vi.fn();

    const { result } = renderHook(() => useSignalActionModal(setSignals, setActionInProgress));

    expect(result.current.modalSignal).toBeNull();
    expect(result.current.modalActionType).toBeNull();

    act(() => {
      result.current.handleOpenActionModal(mockSignal, 'actioned');
    });

    expect(result.current.modalSignal).toEqual(mockSignal);
    expect(result.current.modalActionType).toBe('actioned');

    act(() => {
      result.current.handleCloseActionModal();
    });

    expect(result.current.modalSignal).toBeNull();
    expect(result.current.modalActionType).toBeNull();
  });

  it('handles owner assignment save', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ...mockSignal,
      owner_id: 'u-99',
    });

    const setSignals = vi.fn();
    const setActionInProgress = vi.fn();

    const { result } = renderHook(() => useSignalActionModal(setSignals, setActionInProgress));

    act(() => {
      result.current.handleOpenActionModal(mockSignal, 'assign');
      result.current.setAssignedOwnerId('u-99');
    });

    await act(async () => {
      await result.current.handleSaveModalAction();
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/signals/detected/sig-100/assign',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ owner_id: 'u-99' }),
      })
    );
    expect(setSignals).toHaveBeenCalled();
  });

  it('handles escalation save', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ...mockSignal,
      is_escalated: true,
      escalation_level: 'critical',
    });

    const setSignals = vi.fn();
    const setActionInProgress = vi.fn();

    const { result } = renderHook(() => useSignalActionModal(setSignals, setActionInProgress));

    act(() => {
      result.current.handleOpenActionModal(mockSignal, 'escalate');
      result.current.setEscalationLevel('critical');
      result.current.setEscalationReason('Contract churn imminent');
    });

    await act(async () => {
      await result.current.handleSaveModalAction();
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/signals/detected/sig-100/escalate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          escalation_level: 'critical',
          reason: 'Contract churn imminent',
        }),
      })
    );
  });

  it('handles deal creation save', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      success: true,
      workflow_type: 'opportunity',
      routed_entity_id: 'opp-1',
      signal: { ...mockSignal, status: 'actioned', routed_opportunity_id: 'opp-1' },
    });

    const setSignals = vi.fn();
    const setActionInProgress = vi.fn();

    const { result } = renderHook(() => useSignalActionModal(setSignals, setActionInProgress));

    act(() => {
      result.current.handleOpenActionModal(mockSignal, 'create_opportunity');
      result.current.setOppTitle('Acme Expansion Deal');
      result.current.setOppValue(100000);
    });

    await act(async () => {
      await result.current.handleSaveModalAction();
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/signals/detected/sig-100/create-opportunity',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Acme Expansion Deal'),
      })
    );
  });
});
