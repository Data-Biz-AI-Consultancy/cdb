'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { DetectedSignal } from '../types';

export function useSignalActionModal(
  setSignals: React.Dispatch<React.SetStateAction<DetectedSignal[]>>,
  setActionInProgress: (id: string | null) => void
) {
  const [modalSignal, setModalSignal] = useState<DetectedSignal | null>(null);
  const [modalActionType, setModalActionType] = useState<
    | 'actioned'
    | 'dismissed'
    | 'snoozed'
    | 'resolved'
    | 'false_positive'
    | 'assign'
    | 'escalate'
    | 'create_opportunity'
    | null
  >(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [dismissalReason, setDismissalReason] = useState('Not Relevant');
  const [feedbackReason, setFeedbackReason] = useState('incorrect_intent');
  const [alsoDismiss, setAlsoDismiss] = useState(true);
  const [snoozeDays, setSnoozeDays] = useState<number>(14);
  const [customSnoozeDate, setCustomSnoozeDate] = useState<string>('');

  // Ownership & Escalation Modal State
  const [assignedOwnerId, setAssignedOwnerId] = useState('');
  const [escalationLevel, setEscalationLevel] = useState('escalated');
  const [escalationReason, setEscalationReason] = useState('');

  // Deal Creation Modal State
  const [oppTitle, setOppTitle] = useState('');
  const [oppValue, setOppValue] = useState<string | number>('');
  const [oppCurrency, setOppCurrency] = useState('EUR');
  const [oppStage, setOppStage] = useState('prospect');
  const [oppProbability, setOppProbability] = useState<string | number>(50);

  const handleOpenActionModal = (
    sig: DetectedSignal,
    type:
      | 'actioned'
      | 'dismissed'
      | 'snoozed'
      | 'resolved'
      | 'false_positive'
      | 'assign'
      | 'escalate'
      | 'create_opportunity'
  ) => {
    setModalSignal(sig);
    setModalActionType(type);
    setResolutionNotes(sig.resolution_notes || '');
    setDismissalReason(sig.dismissal_reason || 'Not Relevant');
    setFeedbackReason('incorrect_intent');
    setAlsoDismiss(true);
    setSnoozeDays(14);
    setCustomSnoozeDate('');
    setAssignedOwnerId(sig.owner_id || '');
    setEscalationLevel(sig.escalation_level && sig.escalation_level !== 'none' ? sig.escalation_level : 'escalated');
    setEscalationReason(sig.escalation_reason || '');
    setOppTitle(sig.title ? `Deal: ${sig.title}` : `Deal from ${sig.company_name || 'Signal'}`);
    setOppValue(sig.metadata?.commercial_value || sig.metadata?.arr_impact || 50000);
    setOppCurrency('EUR');
    setOppStage('prospect');
    setOppProbability(50);
  };

  const handleCloseActionModal = () => {
    setModalSignal(null);
    setModalActionType(null);
  };

  const handleSaveModalAction = async () => {
    if (!modalSignal || !modalActionType) return;
    const signalId = modalSignal.id;
    setActionInProgress(signalId);

    try {
      if (modalActionType === 'false_positive') {
        await apiFetch('/api/v1/signals/feedback', {
          method: 'POST',
          body: JSON.stringify({
            signal_id: signalId,
            reason: feedbackReason,
            notes: resolutionNotes || undefined,
            dismiss_signal: alsoDismiss,
          }),
        });

        if (alsoDismiss) {
          setSignals((prev) =>
            prev.map((s) =>
              s.id === signalId
                ? {
                  ...s,
                  status: 'dismissed',
                  dismissal_reason: `False Positive: ${feedbackReason}`,
                  actioned_at: new Date().toISOString(),
                }
                : s
            )
          );
        }
      } else if (modalActionType === 'assign') {
        const updated = await apiFetch<DetectedSignal>(`/api/v1/signals/detected/${signalId}/assign`, {
          method: 'POST',
          body: JSON.stringify({
            owner_id: assignedOwnerId ? assignedOwnerId : null,
          }),
        });
        setSignals((prev) => prev.map((s) => (s.id === signalId ? { ...s, ...updated } : s)));
      } else if (modalActionType === 'escalate') {
        const updated = await apiFetch<DetectedSignal>(`/api/v1/signals/detected/${signalId}/escalate`, {
          method: 'POST',
          body: JSON.stringify({
            escalation_level: escalationLevel,
            reason: escalationReason || undefined,
          }),
        });
        setSignals((prev) => prev.map((s) => (s.id === signalId ? { ...s, ...updated } : s)));
      } else if (modalActionType === 'create_opportunity') {
        const updated = await apiFetch<DetectedSignal>(
          `/api/v1/signals/detected/${signalId}/create-opportunity`,
          {
            method: 'POST',
            body: JSON.stringify({
              title: oppTitle,
              estimated_value: oppValue ? Number(oppValue) : undefined,
              currency: oppCurrency,
              stage: oppStage,
              probability: oppProbability ? Number(oppProbability) : undefined,
              notes: resolutionNotes || undefined,
            }),
          }
        );
        setSignals((prev) => prev.map((s) => (s.id === signalId ? { ...s, ...updated } : s)));
      } else {
        const payload: Record<string, any> = {
          status: modalActionType,
        };

        if (modalActionType === 'actioned' || modalActionType === 'resolved') {
          payload.resolution_notes = resolutionNotes;
        } else if (modalActionType === 'dismissed') {
          payload.dismissal_reason = dismissalReason;
          if (resolutionNotes) payload.resolution_notes = resolutionNotes;
        } else if (modalActionType === 'snoozed') {
          if (customSnoozeDate) {
            payload.snoozed_until = new Date(customSnoozeDate).toISOString();
          } else {
            const date = new Date();
            date.setDate(date.getDate() + snoozeDays);
            payload.snoozed_until = date.toISOString();
          }
          if (resolutionNotes) payload.resolution_notes = resolutionNotes;
        }

        const updated = await apiFetch<DetectedSignal>(`/api/v1/signals/detected/${signalId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        setSignals((prev) => prev.map((s) => (s.id === signalId ? { ...s, ...updated } : s)));
      }

      handleCloseActionModal();
    } catch (err: unknown) {
      alert(`Action failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  return {
    modalSignal,
    modalActionType,
    resolutionNotes,
    setResolutionNotes,
    dismissalReason,
    setDismissalReason,
    feedbackReason,
    setFeedbackReason,
    alsoDismiss,
    setAlsoDismiss,
    snoozeDays,
    setSnoozeDays,
    customSnoozeDate,
    setCustomSnoozeDate,
    assignedOwnerId,
    setAssignedOwnerId,
    escalationLevel,
    setEscalationLevel,
    escalationReason,
    setEscalationReason,
    oppTitle,
    setOppTitle,
    oppValue,
    setOppValue,
    oppCurrency,
    setOppCurrency,
    oppStage,
    setOppStage,
    oppProbability,
    setOppProbability,
    handleOpenActionModal,
    handleCloseActionModal,
    handleSaveModalAction,
  };
}
