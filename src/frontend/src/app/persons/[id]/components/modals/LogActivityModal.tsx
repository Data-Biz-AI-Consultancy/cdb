'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/Modal';
import { ActivityFormData } from '../../types';

interface LogActivityModalProps {
  isOpen: boolean;
  personName: string;
  onClose: () => void;
  onSubmit: (data: ActivityFormData) => Promise<void>;
}

export function LogActivityModal({
  isOpen,
  personName,
  onClose,
  onSubmit,
}: LogActivityModalProps) {
  const [activityForm, setActivityForm] = useState<ActivityFormData>({
    title: '',
    type: 'linkedin_message',
    source: 'linkedin',
    summary: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(activityForm);
      setActivityForm({ title: '', type: 'linkedin_message', source: 'linkedin', summary: '' });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log Interaction for ${personName}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
          <input
            required
            placeholder="e.g. Discussed AI Strategy & Q4 Pipeline"
            value={activityForm.title}
            onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Activity Type</label>
            <select
              value={activityForm.type}
              onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            >
              <option value="linkedin_message">LinkedIn Message</option>
              <option value="meeting">Meeting / Notion Notes</option>
              <option value="email">Email</option>
              <option value="call">Phone Call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="note">Internal Note</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Source</label>
            <select
              value={activityForm.source}
              onChange={(e) => setActivityForm({ ...activityForm, source: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            >
              <option value="linkedin">LinkedIn</option>
              <option value="notion">Notion</option>
              <option value="gmail">Gmail</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="manual">Manual Log</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Summary / Key Notes</label>
          <textarea
            rows={4}
            placeholder="Bullet points or summary of the conversation..."
            value={activityForm.summary}
            onChange={(e) => setActivityForm({ ...activityForm, summary: e.target.value })}
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
            className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Activity'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
