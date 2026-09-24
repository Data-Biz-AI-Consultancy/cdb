'use client';

import React from 'react';

interface ModalHeaderProps {
  actionType: string | null;
  onClose: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ actionType, onClose }) => {
  const getHeaderInfo = () => {
    switch (actionType) {
      case 'actioned':
        return { emoji: '⚡', title: 'Record Taken Action' };
      case 'snoozed':
        return { emoji: '💤', title: 'Snooze Signal Alert' };
      case 'resolved':
        return { emoji: '✅', title: 'Resolve Signal' };
      case 'false_positive':
        return { emoji: '🚩', title: 'Report False Positive Signal' };
      case 'assign':
        return { emoji: '👤', title: 'Assign Signal Owner' };
      case 'escalate':
        return { emoji: '🚨', title: 'Escalate Risk / Opportunity' };
      case 'create_opportunity':
        return { emoji: '💼', title: 'Convert to Commercial Deal' };
      default:
        return { emoji: '✕', title: 'Dismiss Signal Alert' };
    }
  };

  const { emoji, title } = getHeaderInfo();

  return (
    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <span>{emoji}</span>
        <span>{title}</span>
      </h3>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
};
