'use client';

import React from 'react';
import Modal from '@/components/Modal';
import { Lead } from '../../types';

interface AdvanceStageModalProps {
  lead: Lead | null;
  onClose: () => void;
  form: {
    notes: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      notes: string;
    }>
  >;
  onSubmit: (e: React.FormEvent) => void;
}

export const AdvanceStageModal: React.FC<AdvanceStageModalProps> = ({
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
      title={`Advance Lead Stage (${lead?.stage} → Next)`}
      subtitle={lead?.person_name ? `Contact: ${lead.person_name}` : undefined}
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-3 text-sm">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Notes / Progress Update</label>
          <textarea
            rows={3}
            placeholder="e.g. Had discovery call; client requested pricing."
            value={form.notes}
            onChange={(e) => setForm({ notes: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
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
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            Confirm Advance
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AdvanceStageModal;
