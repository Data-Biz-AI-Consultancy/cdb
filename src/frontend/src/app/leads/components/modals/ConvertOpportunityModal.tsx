'use client';

import React from 'react';
import Modal from '@/components/Modal';
import { Lead } from '../../types';

interface ConvertOpportunityModalProps {
  lead: Lead | null;
  onClose: () => void;
  form: {
    title: string;
    value: string;
    currency: string;
    expected_close_date: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      title: string;
      value: string;
      currency: string;
      expected_close_date: string;
    }>
  >;
  onSubmit: (e: React.FormEvent) => void;
}

export const ConvertOpportunityModal: React.FC<ConvertOpportunityModalProps> = ({
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
      title="Convert Lead to Opportunity"
      subtitle={`Creating an active deal for ${lead?.person_name || 'Contact'}`}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-3 text-sm">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Opportunity Title *</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Estimated Value (€)</label>
            <input
              type="number"
              value={form.value}
              onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Expected Close Date</label>
            <input
              type="date"
              value={form.expected_close_date}
              onChange={(e) => setForm((prev) => ({ ...prev, expected_close_date: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
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
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            Create Opportunity Deal
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ConvertOpportunityModal;
