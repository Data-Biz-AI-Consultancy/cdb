import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignalCard } from './SignalCard';
import { DetectedSignal } from '../types';

const mockSignal: DetectedSignal = {
  id: 'sig-test-1',
  signal_id: 'dormant_strategic_accounts',
  company_id: 'comp-100',
  company_name: 'Acme Global',
  status: 'active',
  severity: 'high',
  score: 85,
  priority_score: 85,
  priority_tier: 'P1',
  effective_polarity: 'risk',
  priority_breakdown: {
    account_importance_score: 25,
    relationship_context_score: 18,
    urgency_score: 22,
    business_impact_score: 20,
    total_score: 85,
    priority_tier: 'P1',
    effective_polarity: 'risk',
    impact_rationale: 'Strategic Tier 1 client with no logged executive touchpoints for 105 days.',
  },
  title: 'Strategic Account Dormancy Warning',
  summary: '105 days without executive contact.',
  detected_at: '2026-09-20T10:00:00Z',
  created_at: '2026-09-20T10:00:00Z',
  updated_at: '2026-09-20T10:00:00Z',
  signal: {
    id: 'dormant_strategic_accounts',
    name: 'Dormant Strategic Accounts',
    category: 'risk',
    target_entity: 'company',
    severity: 'high',
    detection_mechanism: 'cadence',
    business_interpretation: 'Identifies high value accounts going cold.',
    parameters: {},
    recommended_action: { playbook: 'reengagement', title: 'Executive Check-in' },
    icon: '🏢',
    is_active: true,
  },
  connected_persons: [
    {
      id: 'person-1',
      name: 'Jane Doe',
      role: 'VP Technology',
      primary_email: 'jane@acme.com',
    },
  ],
  suggested_persons: [
    {
      person_id: 'person-2',
      name: 'John Smith',
      role: 'Director of Procurement',
      confidence: 0.92,
    },
  ],
};

describe('SignalCard component', () => {
  it('renders signal title, summary, priority badge, and impact breakdown drivers', () => {
    render(
      <SignalCard
        sig={mockSignal}
        columnVariant="risk"
        isSelected={false}
        actionInProgress={null}
        onToggleSelect={vi.fn()}
        onAcknowledge={vi.fn()}
        onOpenActionModal={vi.fn()}
        onLinkPerson={vi.fn()}
        onUnlinkPerson={vi.fn()}
      />
    );

    expect(screen.getByText('Strategic Account Dormancy Warning')).toBeInTheDocument();
    expect(screen.getByText('105 days without executive contact.')).toBeInTheDocument();
    expect(screen.getByText(/P1 • High Risk/i)).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText(/Director of Procurement/i)).toBeInTheDocument();
  });

  it('triggers onToggleSelect when selection checkbox is clicked', () => {
    const onToggleSelect = vi.fn();
    render(
      <SignalCard
        sig={mockSignal}
        columnVariant="risk"
        isSelected={false}
        actionInProgress={null}
        onToggleSelect={onToggleSelect}
        onAcknowledge={vi.fn()}
        onOpenActionModal={vi.fn()}
        onLinkPerson={vi.fn()}
        onUnlinkPerson={vi.fn()}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onToggleSelect).toHaveBeenCalledWith('sig-test-1');
  });

  it('triggers onAcknowledge and onOpenActionModal with respective action types', () => {
    const onAcknowledge = vi.fn();
    const onOpenActionModal = vi.fn();

    render(
      <SignalCard
        sig={mockSignal}
        columnVariant="risk"
        isSelected={false}
        actionInProgress={null}
        onToggleSelect={vi.fn()}
        onAcknowledge={onAcknowledge}
        onOpenActionModal={onOpenActionModal}
        onLinkPerson={vi.fn()}
        onUnlinkPerson={vi.fn()}
      />
    );

    const ackBtn = screen.getByRole('button', { name: /Acknowledge/i });
    fireEvent.click(ackBtn);
    expect(onAcknowledge).toHaveBeenCalledWith('sig-test-1');

    const actBtn = screen.getByRole('button', { name: /Take Action/i });
    fireEvent.click(actBtn);
    expect(onOpenActionModal).toHaveBeenCalledWith(mockSignal, 'actioned');

    const snoozeBtn = screen.getByRole('button', { name: /Snooze/i });
    fireEvent.click(snoozeBtn);
    expect(onOpenActionModal).toHaveBeenCalledWith(mockSignal, 'snoozed');

    const dismissBtn = screen.getByRole('button', { name: /Dismiss/i });
    fireEvent.click(dismissBtn);
    expect(onOpenActionModal).toHaveBeenCalledWith(mockSignal, 'dismissed');
  });

  it('triggers onLinkPerson when clicking on suggested person button', () => {
    const onLinkPerson = vi.fn();
    render(
      <SignalCard
        sig={mockSignal}
        columnVariant="risk"
        isSelected={false}
        actionInProgress={null}
        onToggleSelect={vi.fn()}
        onAcknowledge={vi.fn()}
        onOpenActionModal={vi.fn()}
        onLinkPerson={onLinkPerson}
        onUnlinkPerson={vi.fn()}
      />
    );

    const addBtn = screen.getByRole('button', { name: /John Smith/i });
    fireEvent.click(addBtn);
    expect(onLinkPerson).toHaveBeenCalledWith('sig-test-1', 'person-2', 'Director of Procurement');
  });
});
