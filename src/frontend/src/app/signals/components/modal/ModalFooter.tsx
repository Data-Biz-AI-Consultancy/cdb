'use client';

import React from 'react';

interface ModalFooterProps {
  modalActionType: string | null;
  actionInProgress: string | null;
  signalId: string;
  escalationReason: string;
  onClose: () => void;
  onSave: () => void;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  modalActionType,
  actionInProgress,
  signalId,
  escalationReason,
  onClose,
  onSave,
}) => {
  const getButtonLabel = () => {
    switch (modalActionType) {
      case 'actioned':
        return 'Mark as Actioned';
      case 'snoozed':
        return 'Confirm Snooze';
      case 'resolved':
        return 'Confirm Resolution';
      case 'false_positive':
        return 'Submit False Positive';
      case 'assign':
        return 'Save Owner Assignment';
      case 'escalate':
        return '🚨 Escalate Signal';
      case 'create_opportunity':
        return '💼 Create Deal';
      default:
        return 'Dismiss Signal';
    }
  };

  const getButtonBgClass = () => {
    switch (modalActionType) {
      case 'actioned':
        return 'bg-emerald-600 hover:bg-emerald-700';
      case 'snoozed':
        return 'bg-purple-600 hover:bg-purple-700';
      case 'resolved':
        return 'bg-teal-600 hover:bg-teal-700';
      case 'false_positive':
        return 'bg-rose-600 hover:bg-rose-700';
      case 'assign':
        return 'bg-slate-900 hover:bg-slate-800';
      case 'escalate':
        return 'bg-rose-600 hover:bg-rose-700';
      case 'create_opportunity':
        return 'bg-emerald-600 hover:bg-emerald-700';
      default:
        return 'bg-slate-800 hover:bg-slate-900';
    }
  };

  const isDisabled =
    actionInProgress === signalId ||
    (modalActionType === 'escalate' && !escalationReason.trim());

  return (
    <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
      <button
        onClick={onClose}
        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={isDisabled}
        className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition shadow-sm cursor-pointer disabled:opacity-50 ${getButtonBgClass()}`}
      >
        {getButtonLabel()}
      </button>
    </div>
  );
};
