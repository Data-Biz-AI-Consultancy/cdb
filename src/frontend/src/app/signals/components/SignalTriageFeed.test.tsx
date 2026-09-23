import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignalTriageFeed } from './SignalTriageFeed';
import { DetectedSignal, SignalDefinition } from '../types';

const mockSignals: DetectedSignal[] = [
  {
    id: 'sig-opp-1',
    signal_id: 'expansion_opportunity',
    company_id: 'c1',
    company_name: 'Alpha Growth',
    status: 'active',
    severity: 'high',
    title: 'Expansion Lead',
    detected_at: '2026-09-20T10:00:00Z',
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
  },
  {
    id: 'sig-risk-1',
    signal_id: 'dormant_account',
    company_id: 'c2',
    company_name: 'Beta Corp',
    status: 'active',
    severity: 'critical',
    title: 'Dormancy Alert',
    detected_at: '2026-09-20T10:00:00Z',
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
  },
];

const mockCatalog: SignalDefinition[] = [
  {
    id: 'expansion_opportunity',
    name: 'Expansion Opportunity',
    category: 'opportunity',
    target_entity: 'company',
    severity: 'high',
    detection_mechanism: 'cadence',
    business_interpretation: 'Growth signal',
    parameters: {},
    recommended_action: {},
    is_active: true,
  },
  {
    id: 'dormant_account',
    name: 'Dormant Account',
    category: 'risk',
    target_entity: 'company',
    severity: 'critical',
    detection_mechanism: 'cadence',
    business_interpretation: 'Risk signal',
    parameters: {},
    recommended_action: {},
    is_active: true,
  },
];

describe('SignalTriageFeed component', () => {
  it('renders search input, filter controls, column headers, and signal cards', () => {
    render(
      <SignalTriageFeed
        loading={false}
        viewMode="feed"
        setViewMode={vi.fn()}
        selectedSignalIds={[]}
        setSelectedSignalIds={vi.fn()}
        onBulkAction={vi.fn()}
        searchQuery=""
        setSearchQuery={vi.fn()}
        statusFilter="active"
        setStatusFilter={vi.fn()}
        categoryFilter="all"
        setCategoryFilter={vi.fn()}
        severityFilter="all"
        setSeverityFilter={vi.fn()}
        signalTypeFilter="all"
        setSignalTypeFilter={vi.fn()}
        priorityFilter="all"
        setPriorityFilter={vi.fn()}
        sortBy="priority"
        setSortBy={vi.fn()}
        lookbackDays={90}
        onLookbackChange={vi.fn()}
        onResetFilters={vi.fn()}
        catalog={mockCatalog}
        availableCatalog={mockCatalog}
        filteredSignals={mockSignals}
        opportunitySignals={[mockSignals[0]]}
        hybridSignals={[]}
        riskSignals={[mockSignals[1]]}
        groupedByAccount={[]}
        onToggleSelectAll={vi.fn()}
        onRunEvaluation={vi.fn()}
        renderCard={(sig) => <div key={sig.id} data-testid="card">{sig.title}</div>}
      />
    );

    expect(screen.getByPlaceholderText(/Search signals by entity/i)).toBeInTheDocument();
    expect(screen.getByText('Opportunities')).toBeInTheDocument();
    expect(screen.getByText('Risks')).toBeInTheDocument();
    expect(screen.getByText('Expansion Lead')).toBeInTheDocument();
    expect(screen.getByText('Dormancy Alert')).toBeInTheDocument();
  });

  it('renders bulk action bar when items are selected and fires bulk action', () => {
    const onBulkAction = vi.fn();
    render(
      <SignalTriageFeed
        loading={false}
        viewMode="feed"
        setViewMode={vi.fn()}
        selectedSignalIds={['sig-opp-1']}
        setSelectedSignalIds={vi.fn()}
        onBulkAction={onBulkAction}
        searchQuery=""
        setSearchQuery={vi.fn()}
        statusFilter="active"
        setStatusFilter={vi.fn()}
        categoryFilter="all"
        setCategoryFilter={vi.fn()}
        severityFilter="all"
        setSeverityFilter={vi.fn()}
        signalTypeFilter="all"
        setSignalTypeFilter={vi.fn()}
        priorityFilter="all"
        setPriorityFilter={vi.fn()}
        sortBy="priority"
        setSortBy={vi.fn()}
        lookbackDays={90}
        onLookbackChange={vi.fn()}
        onResetFilters={vi.fn()}
        catalog={mockCatalog}
        availableCatalog={mockCatalog}
        filteredSignals={mockSignals}
        opportunitySignals={[mockSignals[0]]}
        hybridSignals={[]}
        riskSignals={[mockSignals[1]]}
        groupedByAccount={[]}
        onToggleSelectAll={vi.fn()}
        onRunEvaluation={vi.fn()}
        renderCard={(sig) => <div key={sig.id}>{sig.title}</div>}
      />
    );

    expect(screen.getByText(/1 signal\(s\) selected/i)).toBeInTheDocument();
    const resolveBulkBtn = screen.getByRole('button', { name: /Resolve Selected/i });
    fireEvent.click(resolveBulkBtn);
    expect(onBulkAction).toHaveBeenCalledWith('resolved');
  });

  it('triggers filter updates when inputs change', () => {
    const setSearchQuery = vi.fn();

    render(
      <SignalTriageFeed
        loading={false}
        viewMode="feed"
        setViewMode={vi.fn()}
        selectedSignalIds={[]}
        setSelectedSignalIds={vi.fn()}
        onBulkAction={vi.fn()}
        searchQuery=""
        setSearchQuery={setSearchQuery}
        statusFilter="active"
        setStatusFilter={vi.fn()}
        categoryFilter="all"
        setCategoryFilter={vi.fn()}
        severityFilter="all"
        setSeverityFilter={vi.fn()}
        signalTypeFilter="all"
        setSignalTypeFilter={vi.fn()}
        priorityFilter="all"
        setPriorityFilter={vi.fn()}
        sortBy="priority"
        setSortBy={vi.fn()}
        lookbackDays={90}
        onLookbackChange={vi.fn()}
        onResetFilters={vi.fn()}
        catalog={mockCatalog}
        availableCatalog={mockCatalog}
        filteredSignals={mockSignals}
        opportunitySignals={[mockSignals[0]]}
        hybridSignals={[]}
        riskSignals={[mockSignals[1]]}
        groupedByAccount={[]}
        onToggleSelectAll={vi.fn()}
        onRunEvaluation={vi.fn()}
        renderCard={(sig) => <div key={sig.id}>{sig.title}</div>}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search signals by entity/i);
    fireEvent.change(searchInput, { target: { value: 'Acme' } });
    expect(setSearchQuery).toHaveBeenCalledWith('Acme');
  });
});
