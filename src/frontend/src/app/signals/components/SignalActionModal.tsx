'use client';

import React from 'react';
import UserSelect from '@/components/UserSelect';
import { DetectedSignal } from '../types';

interface SignalActionModalProps {
  modalSignal: DetectedSignal | null;
  modalActionType:
    | 'actioned'
    | 'dismissed'
    | 'snoozed'
    | 'resolved'
    | 'false_positive'
    | 'assign'
    | 'escalate'
    | 'create_opportunity'
    | null;
  actionInProgress: string | null;
  resolutionNotes: string;
  dismissalReason: string;
  snoozeDays: number;
  customSnoozeDate: string;
  feedbackReason?: string;
  setFeedbackReason?: (val: string) => void;
  alsoDismiss?: boolean;
  setAlsoDismiss?: (val: boolean) => void;
  // Ownership & Escalation Props
  assignedOwnerId?: string;
  setAssignedOwnerId?: (val: string) => void;
  escalationLevel?: string;
  setEscalationLevel?: (val: string) => void;
  escalationReason?: string;
  setEscalationReason?: (val: string) => void;
  // Create Opportunity Props
  oppTitle?: string;
  setOppTitle?: (val: string) => void;
  oppValue?: string | number;
  setOppValue?: (val: string | number) => void;
  oppCurrency?: string;
  setOppCurrency?: (val: string) => void;
  oppStage?: string;
  setOppStage?: (val: string) => void;
  oppProbability?: string | number;
  setOppProbability?: (val: string | number) => void;
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
  feedbackReason = 'incorrect_intent',
  setFeedbackReason,
  alsoDismiss = true,
  setAlsoDismiss,
  assignedOwnerId = '',
  setAssignedOwnerId,
  escalationLevel = 'escalated',
  setEscalationLevel,
  escalationReason = '',
  setEscalationReason,
  oppTitle = '',
  setOppTitle,
  oppValue = '',
  setOppValue,
  oppCurrency = 'EUR',
  setOppCurrency,
  oppStage = 'prospect',
  setOppStage,
  oppProbability = 50,
  setOppProbability,
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
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            {modalActionType === 'actioned' ? (
              <>
                <span>⚡</span>
                <span>Record Taken Action</span>
              </>
            ) : modalActionType === 'snoozed' ? (
              <>
                <span>💤</span>
                <span>Snooze Signal Alert</span>
              </>
            ) : modalActionType === 'resolved' ? (
              <>
                <span>✅</span>
                <span>Resolve Signal</span>
              </>
            ) : modalActionType === 'false_positive' ? (
              <>
                <span>🚩</span>
                <span>Report False Positive Signal</span>
              </>
            ) : modalActionType === 'assign' ? (
              <>
                <span>👤</span>
                <span>Assign Signal Owner</span>
              </>
            ) : modalActionType === 'escalate' ? (
              <>
                <span>🚨</span>
                <span>Escalate Risk / Opportunity</span>
              </>
            ) : modalActionType === 'create_opportunity' ? (
              <>
                <span>💼</span>
                <span>Convert to Commercial Deal</span>
              </>
            ) : (
              <>
                <span>✕</span>
                <span>Dismiss Signal Alert</span>
              </>
            )}
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

          {/* Assign Owner Action */}
          {modalActionType === 'assign' && (
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <UserSelect
                id="assign-owner-select"
                label="Owner / Assignee"
                value={assignedOwnerId || ''}
                onChange={(uid) => setAssignedOwnerId && setAssignedOwnerId(uid)}
                placeholder="Select team member (or leave unassigned)..."
              />
              <p className="text-[11px] text-slate-500">
                Leave empty and submit to move this signal to the unassigned triage queue.
              </p>
            </div>
          )}

          {/* Escalate Action */}
          {modalActionType === 'escalate' && (
            <div className="space-y-3 bg-rose-50/60 p-3.5 rounded-xl border border-rose-200/80">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-rose-900">
                  Escalation Severity Level
                </label>
                <select
                  value={escalationLevel}
                  onChange={(e) => setEscalationLevel && setEscalationLevel(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
                >
                  <option value="warning">Warning Escalation</option>
                  <option value="escalated">Escalated (Lead Review)</option>
                  <option value="critical">Critical Emergency (P0 / Partner SLA Breach)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-rose-900">
                  Escalation Risk Rationale / Justification <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={escalationReason}
                  onChange={(e) => setEscalationReason && setEscalationReason(e.target.value)}
                  placeholder="Describe why this signal requires immediate escalation and senior intervention..."
                  className="w-full text-xs p-2.5 bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
                />
              </div>
            </div>
          )}

          {/* Create Opportunity Action */}
          {modalActionType === 'create_opportunity' && (
            <div className="space-y-3 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-emerald-950">
                  Opportunity Deal Title
                </label>
                <input
                  type="text"
                  value={oppTitle}
                  onChange={(e) => setOppTitle && setOppTitle(e.target.value)}
                  placeholder="Opportunity Title"
                  className="w-full text-xs p-2.5 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-emerald-950">
                    Estimated Deal Value
                  </label>
                  <input
                    type="number"
                    value={oppValue}
                    onChange={(e) => setOppValue && setOppValue(e.target.value)}
                    placeholder="50000"
                    className="w-full text-xs p-2.5 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-emerald-950">
                    Currency
                  </label>
                  <select
                    value={oppCurrency}
                    onChange={(e) => setOppCurrency && setOppCurrency(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-emerald-950">
                    Initial Stage
                  </label>
                  <select
                    value={oppStage}
                    onChange={(e) => setOppStage && setOppStage(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-emerald-950">
                    Probability (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={oppProbability}
                    onChange={(e) => setOppProbability && setOppProbability(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* False Positive Feedback Reason */}
          {modalActionType === 'false_positive' && (
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
          )}

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

          {modalActionType !== 'assign' && modalActionType !== 'escalate' && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                {modalActionType === 'actioned'
                  ? 'Action Notes / Commercial Next Step'
                  : modalActionType === 'resolved'
                  ? 'Resolution Notes'
                  : modalActionType === 'snoozed'
                  ? 'Optional Snooze Reason'
                  : modalActionType === 'false_positive'
                  ? 'Feedback Details & Investigation Context'
                  : modalActionType === 'create_opportunity'
                  ? 'Additional Deal Notes & Next Steps'
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
                    : modalActionType === 'false_positive'
                    ? 'e.g., This email was sent to an external vendor rather than the prospective buyer; please suppress.'
                    : modalActionType === 'create_opportunity'
                    ? 'e.g., Initial discovery call notes and delivery requirements...'
                    : 'e.g., Contact already communicated via WhatsApp.'
                }
                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
              />
            </div>
          )}
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
            disabled={
              actionInProgress === modalSignal.id ||
              (modalActionType === 'escalate' && !escalationReason.trim())
            }
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition shadow-sm cursor-pointer disabled:opacity-50 ${
              modalActionType === 'actioned'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : modalActionType === 'snoozed'
                ? 'bg-purple-600 hover:bg-purple-700'
                : modalActionType === 'resolved'
                ? 'bg-teal-600 hover:bg-teal-700'
                : modalActionType === 'false_positive'
                ? 'bg-rose-600 hover:bg-rose-700'
                : modalActionType === 'assign'
                ? 'bg-slate-900 hover:bg-slate-800'
                : modalActionType === 'escalate'
                ? 'bg-rose-600 hover:bg-rose-700'
                : modalActionType === 'create_opportunity'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-slate-800 hover:bg-slate-900'
            }`}
          >
            {modalActionType === 'actioned'
              ? 'Mark as Actioned'
              : modalActionType === 'snoozed'
              ? 'Confirm Snooze'
              : modalActionType === 'resolved'
              ? 'Confirm Resolution'
              : modalActionType === 'false_positive'
              ? 'Submit False Positive'
              : modalActionType === 'assign'
              ? 'Save Owner Assignment'
              : modalActionType === 'escalate'
              ? '🚨 Escalate Signal'
              : modalActionType === 'create_opportunity'
              ? '💼 Create Deal'
              : 'Dismiss Signal'}
          </button>
        </div>
      </div>
    </div>
  );
};
