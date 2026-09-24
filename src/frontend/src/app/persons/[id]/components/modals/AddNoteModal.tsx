'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/Modal';
import { NoteFormData } from '../../types';

interface AddNoteModalProps {
  isOpen: boolean;
  personName: string;
  onClose: () => void;
  onSubmit: (data: NoteFormData) => Promise<void>;
}

export function AddNoteModal({ isOpen, personName, onClose, onSubmit }: AddNoteModalProps) {
  const [noteForm, setNoteForm] = useState<NoteFormData>({
    title: '',
    summary: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.summary.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(noteForm);
      setNoteForm({ title: '', summary: '' });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Note for ${personName}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Note Title (optional)
          </label>
          <input
            placeholder="e.g. Sync follow-up, Project scope note, Preferred contact hours"
            value={noteForm.title}
            onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Note Content *
          </label>
          <textarea
            required
            rows={5}
            placeholder="Write your note or observations here..."
            value={noteForm.summary}
            onChange={(e) => setNoteForm({ ...noteForm, summary: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs resize-y"
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
            disabled={submitting || !noteForm.summary.trim()}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            {submitting ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
