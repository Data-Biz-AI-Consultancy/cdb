'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSignalDetail } from './hooks/useSignalDetail';
import {
  SignalDetailHeader,
  SignalImpactBreakdownCard,
  SignalEvidenceSection,
  SignalPlaybookSection,
  SignalQualitySafeguardsCard,
  SignalFeedbackHistoryCard,
  SignalLifecycleAuditCard,
  SignalActionModal,
} from './components';

export default function SignalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [signalId, setSignalId] = useState<string>('');

  useEffect(() => {
    if (params && typeof (params as any).then === 'function') {
      (params as Promise<{ id: string }>).then((p) => {
        if (p?.id) setSignalId(p.id);
      });
    } else if (params && (params as any).id) {
      setSignalId((params as any).id);
    }
  }, [params]);

  const {
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
  } = useSignalDetail(signalId);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-6 w-32 bg-slate-200 rounded" />
            <div className="h-10 w-3/4 bg-slate-200 rounded" />
            <div className="h-48 bg-white border border-slate-200 rounded-xl p-6" />
            <div className="h-64 bg-white border border-slate-200 rounded-xl p-6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-semibold text-slate-900">Signal Not Found</h2>
          <p className="text-sm text-slate-500 mt-1">
            {error || 'The requested signal could not be loaded.'}
          </p>
          <div className="mt-6">
            <Link
              href="/signals"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition"
            >
              <span>← Back to Signals Radar</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <SignalDetailHeader
          signal={signal}
          loading={loading}
          submittingAction={submittingAction}
          onRefresh={fetchSignal}
          onAcknowledge={handleAcknowledge}
          onOpenActionModal={handleOpenActionModal}
        />

        <SignalImpactBreakdownCard signal={signal} />

        <SignalEvidenceSection signal={signal} />

        <SignalPlaybookSection signal={signal} />

        <SignalQualitySafeguardsCard signal={signal} />

        <SignalFeedbackHistoryCard
          signal={signal}
          submittingAction={submittingAction}
          onOpenActionModal={handleOpenActionModal}
        />

        <SignalLifecycleAuditCard signal={signal} />
      </div>

      <SignalActionModal
        isOpen={actionModalOpen}
        actionType={actionType}
        signal={signal}
        resolutionNotes={resolutionNotes}
        dismissalReason={dismissalReason}
        feedbackReason={feedbackReason}
        alsoDismiss={alsoDismiss}
        snoozeDays={snoozeDays}
        customSnoozeDate={customSnoozeDate}
        submittingAction={submittingAction}
        onClose={handleCloseActionModal}
        onSubmit={handleSubmitAction}
        setResolutionNotes={setResolutionNotes}
        setDismissalReason={setDismissalReason}
        setFeedbackReason={setFeedbackReason}
        setAlsoDismiss={setAlsoDismiss}
        setSnoozeDays={setSnoozeDays}
        setCustomSnoozeDate={setCustomSnoozeDate}
      />
    </div>
  );
}
