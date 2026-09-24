import React, { useState } from 'react';
import { Modal } from '@/components/Modal';
import { BulkEditPersonFormData } from '../types';

interface PersonBulkEditModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onSubmit: (data: BulkEditPersonFormData) => Promise<void>;
}

export function PersonBulkEditModal({
  isOpen,
  selectedCount,
  onClose,
  onSubmit,
}: PersonBulkEditModalProps) {
  const [bulkForm, setBulkForm] = useState<BulkEditPersonFormData>({
    country: '',
    city: '',
    add_source: '',
    remove_source: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(bulkForm);
      setBulkForm({ country: '', city: '', add_source: '', remove_source: '' });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Edit Dirty Data"
      subtitle={`Updating ${selectedCount} selected person records`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Set Country (ISO-2)
          </label>
          <input
            placeholder="e.g. US, GB, DE, FR (leave blank to keep existing)"
            value={bulkForm.country}
            onChange={(e) => setBulkForm({ ...bulkForm, country: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Set City
          </label>
          <input
            placeholder="e.g. London, San Francisco (leave blank to keep existing)"
            value={bulkForm.city}
            onChange={(e) => setBulkForm({ ...bulkForm, city: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Add Source Tag(s)
          </label>
          <input
            placeholder="e.g. manual_cleanup, crm_sync (comma-separated)"
            value={bulkForm.add_source}
            onChange={(e) => setBulkForm({ ...bulkForm, add_source: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Remove Source Tag(s)
          </label>
          <input
            placeholder="e.g. dirty_data, test (comma-separated)"
            value={bulkForm.remove_source}
            onChange={(e) => setBulkForm({ ...bulkForm, remove_source: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'Applying...' : 'Apply Bulk Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
