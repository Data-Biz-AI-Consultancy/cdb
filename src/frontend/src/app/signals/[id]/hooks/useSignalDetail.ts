'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { DetectedSignal, SignalActionType } from '../types';

export function useSignalDetail(signalId: string) {
  const [signal, setSignal] = useState<DetectedSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Triage Action Modal State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<SignalActionType | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [dismissalReason, setDismissalReason] = useState('Not Relevant');
  const [feedbackReason, setFeedbackReason] = useState('incorrect_intent');
  const [alsoDismiss, setAlsoDismiss] = useState(true);
  const [snoozeDays, setSnoozeDays] = useState<number>(14);
  const [customSnoozeDate, setCustomSnoozeDate] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchSignal = useCallback(async () => {
    if (!signalId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<DetectedSignal>(`/api/v1/signals/detected/${signalId}`);
      if (res) {
        setSignal(res);
      } else {
        setError('Signal details not found');
      }
    } catch (err: any) {
      console.error('Failed to load signal detail:', err);
      setError(err?.message || 'Failed to fetch signal details');
    } finally {
      setLoading(false);
    }
  }, [signalId]);

  useEffect(() => {
    if (signalId) {
      fetchSignal();
    }
  }, [signalId, fetchSignal]);

  const handleAcknowledge = async () => {
    if (!signal) return;
    try {
      setSubmittingAction(true);
      const updated = await apiFetch<DetectedSignal>(`/api/v1/signals/detected/${signal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'acknowledged' }),
      });
      if (updated) {
        setSignal(updated);
      }
    } catch (err) {
      console.error('Failed to acknowledge signal:', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleOpenActionModal = (type: SignalActionType) => {
    setActionType(type);
    setResolutionNotes(signal?.resolution_notes || '');
    setDismissalReason('Not Relevant');
    setFeedbackReason('incorrect_intent');
    setAlsoDismiss(true);
    setSnoozeDays(14);
    setCustomSnoozeDate('');
    setActionModalOpen(true);
  };

  const handleCloseActionModal = () => {
    setActionModalOpen(false);
    setActionType(null);
    setResolutionNotes('');
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signal || !actionType) return;
    try {
      setSubmittingAction(true);

      if (actionType === 'false_positive') {
        await apiFetch(`/api/v1/signals/detected/${signal.id}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: feedbackReason,
            feedback_notes: resolutionNotes.trim() || undefined,
            is_false_positive: true,
            also_dismiss: alsoDismiss,
          }),
        });
        await fetchSignal();
      } else {
        const payload: Record<string, any> = {
          status: actionType,
        };

        if (actionType === 'dismissed') {
          const fullNotes = resolutionNotes.trim()
            ? `[${dismissalReason}] ${resolutionNotes.trim()}`
            : `[${dismissalReason}] Dismissed by user`;
          payload.resolution_notes = fullNotes;
        } else if (actionType === 'snoozed') {
          if (customSnoozeDate) {
            payload.snooze_until = new Date(customSnoozeDate).toISOString();
          } else {
            payload.snooze_days = snoozeDays;
          }
          if (resolutionNotes.trim()) {
            payload.resolution_notes = resolutionNotes.trim();
          }
        } else if (resolutionNotes.trim()) {
          payload.resolution_notes = resolutionNotes.trim();
        }

        const updated = await apiFetch<DetectedSignal>(`/api/v1/signals/detected/${signal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (updated) {
          setSignal(updated);
        }
      }

      handleCloseActionModal();
    } catch (err) {
      console.error('Failed to update signal action:', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  return {
    signal,
    loading,
    error,
    actionModalOpen,
    actionType,
    resolutionNotes,
    dismissalReason,
    feedbackReason,
    alsoDismiss,
    snoozeDays,
    customSnoozeDate,
    submittingAction,
    setResolutionNotes,
    setDismissalReason,
    setFeedbackReason,
    setAlsoDismiss,
    setSnoozeDays,
    setCustomSnoozeDate,
    fetchSignal,
    handleAcknowledge,
    handleOpenActionModal,
    handleCloseActionModal,
    handleSubmitAction,
  };
}
