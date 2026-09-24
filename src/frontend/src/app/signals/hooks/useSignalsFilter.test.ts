import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSignalsFilter } from './useSignalsFilter';
import { DetectedSignal, SignalDefinition } from '../types';

let mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

const mockCatalog: SignalDefinition[] = [
  {
    id: 'dormant_strategic_accounts',
    name: 'Dormant Strategic Accounts',
    category: 'risk',
    target_entity: 'company',
    severity: 'high',
    detection_mechanism: 'temporal_cadence',
    business_interpretation: 'Identifies accounts with no logged interactions.',
    parameters: { cadence_days: 90 },
    recommended_action: { playbook: 'executive_reengagement' },
    is_active: true,
  },
  {
    id: 'hiring_expansion',
    name: 'Hiring Expansion',
    category: 'opportunity',
    target_entity: 'company',
    severity: 'medium',
    detection_mechanism: 'text_pattern',
    business_interpretation: 'Identifies hiring expansion.',
    parameters: {},
    recommended_action: {},
    is_active: true,
  },
];

const mockSignals: DetectedSignal[] = [
  {
    id: 'sig-1',
    signal_id: 'dormant_strategic_accounts',
    company_name: 'Acme Corp',
    company_id: 'c-1',
    category: 'risk',
    status: 'active',
    severity: 'high',
    title: 'Dormant Alert',
    summary: 'No touchpoints',
    detected_at: '2026-09-01T10:00:00Z',
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    has_conflict: false,
    confidence_score: 0.9,
    owner_id: 'u-1',
  },
  {
    id: 'sig-2',
    signal_id: 'hiring_expansion',
    company_name: 'Beta Inc',
    company_id: 'c-2',
    category: 'opportunity',
    status: 'active',
    severity: 'medium',
    title: 'Hiring Alert',
    summary: 'Expanding team',
    detected_at: '2026-09-02T10:00:00Z',
    created_at: '2026-09-02T10:00:00Z',
    updated_at: '2026-09-02T10:00:00Z',
    has_conflict: false,
    confidence_score: 0.4,
    owner_id: null,
  },
  {
    id: 'sig-3',
    signal_id: 'mixed_signal',
    company_name: 'Gamma LLC',
    company_id: 'c-3',
    category: 'hybrid',
    status: 'active',
    severity: 'critical',
    title: 'Conflicting Signal',
    summary: 'Both growth and churn',
    detected_at: '2026-09-03T10:00:00Z',
    created_at: '2026-09-03T10:00:00Z',
    updated_at: '2026-09-03T10:00:00Z',
    has_conflict: true,
    confidence_score: 0.85,
    is_escalated: true,
    owner_id: 'u-2',
  },
];

describe('useSignalsFilter hook', () => {
  it('initializes with default filters and correctly categorizes feeds', () => {
    const { result } = renderHook(() => useSignalsFilter(mockCatalog, mockSignals));

    expect(result.current.activeTab).toBe('triage');
    expect(result.current.filteredSignals.length).toBe(3);
    expect(result.current.feedOpportunities.length).toBe(1);
    expect(result.current.feedRisks.length).toBe(1);
    expect(result.current.feedHybrids.length).toBe(1);
    expect(result.current.feedConflicts.length).toBe(1);
    expect(result.current.feedUncertain.length).toBe(1);
    expect(result.current.feedEscalated.length).toBe(1);
  });

  it('filters by status, severity, and search query', () => {
    const { result } = renderHook(() => useSignalsFilter(mockCatalog, mockSignals));

    act(() => {
      result.current.setSearchQuery('Beta');
    });
    expect(result.current.filteredSignals.length).toBe(1);
    expect(result.current.filteredSignals[0].company_name).toBe('Beta Inc');

    act(() => {
      result.current.handleResetFilters();
    });
    expect(result.current.filteredSignals.length).toBe(3);

    act(() => {
      result.current.setSeverityFilter('high');
    });
    expect(result.current.filteredSignals.length).toBe(1);
    expect(result.current.filteredSignals[0].id).toBe('sig-1');
  });

  it('filters by owner and unassigned status', () => {
    const { result } = renderHook(() => useSignalsFilter(mockCatalog, mockSignals));

    act(() => {
      result.current.setOwnerFilter('unassigned');
    });
    expect(result.current.filteredSignals.length).toBe(1);
    expect(result.current.filteredSignals[0].id).toBe('sig-2');

    act(() => {
      result.current.setOwnerFilter('u-1');
    });
    expect(result.current.filteredSignals.length).toBe(1);
    expect(result.current.filteredSignals[0].id).toBe('sig-1');
  });

  it('supports selecting and deselecting signal checkboxes', () => {
    const { result } = renderHook(() => useSignalsFilter(mockCatalog, mockSignals));

    act(() => {
      result.current.toggleSelectSignal('sig-1');
    });
    expect(result.current.selectedSignalIds).toEqual(['sig-1']);

    act(() => {
      result.current.toggleSelectSignal('sig-1');
    });
    expect(result.current.selectedSignalIds).toEqual([]);

    act(() => {
      result.current.handleSelectAllInView(mockSignals);
    });
    expect(result.current.selectedSignalIds).toEqual(['sig-1', 'sig-2', 'sig-3']);
  });

  it('drills down signal type and severity', () => {
    const { result } = renderHook(() => useSignalsFilter(mockCatalog, mockSignals));

    act(() => {
      result.current.handleDrilldownSignal('hiring_expansion');
    });
    expect(result.current.activeTab).toBe('triage');
    expect(result.current.signalTypeFilter).toBe('hiring_expansion');

    act(() => {
      result.current.handleDrilldownSeverity('critical');
    });
    expect(result.current.activeTab).toBe('triage');
    expect(result.current.severityFilter).toBe('critical');
  });
});
