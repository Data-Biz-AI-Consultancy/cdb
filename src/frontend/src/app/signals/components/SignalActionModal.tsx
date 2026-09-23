'use client';

import React from 'react';
import { DetectedSignal } from '../types';

interface SignalActionModalProps {
  modalSignal: DetectedSignal | null;
  modalActionType: 'actioned' | 'dismissed' | 'snoozed' | 'resolved' | null;
  actionInProgress: string | null;
  resolutionNotes: string;
  dismissalReason: string;
  snoozeDays: number;
  customSnoozeDate: string;
  onClose: () => void;
  onSave: () => void;
  setResolutionNotes: (val: string) => void;
  setDismissalReason: (val: string) => void;
  setSnoozeDays: (days: number) => void;
  setCustomSnoozeDate: (date: string) => void;
}

export const SignalActionModal: React.FC<SignalActionModalProps> = ({
  modalSignal,
  modalActionType,
  actionInProgress,
  resolutionNotes,
  dismissalReason,
  snoozeDays,
  customSnoozeDate,
  onClose,
  onSave,
  setResolutionNotes,
  setDismissalReason,
  setSnoozeDays,
  setCustomSnoozeDate,
}) => {
  if (!modalSignal || !modalActionType) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">
            {modalActionType === 'actioned'
              ? 'Record Taken Action'
              : modalActionType === 'snoozed'
              ? '💤 Snooze Signal Alert'
              : modalActionType === 'resolved'
              ? '✅ Resolve Signal'
              : 'Dismiss Signal Alert'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Signal:{' '}
            <strong className="text-slate-800 font-semibold">{modalSignal.title}</strong>
          </p>

          {/* Snooze Options */}
          {modalActionType === 'snoozed' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Snooze Duration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '7 Days', days: 7 },
                  { label: '14 Days (Default)', days: 14 },
                  { label: '30 Days', days: 30 },
                ].map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => {
                      setSnoozeDays(opt.days);
                      setCustomSnoozeDate('');
                    }}
                    className={`py-2 px-3 text-xs rounded-xl border font-semibold transition cursor-pointer ${
                      snoozeDays === opt.days && !customSnoozeDate
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Or Pick Custom Date
                </label>
                <input
                  type="date"
                  value={customSnoozeDate}
                  onChange={(e) => setCustomSnoozeDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          {/* Dismiss Reason */}
          {modalActionType === 'dismissed' && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Dismissal Category
              </label>
              <select
                value={dismissalReason}
                onChange={(e) => setDismissalReason(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="Not Relevant">Not Relevant / Ignorable</option>
                <option value="False Positive">False Positive / Incorrect Attribution</option>
                <option value="Handled Elsewhere">Already Handled Elsewhere</option>
                <option value="Other">Other / Miscellaneous</option>
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              {modalActionType === 'actioned'
                ? 'Action Notes / Commercial Next Step'
                : modalActionType === 'resolved'
                ? 'Resolution Notes'
                : modalActionType === 'snoozed'
                ? 'Optional Snooze Reason'
                : 'Additional Context / Notes'}
            </label>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder={
                modalActionType === 'actioned'
                  ? 'e.g., Scheduled executive check-in for next Tuesday via email...'
                  : modalActionType === 'resolved'
                  ? 'e.g., Re-engagement call completed and QBR scheduled.'
                  : modalActionType === 'snoozed'
                  ? 'e.g., Lead asked to reconnect after holiday period.'
                  : 'e.g., Contact already communicated via WhatsApp.'
              }
              className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={actionInProgress === modalSignal.id}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition shadow-sm cursor-pointer ${
              modalActionType === 'actioned'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : modalActionType === 'snoozed'
                ? 'bg-purple-600 hover:bg-purple-700'
                : modalActionType === 'resolved'
                ? 'bg-teal-600 hover:bg-teal-700'
                : 'bg-slate-800 hover:bg-slate-900'
            }`}
          >
            {modalActionType === 'actioned'
              ? 'Mark as Actioned'
              : modalActionType === 'snoozed'
              ? 'Confirm Snooze'
              : modalActionType === 'resolved'
              ? 'Confirm Resolution'
              : 'Dismiss Signal'}
          </button>
        </div>
      </div>
    </div>
  );
};
