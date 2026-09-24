'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/Modal';
import { LogActivityFormData, EngagementPersonItem } from '../../types';

interface LogActivityModalProps {
  isOpen: boolean;
  persons?: EngagementPersonItem[];
  onClose: () => void;
  onSubmit: (data: LogActivityFormData) => Promise<void>;
}

export function LogActivityModal({
  isOpen,
  persons,
  onClose,
  onSubmit,
}: LogActivityModalProps) {
  const [actTitle, setActTitle] = useState('');
  const [actType, setActType] = useState('meeting');
  const [actSource, setActSource] = useState('notion');
  const [actPersonId, setActPersonId] = useState('');
  const [actSummary, setActSummary] = useState('');
  const [actRawContent, setActRawContent] = useState('');
  const [actOccurredAt, setActOccurredAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        title: actTitle,
        type: actType,
        source: actSource,
        person_id: actPersonId,
        summary: actSummary,
        raw_content: actRawContent,
        occurred_at: actOccurredAt,
      });
      setActTitle('');
      setActSummary('');
      setActRawContent('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Engagement Activity / Note"
      subtitle="Record client sprint sync, architecture decision, meeting note, or message."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Touchpoint / Note Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Sprint 4 Demo & Scope Sign-off"
            value={actTitle}
            onChange={(e) => setActTitle(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Type
            </label>
            <select
              value={actType}
              onChange={(e) => setActType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
            >
              <option value="meeting">Meeting Note</option>
              <option value="linkedin_message">LinkedIn Message</option>
              <option value="call">Phone / Zoom Call</option>
              <option value="email">Email</option>
              <option value="note">Internal CRM Note</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Source
            </label>
            <select
              value={actSource}
              onChange={(e) => setActSource(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
            >
              <option value="notion">Notion</option>
              <option value="linkedin">LinkedIn</option>
              <option value="zoom">Zoom</option>
              <option value="google_meet">Google Meet</option>
              <option value="gmail">Gmail</option>
              <option value="manual">Manual Entry</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={actOccurredAt}
              onChange={(e) => setActOccurredAt(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        {persons && persons.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Associated Stakeholder (optional)
            </label>
            <select
              value={actPersonId}
              onChange={(e) => setActPersonId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
            >
              <option value="">None / General Engagement Note</option>
              {persons.map((p) => (
                <option key={p.person_id} value={p.person_id}>
                  {p.person_name || p.person_email}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Summary / Key Takeaways
          </label>
          <textarea
            rows={3}
            placeholder="Key decisions, action items, blockers discussed..."
            value={actSummary}
            onChange={(e) => setActSummary(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Full Notes / Conversation Transcript (Optional)
          </label>
          <textarea
            rows={4}
            placeholder="Full raw transcript, Notion meeting export, or message log..."
            value={actRawContent}
            onChange={(e) => setActRawContent(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !actTitle.trim()}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Activity'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
