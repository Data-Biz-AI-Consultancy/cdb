'use client';

import React from 'react';
import Modal from '@/components/Modal';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: number;
  form: {
    stage: string;
    signal_strength: string;
    source: string;
    intent: string;
    disqualification_reason: string;
    append_notes: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      stage: string;
      signal_strength: string;
      source: string;
      intent: string;
      disqualification_reason: string;
      append_notes: string;
    }>
  >;
  onSubmit: (e: React.FormEvent) => void;
  processing: boolean;
}

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
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
      title={`Bulk Edit Lead Attributes (${count} selected)`}
      subtitle="Apply batch attribute changes to all selected leads"
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Update Stage</label>
            <select
              value={form.stage}
              onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">(Keep Existing Stage)</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="stale">Stale (&gt;30d)</option>
              <option value="disqualified">Disqualified</option>
              <option value="expired">Expired (&gt;90d)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Update Signal Strength</label>
            <select
              value={form.signal_strength}
              onChange={(e) => setForm((prev) => ({ ...prev, signal_strength: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">(Keep Existing Signal)</option>
              <option value="strong">🔥 Strong</option>
              <option value="medium">⚡ Medium</option>
              <option value="weak">🌱 Weak</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Update Source</label>
            <select
              value={form.source}
              onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">(Keep Existing Source)</option>
              <option value="linkedin_message">LinkedIn Message</option>
              <option value="inbound">Inbound</option>
              <option value="referral">Referral</option>
              <option value="event">Event</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Update Intent</label>
            <input
              placeholder="e.g. consulting_opportunity"
              value={form.intent}
              onChange={(e) => setForm((prev) => ({ ...prev, intent: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Append Note / Description
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Batch outreach completed during marketing sprint..."
            value={form.append_notes}
            onChange={(e) => setForm((prev) => ({ ...prev, append_notes: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            This note will be appended to the notes history of each selected lead without overwriting past history.
          </p>
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
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-xs disabled:opacity-50"
          >
            {processing ? 'Applying Batch Changes...' : `Update ${count} Leads`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BulkEditModal;
