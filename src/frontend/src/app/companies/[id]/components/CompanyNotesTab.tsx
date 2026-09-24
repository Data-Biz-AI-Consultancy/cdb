import React from 'react';

interface CompanyNotesTabProps {
  companyNotes: any[];
  noteForm: { title: string; summary: string };
  setNoteForm: React.Dispatch<React.SetStateAction<{ title: string; summary: string }>>;
  onAddNote: (e?: React.FormEvent) => void;
}

export const CompanyNotesTab: React.FC<CompanyNotesTabProps> = ({
  companyNotes,
  noteForm,
  setNoteForm,
  onAddNote,
}) => {
  return (
    <div className="space-y-6">
      {/* Quick Note Composer */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <span>📌</span>
          <span>Internal Company Scratchpad & Notes</span>
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            value={noteForm.title}
            onChange={(e) => setNoteForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Note title (e.g. Q4 Budget Discussion, Tech Stack Audit)..."
            className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={noteForm.summary}
            onChange={(e) => setNoteForm((prev) => ({ ...prev, summary: e.target.value }))}
            rows={3}
            placeholder="Write internal observations, meeting notes, stakeholder sentiments, or action items..."
            className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onAddNote()}
              disabled={!noteForm.summary.trim()}
              className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50 shadow-sm"
            >
              Save Internal Note
            </button>
          </div>
        </div>
      </div>

      {/* Notes Feed */}
      {companyNotes.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm shadow-sm">
          No internal notes recorded yet for this company.
        </div>
      ) : (
        <div className="space-y-3">
          {companyNotes.map((n) => (
            <div key={n.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">{n.title || 'Internal Note'}</span>
                <span className="text-slate-400 font-mono">{new Date(n.occurred_at).toLocaleString()}</span>
              </div>
              <p className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">
                {n.summary}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanyNotesTab;
