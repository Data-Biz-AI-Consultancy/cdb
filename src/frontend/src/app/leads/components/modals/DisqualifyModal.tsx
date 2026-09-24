'use client';

import React from 'react';
import Modal from '@/components/Modal';
import { Lead, DISQUALIFICATION_REASONS } from '../../types';

interface DisqualifyModalProps {
  lead: Lead | null;
  onClose: () => void;
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
}

export const DisqualifyModal: React.FC<DisqualifyModalProps> = ({
  lead,
  onClose,
  form,
  setForm,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={!!lead}
      onClose={onClose}
      title="Disqualify Lead"
      subtitle={lead?.person_name ? `Contact: ${lead.person_name}` : undefined}
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-3 text-sm">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Reason *</label>
          <select
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
          >
            {DISQUALIFICATION_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            placeholder="Provide context or rationale for future audit trails..."
          />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            Disqualify
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DisqualifyModal;
