'use client';

import React from 'react';
import { OpportunityHistoryItem } from '../types';

interface OpportunityHistoryTabProps {
  historyItems: OpportunityHistoryItem[];
  historyLoading: boolean;
  newHistoryNote: string;
  setNewHistoryNote: React.Dispatch<React.SetStateAction<string>>;
  savingNote: boolean;
  onAddNote: (e: React.FormEvent) => void;
}

export const OpportunityHistoryTab: React.FC<OpportunityHistoryTabProps> = ({
  historyItems,
  historyLoading,
  newHistoryNote,
  setNewHistoryNote,
  savingNote,
  onAddNote,
}) => {
  return (
    <div className="space-y-5">
      {/* Note Composer */}
      <form
        onSubmit={onAddNote}
        className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2"
      >
        <label className="block text-xs font-semibold text-slate-800">
          📝 Log Meeting Note / Activity
        </label>
        <textarea
          rows={2}
          required
          placeholder="Add an update, call notes, or customer response..."
          value={newHistoryNote}
          onChange={(e) => setNewHistoryNote(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingNote || !newHistoryNote.trim()}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-xs"
          >
            {savingNote ? 'Logging...' : 'Log Activity'}
          </button>
        </div>
      </form>

      {/* History List */}
      {historyLoading ? (
        <div className="text-center py-8 text-slate-400 text-xs flex justify-center items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent" />
          <span>Loading activity timeline...</span>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
          {historyItems.map((h) => (
            <div key={h.id} className="relative pl-6">
              {/* Dot / Icon */}
              <div className="absolute -left-2.5 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center text-[10px]">
                {h.action?.icon || '⏱️'}
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">
                    {h.action?.name || h.action_id}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>

                {h.summary && <p className="text-xs text-slate-600">{h.summary}</p>}

                {/* Diffs display */}
                {h.changes && Object.keys(h.changes).length > 0 && (
                  <div className="mt-2 text-[11px] bg-slate-50 p-2 rounded border border-slate-100 space-y-1">
                    {Object.entries(h.changes).map(([k, val]: [string, any]) => (
                      <div key={k} className="flex items-center gap-1">
                        <span className="font-medium text-slate-500 capitalize">{k}:</span>
                        {typeof val === 'object' && val !== null && 'old' in val && 'new' in val ? (
                          <span>
                            <span className="line-through text-rose-500">{String(val.old)}</span>
                            {' → '}
                            <span className="font-semibold text-emerald-600">{String(val.new)}</span>
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-700">{JSON.stringify(val)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {historyItems.length === 0 && (
            <div className="text-xs text-slate-400 pl-6 italic">No history records found.</div>
          )}
        </div>
      )}
    </div>
  );
};
