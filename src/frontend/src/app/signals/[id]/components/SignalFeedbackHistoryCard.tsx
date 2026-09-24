'use client';

import { DetectedSignal, SignalActionType } from '../types';

interface SignalFeedbackHistoryCardProps {
  signal: DetectedSignal;
  submittingAction: boolean;
  onOpenActionModal: (type: SignalActionType) => void;
}

export function SignalFeedbackHistoryCard({
  signal,
  submittingAction,
  onOpenActionModal,
}: SignalFeedbackHistoryCardProps) {
  const feedbackEntries = signal.feedback_entries || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚩</span>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              False-Positive Feedback & Investigation History
            </h2>
            <p className="text-xs text-slate-500">
              Continuous quality feedback loop monitored for detector tuning and false positive reduction.
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenActionModal('false_positive')}
          disabled={submittingAction}
          className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
        >
          <span>+</span>
          <span>Report False Positive</span>
        </button>
      </div>

      {feedbackEntries.length > 0 ? (
        <div className="space-y-3">
          {feedbackEntries.map((fb) => (
            <div
              key={fb.id}
              className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full border bg-rose-100 text-rose-800 border-rose-200 font-semibold text-[11px] capitalize">
                    {fb.feedback_reason.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full border font-bold text-[10px] uppercase ${
                      fb.status === 'investigated' || fb.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : fb.status === 'pending'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    Status: {fb.status}
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  {new Date(fb.created_at).toLocaleString()}
                </span>
              </div>

              {fb.feedback_notes && (
                <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 italic">
                  💬 &ldquo;{fb.feedback_notes}&rdquo;
                </p>
              )}

              {fb.investigation_notes && (
                <div className="pt-1 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-800">Investigation Note: </span>
                  <span>{fb.investigation_notes}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>
            No false-positive feedback recorded for this signal alert. If this detection is
            inaccurate or based on stale source data, submit a report to alert the data team.
          </span>
          <button
            onClick={() => onOpenActionModal('false_positive')}
            className="text-rose-600 hover:text-rose-800 font-bold hover:underline shrink-0 cursor-pointer"
          >
            Report feedback →
          </button>
        </div>
      )}
    </div>
  );
}
