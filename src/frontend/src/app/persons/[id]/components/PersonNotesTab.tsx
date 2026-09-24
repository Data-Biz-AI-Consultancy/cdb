'use client';

import React, { useState } from 'react';
import { formatDateTime } from '@/lib/dateUtils';
import { NoteFormData } from '../types';

interface PersonNotesTabProps {
  fullName: string;
  notes: any[];
  onAddNote: (data: NoteFormData) => Promise<void>;
  onOpenAddNoteModal: () => void;
}

export function PersonNotesTab({
  fullName,
  notes,
  onAddNote,
  onOpenAddNoteModal,
}: PersonNotesTabProps) {
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
      await onAddNote(noteForm);
      setNoteForm({ title: '', summary: '' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Note Composer Card */}
      <div className="bg-white border border-amber-200/80 rounded-xl p-5 shadow-sm space-y-3 bg-gradient-to-br from-amber-50/30 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📝</span>
            <h3 className="text-sm font-bold text-slate-900">Add Quick Note for {fullName}</h3>
          </div>
          <span className="text-xs text-amber-700 bg-amber-100/70 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
            Internal CRM Scratchpad
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="Note Title or Subject (optional, e.g. Sync notes, Personality traits, Preferences)"
            value={noteForm.title}
            onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          />

          <textarea
            required
            rows={3}
            placeholder="Write observations, meeting follow-ups, decision-making notes, or key details..."
            value={noteForm.summary}
            onChange={(e) => setNoteForm({ ...noteForm, summary: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition resize-y"
          />

          <div className="flex justify-between items-center pt-1">
            <span className="text-[11px] text-slate-400">
              Notes are saved immediately and recorded in the audit changelog.
            </span>
            <button
              type="submit"
              disabled={submitting || !noteForm.summary.trim()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              <span>+</span>
              <span>{submitting ? 'Posting...' : 'Post Note'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Notes List */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Notes History ({notes.length})
            </h3>
            <p className="text-xs text-slate-500">
              All internal notes and memos recorded for this person
            </p>
          </div>
          <button
            onClick={onOpenAddNoteModal}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium shadow-sm transition"
          >
            + Add Note
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="p-10 text-center text-slate-500 space-y-2">
            <div className="text-3xl">📝</div>
            <p className="text-sm font-medium text-slate-700">No notes written yet</p>
            <p className="text-xs text-slate-500">
              Use the quick composer above or click "+ Add Note" to log your first note.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => {
              const dateStr = formatDateTime(note.occurred_at || note.created_at);

              return (
                <div
                  key={note.id}
                  className="p-4 bg-amber-50/20 border border-amber-200/60 rounded-xl shadow-sm hover:border-amber-300 transition space-y-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📝</span>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {note.title || 'Internal Note'}
                      </h4>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{dateStr}</span>
                  </div>

                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-white/80 p-3 rounded-lg border border-amber-100">
                    {note.summary}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
