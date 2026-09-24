'use client';

import React from 'react';
import Modal from '@/components/Modal';

interface BulkDisqualifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: number;
  form: {
    reason: string;
    notes: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      reason: string;
      notes: string;
    }>
  >;
  onSubmit: (e: React.FormEvent) => void;
  processing: boolean;
}

export const BulkDisqualifyModal: React.FC<BulkDisqualifyModalProps> = ({
  isOpen,
  onClose,
  count,
  form,
  setForm,
  onSubmit,
  processing,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bulk Reject / Disqualify (${count} leads)`}
      subtitle="Disqualify all selected leads and record the rejection reason"
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Disqualification Reason *</label>
          <select
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
          >
            <option value="wrong_fit">Wrong Fit / Scope</option>
            <option value="no_budget">No Budget / Price Constraint</option>
            <option value="no_response">No Response / Stalled Outreach</option>
            <option value="wrong_timing">Wrong Timing / Deferred</option>
            <option value="competitor_chosen">Competitor Chosen</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Rejection Notes (Optional)</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="e.g. Lead does not meet qualified pipeline criteria during batch review."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={processing}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs shadow-xs disabled:opacity-50"
          >
            {processing ? 'Disqualifying...' : `Reject & Disqualify ${count} Leads`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BulkDisqualifyModal;
