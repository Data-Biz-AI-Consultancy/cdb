'use client';

import React from 'react';
import Modal from '@/components/Modal';

interface BulkConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: number;
  form: {
    default_value: string;
    currency: string;
    expected_close_date: string;
    title_suffix: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      default_value: string;
      currency: string;
      expected_close_date: string;
      title_suffix: string;
    }>
  >;
  onSubmit: (e: React.FormEvent) => void;
  processing: boolean;
}

export const BulkConvertModal: React.FC<BulkConvertModalProps> = ({
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
      title={`Bulk Convert to Opportunity (${count} leads)`}
      subtitle="Convert all selected leads into active opportunity deals simultaneously"
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Default Deal Value (€)</label>
            <input
              type="number"
              value={form.default_value}
              onChange={(e) => setForm((prev) => ({ ...prev, default_value: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              placeholder="10000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Currency</label>
            <select
              value={form.currency}
              onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Expected Close Date</label>
            <input
              type="date"
              value={form.expected_close_date}
              onChange={(e) => setForm((prev) => ({ ...prev, expected_close_date: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Opportunity Title Suffix</label>
            <input
              value={form.title_suffix}
              onChange={(e) => setForm((prev) => ({ ...prev, title_suffix: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              placeholder="— Opportunity Deal"
            />
          </div>
        </div>

        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
          ⚡ Each selected lead will generate an active Opportunity linked to its decision-maker person & company record, with stage marked as <strong>converted</strong>.
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
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-xs disabled:opacity-50"
          >
            {processing ? 'Converting Deals...' : `Convert ${count} Leads to Opps`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BulkConvertModal;
