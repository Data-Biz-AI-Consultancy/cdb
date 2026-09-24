'use client';

import React from 'react';

interface FalsePositiveSectionProps {
  feedbackReason: string;
  setFeedbackReason?: (val: string) => void;
  alsoDismiss: boolean;
  setAlsoDismiss?: (val: boolean) => void;
}

export const FalsePositiveSection: React.FC<FalsePositiveSectionProps> = ({
  feedbackReason,
  setFeedbackReason,
  alsoDismiss,
  setAlsoDismiss,
}) => {
  return (
    <div className="space-y-3 bg-rose-50/60 p-3.5 rounded-xl border border-rose-200/80">
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-rose-900">
          False Positive Primary Reason
        </label>
        <select
          value={feedbackReason}
          onChange={(e) => setFeedbackReason && setFeedbackReason(e.target.value)}
          className="w-full text-xs p-2.5 bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
        >
          <option value="incorrect_intent">Incorrect Intent / Commercial Misinterpretation</option>
          <option value="stale_outdated">Stale or Outdated Source Data</option>
          <option value="wrong_entity_attribution">Wrong Company or Person Attribution</option>
          <option value="unreliable_source">Unreliable or Missing Corroborating Source Data</option>
          <option value="confidential_restricted">Restricted / Confidential Access Discrepancy</option>
          <option value="other">Other Detection Anomaly</option>
        </select>
      </div>

      {setAlsoDismiss && (
        <label className="flex items-center gap-2 text-xs text-rose-950 font-medium cursor-pointer select-none">
          <input
            type="checkbox"
            checked={alsoDismiss}
            onChange={(e) => setAlsoDismiss(e.target.checked)}
            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300"
          />
          <span>Automatically dismiss this signal upon submission</span>
        </label>
      )}
    </div>
  );
};
