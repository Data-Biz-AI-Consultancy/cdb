'use client';

import React from 'react';
import Modal from '@/components/Modal';
import { EditActivityFormData } from '../hooks/useActivities';

interface ActivityEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: EditActivityFormData;
  setForm: React.Dispatch<React.SetStateAction<EditActivityFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
}

export const ActivityEditModal: React.FC<ActivityEditModalProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  onSubmit,
  saving,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Activity Log"
      size="xl"
    >
      <form onSubmit={onSubmit} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="meeting">Meeting</option>
              <option value="linkedin_message">LinkedIn Message</option>
              <option value="email">Email</option>
              <option value="call">Call</option>
              <option value="note">Note</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Occurred At</label>
          <input
            type="datetime-local"
            value={form.occurred_at}
            onChange={(e) => setForm((prev) => ({ ...prev, occurred_at: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Summary</label>
          <textarea
            rows={2}
            value={form.summary}
            onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Raw Transcript / Content</label>
          <textarea
            rows={4}
            value={form.raw_content}
            onChange={(e) => setForm((prev) => ({ ...prev, raw_content: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
          />
        </div>

        <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ActivityEditModal;
