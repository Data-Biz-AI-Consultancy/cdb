'use client';

import React from 'react';

interface OpportunityCloseModalProps {
  closeConfirmData: {
    oppId: string;
    outcome: 'closed_won' | 'closed_lost';
    notes: string;
  } | null;
  onClose: () => void;
  onChangeNotes: (notes: string) => void;
  onConfirm: () => void;
}

export const OpportunityCloseModal: React.FC<OpportunityCloseModalProps> = ({
  closeConfirmData,
  onClose,
  onChangeNotes,
  onConfirm,
}) => {
  if (!closeConfirmData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {closeConfirmData.outcome === 'closed_won' ? '🏆' : '❌'}
          </span>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Mark Opportunity as{' '}
              {closeConfirmData.outcome === 'closed_won' ? 'Closed Won' : 'Closed Lost'}
            </h3>
            <p className="text-xs text-slate-500">
              {closeConfirmData.outcome === 'closed_won'
                ? 'Congratulations! Confidence level will be set to 100%.'
                : 'The opportunity will be archived with 0% confidence level.'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Closure Notes / Feedback
          </label>
          <textarea
            rows={3}
            placeholder="Reason for win/loss, key takeaways, or next steps..."
            value={closeConfirmData.notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-md transition ${
              closeConfirmData.outcome === 'closed_won'
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-rose-600 hover:bg-rose-500'
            }`}
          >
            Confirm {closeConfirmData.outcome === 'closed_won' ? 'Won' : 'Lost'}
          </button>
        </div>
      </div>
    </div>
  );
};
