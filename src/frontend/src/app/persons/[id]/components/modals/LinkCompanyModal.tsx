'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/Modal';
import { LinkCompanyFormData } from '../../types';

interface LinkCompanyModalProps {
  isOpen: boolean;
  companies: any[];
  onClose: () => void;
  onSubmit: (data: LinkCompanyFormData) => Promise<void>;
}

export function LinkCompanyModal({
  isOpen,
  companies,
  onClose,
  onSubmit,
}: LinkCompanyModalProps) {
  const [linkForm, setLinkForm] = useState<LinkCompanyFormData>({
    company_id: companies[0]?.id || '',
    title: '',
    is_current: true,
    started_at: '',
    ended_at: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        ...linkForm,
        company_id: linkForm.company_id || companies[0]?.id || '',
      });
      setLinkForm({
        company_id: companies[0]?.id || '',
        title: '',
        is_current: true,
        started_at: '',
        ended_at: '',
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Link Employment / Role"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Company *</label>
          <select
            value={linkForm.company_id || companies[0]?.id || ''}
            onChange={(e) => setLinkForm({ ...linkForm, company_id: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-xs"
            required
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.domain ? `(${c.domain})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Title / Role *</label>
          <input
            required
            placeholder="e.g. VP of Data Engineering, Founder, CTO"
            value={linkForm.title}
            onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_curr"
            checked={linkForm.is_current}
            onChange={(e) => setLinkForm({ ...linkForm, is_current: e.target.checked })}
            className="rounded border-slate-300 h-4 w-4"
          />
          <label htmlFor="is_curr" className="text-xs font-medium text-slate-700">
            This is the current active role
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              value={linkForm.started_at}
              onChange={(e) => setLinkForm({ ...linkForm, started_at: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
            <input
              type="date"
              disabled={linkForm.is_current}
              value={linkForm.ended_at}
              onChange={(e) => setLinkForm({ ...linkForm, ended_at: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs disabled:opacity-50"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-slate-700 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Relationship'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
