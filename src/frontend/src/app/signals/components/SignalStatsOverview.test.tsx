import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignalStatsOverview } from './SignalStatsOverview';
import { DetectedSignalStatsResponse, DetectedSignal } from '../types';

const mockStats: DetectedSignalStatsResponse = {
  total_active: 45,
  total_snoozed: 5,
  total_conflicting: 2,
  total_uncertain: 3,
  by_severity: { critical: 10, high: 20, medium: 12, low: 3 },
  by_category: { opportunity: 15, risk: 25, hybrid: 5 },
  by_signal: {},
  by_status: { active: 45 },
};

const mockSignals: DetectedSignal[] = [
  {
    id: 's1',
    signal_id: 'dormant_strategic_accounts',
    company_name: 'Acme Corp',
    status: 'active',
    severity: 'high',
    title: 'Dormant Account',
    detected_at: '2026-09-20T10:00:00Z',
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
  },
];

describe('SignalStatsOverview component', () => {
  it('renders header, quick severity pills, and tabs', () => {
    render(
      <SignalStatsOverview
        stats={mockStats}
        signals={mockSignals}
        metrics={null}
        catalog={[]}
        evaluating={false}
        evaluationBanner="Radar sweep completed"
        activeTab="triage"
        severityFilter="all"
        onRunEvaluation={vi.fn()}
        onDismissBanner={vi.fn()}
        onSetSeverityFilter={vi.fn()}
        onSelectTab={vi.fn()}
      />
    );

    expect(screen.getByText('Opportunity & Risk Signals Radar')).toBeInTheDocument();
    expect(screen.getByText('Radar sweep completed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run Signal Detection/i })).toBeInTheDocument();
  });

  it('triggers onRunEvaluation when clicking Run Signal Detection button', () => {
    const onRunEvaluation = vi.fn();
    render(
      <SignalStatsOverview
        stats={mockStats}
        signals={mockSignals}
        metrics={null}
        catalog={[]}
        evaluating={false}
        evaluationBanner={null}
        activeTab="triage"
        severityFilter="all"
        onRunEvaluation={onRunEvaluation}
        onDismissBanner={vi.fn()}
        onSetSeverityFilter={vi.fn()}
        onSelectTab={vi.fn()}
      />
    );

    const btn = screen.getByRole('button', { name: /Run Signal Detection/i });
    fireEvent.click(btn);
    expect(onRunEvaluation).toHaveBeenCalled();
  });

  it('triggers onSetSeverityFilter when clicking quick severity pills', () => {
    const onSetSeverityFilter = vi.fn();
    render(
      <SignalStatsOverview
        stats={mockStats}
        signals={mockSignals}
        metrics={null}
        catalog={[]}
        evaluating={false}
        evaluationBanner={null}
        activeTab="triage"
        severityFilter="all"
        onRunEvaluation={vi.fn()}
        onDismissBanner={vi.fn()}
        onSetSeverityFilter={onSetSeverityFilter}
        onSelectTab={vi.fn()}
      />
    );

    const highPill = screen.getByRole('button', { name: /High \(20\)/i });
    fireEvent.click(highPill);
    expect(onSetSeverityFilter).toHaveBeenCalledWith('high');
  });

  it('triggers onSelectTab when switching tabs', () => {
    const onSelectTab = vi.fn();
    render(
      <SignalStatsOverview
        stats={mockStats}
        signals={mockSignals}
        metrics={null}
        catalog={[]}
        evaluating={false}
        evaluationBanner={null}
        activeTab="triage"
        severityFilter="all"
        onRunEvaluation={vi.fn()}
        onDismissBanner={vi.fn()}
        onSetSeverityFilter={vi.fn()}
        onSelectTab={onSelectTab}
      />
    );

    const metricsTabBtn = screen.getByRole('button', { name: /Success & Quality Metrics/i });
    fireEvent.click(metricsTabBtn);
    expect(onSelectTab).toHaveBeenCalledWith('metrics');
  });
});
