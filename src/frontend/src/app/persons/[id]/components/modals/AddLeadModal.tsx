'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/Modal';
import { LeadFormData } from '../../types';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeadFormData) => Promise<void>;
}

export function AddLeadModal({ isOpen, onClose, onSubmit }: AddLeadModalProps) {
  const [leadForm, setLeadForm] = useState<LeadFormData>({
    title: '',
    stage: 'new',
    source: 'linkedin_message',
    intent: 'Consulting Inquiry',
    signal_strength: 'strong',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(leadForm);
      setLeadForm({
        title: '',
        stage: 'new',
        source: 'linkedin_message',
        intent: 'Consulting Inquiry',
        signal_strength: 'strong',
        notes: '',
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
      title="Attach New Inbound Lead"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Title *</label>
          <input
            required
            placeholder="e.g. Inbound message via LinkedIn regarding hiring"
            value={leadForm.title}
            onChange={(e) => setLeadForm({ ...leadForm, title: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Stage</label>
            <select
              value={leadForm.stage}
              onChange={(e) => setLeadForm({ ...leadForm, stage: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Signal Strength</label>
            <select
              value={leadForm.signal_strength}
              onChange={(e) => setLeadForm({ ...leadForm, signal_strength: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            >
              <option value="strong">Strong 🔥</option>
              <option value="medium">Medium ☀️</option>
              <option value="weak">Weak ❄️</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Intent</label>
          <input
            placeholder="e.g. Consulting Inquiry, Job Opportunity, Advisory"
            value={leadForm.intent}
            onChange={(e) => setLeadForm({ ...leadForm, intent: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
          <textarea
            rows={2}
            placeholder="Context, details or next steps..."
            value={leadForm.notes}
            onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-xs"
          />
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
            className="px-5 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
