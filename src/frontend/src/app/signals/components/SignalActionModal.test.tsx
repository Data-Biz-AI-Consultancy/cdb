import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignalActionModal } from './SignalActionModal';
import { DetectedSignal } from '../types';

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
});
