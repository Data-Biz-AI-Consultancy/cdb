import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignalActionModal } from './SignalActionModal';
import { DetectedSignal } from '../types';

vi.mock('@/components/UserSelect', () => ({
  default: ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) => (
    <div>
      {label && <label>{label}</label>}
      <select
        data-testid="user-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Unassigned</option>
        <option value="user-123">User 123</option>
        <option value="user-456">User 456</option>
      </select>
    </div>
  ),
}));

const mockSignal: DetectedSignal = {
  id: 'sig-modal-1',
  signal_id: 'dormant_strategic_accounts',
  company_name: 'Acme Corp',
  status: 'active',
  severity: 'high',
  title: 'Dormant Account Alert',
  detected_at: '2026-09-20T10:00:00Z',
  created_at: '2026-09-20T10:00:00Z',
  updated_at: '2026-09-20T10:00:00Z',
};

describe('SignalActionModal component', () => {
  it('renders nothing when modalSignal or modalActionType is null', () => {
    const { container } = render(
      <SignalActionModal
        modalSignal={null}
        modalActionType={null}
        actionInProgress={null}
        resolutionNotes=""
        dismissalReason="Not Relevant"
        snoozeDays={14}
        customSnoozeDate=""
        onClose={vi.fn()}
        onSave={vi.fn()}
        setResolutionNotes={vi.fn()}
        setDismissalReason={vi.fn()}
        setSnoozeDays={vi.fn()}
        setCustomSnoozeDate={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders actioned modal correctly with action notes input', () => {
    const setResolutionNotes = vi.fn();
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <SignalActionModal
        modalSignal={mockSignal}
        modalActionType="actioned"
        actionInProgress={null}
        resolutionNotes=""
        dismissalReason="Not Relevant"
        snoozeDays={14}
        customSnoozeDate=""
        onClose={onClose}
        onSave={onSave}
        setResolutionNotes={setResolutionNotes}
        setDismissalReason={vi.fn()}
        setSnoozeDays={vi.fn()}
        setCustomSnoozeDate={vi.fn()}
      />
    );

    expect(screen.getByText('Record Taken Action')).toBeInTheDocument();
    expect(screen.getByText('Mark as Actioned')).toBeInTheDocument();

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Sent outreach email' } });
    expect(setResolutionNotes).toHaveBeenCalledWith('Sent outreach email');

    const saveBtn = screen.getByText('Mark as Actioned');
    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalled();

    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders snoozed modal with quick snooze day buttons', () => {
    const setSnoozeDays = vi.fn();

    render(
      <SignalActionModal
        modalSignal={mockSignal}
        modalActionType="snoozed"
        actionInProgress={null}
        resolutionNotes=""
        dismissalReason="Not Relevant"
        snoozeDays={14}
        customSnoozeDate=""
        onClose={vi.fn()}
        onSave={vi.fn()}
        setResolutionNotes={vi.fn()}
        setDismissalReason={vi.fn()}
        setSnoozeDays={setSnoozeDays}
        setCustomSnoozeDate={vi.fn()}
      />
    );

    expect(screen.getByText(/Snooze Signal Alert/i)).toBeInTheDocument();
    const btn30d = screen.getByText('30 Days');
    fireEvent.click(btn30d);
    expect(setSnoozeDays).toHaveBeenCalledWith(30);
  });

  it('renders dismissed modal with reason select dropdown', () => {
    const setDismissalReason = vi.fn();

    render(
      <SignalActionModal
        modalSignal={mockSignal}
        modalActionType="dismissed"
        actionInProgress={null}
        resolutionNotes=""
        dismissalReason="Not Relevant"
        snoozeDays={14}
        customSnoozeDate=""
        onClose={vi.fn()}
        onSave={vi.fn()}
        setResolutionNotes={vi.fn()}
        setDismissalReason={setDismissalReason}
        setSnoozeDays={vi.fn()}
        setCustomSnoozeDate={vi.fn()}
      />
    );

    expect(screen.getByText('Dismiss Signal')).toBeInTheDocument();
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'False Positive' } });
    expect(setDismissalReason).toHaveBeenCalledWith('False Positive');
  });

  it('renders false_positive modal with reason select, notes, and auto-dismiss toggle', () => {
    const setFeedbackReason = vi.fn();
    const setAlsoDismiss = vi.fn();
    const setResolutionNotes = vi.fn();
    const onSave = vi.fn();

    render(
      <SignalActionModal
        modalSignal={mockSignal}
        modalActionType="false_positive"
        actionInProgress={null}
        resolutionNotes=""
        dismissalReason="Not Relevant"
        feedbackReason="incorrect_intent"
        setFeedbackReason={setFeedbackReason}
        alsoDismiss={true}
        setAlsoDismiss={setAlsoDismiss}
        snoozeDays={14}
        customSnoozeDate=""
        onClose={vi.fn()}
        onSave={onSave}
        setResolutionNotes={setResolutionNotes}
        setDismissalReason={vi.fn()}
        setSnoozeDays={vi.fn()}
        setCustomSnoozeDate={vi.fn()}
      />
    );

    expect(screen.getByText('Report False Positive Signal')).toBeInTheDocument();
    expect(screen.getByText('False Positive Primary Reason')).toBeInTheDocument();
    expect(screen.getByText('Submit False Positive')).toBeInTheDocument();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'stale_outdated' } });
    expect(setFeedbackReason).toHaveBeenCalledWith('stale_outdated');

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(setAlsoDismiss).toHaveBeenCalledWith(false);

    const submitBtn = screen.getByText('Submit False Positive');
    fireEvent.click(submitBtn);
    expect(onSave).toHaveBeenCalled();
  });

  it('renders assign owner modal and captures user input', () => {
    const setAssignedOwnerId = vi.fn();
    const onSave = vi.fn();

    render(
      <SignalActionModal
        modalSignal={mockSignal}
        modalActionType="assign"
        actionInProgress={null}
        resolutionNotes=""
        dismissalReason="Not Relevant"
        snoozeDays={14}
        customSnoozeDate=""
        assignedOwnerId="user-123"
        setAssignedOwnerId={setAssignedOwnerId}
        onClose={vi.fn()}
        onSave={onSave}
        setResolutionNotes={vi.fn()}
        setDismissalReason={vi.fn()}
        setSnoozeDays={vi.fn()}
        setCustomSnoozeDate={vi.fn()}
      />
    );

    expect(screen.getByText('Assign Signal Owner')).toBeInTheDocument();
    expect(screen.getByText('Save Owner Assignment')).toBeInTheDocument();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'user-456' } });
    expect(setAssignedOwnerId).toHaveBeenCalledWith('user-456');

    const saveBtn = screen.getByText('Save Owner Assignment');
    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalled();
  });

  it('renders escalate modal with severity select and required rationale', () => {
    const setEscalationLevel = vi.fn();
    const setEscalationReason = vi.fn();
    const onSave = vi.fn();

    render(
      <SignalActionModal
        modalSignal={mockSignal}
        modalActionType="escalate"
        actionInProgress={null}
        resolutionNotes=""
        dismissalReason="Not Relevant"
        snoozeDays={14}
        customSnoozeDate=""
        escalationLevel="critical"
        setEscalationLevel={setEscalationLevel}
        escalationReason="Strategic account contract renewal risk"
        setEscalationReason={setEscalationReason}
        onClose={vi.fn()}
        onSave={onSave}
        setResolutionNotes={vi.fn()}
        setDismissalReason={vi.fn()}
        setSnoozeDays={vi.fn()}
        setCustomSnoozeDate={vi.fn()}
      />
    );

    expect(screen.getByText('Escalate Risk / Opportunity')).toBeInTheDocument();
    expect(screen.getByText('🚨 Escalate Signal')).toBeInTheDocument();

    const reasonInput = screen.getByPlaceholderText(/why this signal requires immediate escalation/i);
    expect(reasonInput).toHaveValue('Strategic account contract renewal risk');
    fireEvent.change(reasonInput, { target: { value: 'High probability churn threat' } });
    expect(setEscalationReason).toHaveBeenCalledWith('High probability churn threat');

    const saveBtn = screen.getByText('🚨 Escalate Signal');
    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalled();
  });

  it('renders create opportunity modal with deal parameters and notes', () => {
    const setOppTitle = vi.fn();
    const setOppValue = vi.fn();
    const onSave = vi.fn();

    render(
      <SignalActionModal
        modalSignal={mockSignal}
        modalActionType="create_opportunity"
        actionInProgress={null}
        resolutionNotes="Initial customer expansion discussion"
        dismissalReason="Not Relevant"
        snoozeDays={14}
        customSnoozeDate=""
        oppTitle="Acme Corp - Enterprise Expansion"
        setOppTitle={setOppTitle}
        oppValue={75000}
        setOppValue={setOppValue}
        oppCurrency="EUR"
        oppStage="prospect"
        oppProbability={60}
        onClose={vi.fn()}
        onSave={onSave}
        setResolutionNotes={vi.fn()}
        setDismissalReason={vi.fn()}
        setSnoozeDays={vi.fn()}
        setCustomSnoozeDate={vi.fn()}
      />
    );

    expect(screen.getByText('Convert to Commercial Deal')).toBeInTheDocument();
    expect(screen.getByText('💼 Create Deal')).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText('Opportunity Title');
    expect(titleInput).toHaveValue('Acme Corp - Enterprise Expansion');
    fireEvent.change(titleInput, { target: { value: 'Acme Corp - Upsell' } });
    expect(setOppTitle).toHaveBeenCalledWith('Acme Corp - Upsell');

    const saveBtn = screen.getByText('💼 Create Deal');
    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalled();
  });
});
