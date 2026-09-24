'use client';

import React from 'react';

interface PersonLeadsTabProps {
  fullName: string;
  leads: any[];
  onOpenAddLeadModal: () => void;
  onConvertLead: (id: string, title: string) => Promise<void>;
}

export function PersonLeadsTab({
  fullName,
  leads,
  onOpenAddLeadModal,
  onConvertLead,
}: PersonLeadsTabProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900">Leads Attached ({leads.length})</h2>
          <p className="text-xs text-slate-500">Inbound signals and leads linked to {fullName}</p>
        </div>
        <button
          onClick={onOpenAddLeadModal}
          className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3.5 py-2 rounded-lg shadow-sm"
        >
          + New Lead
        </button>
      </div>

      {leads.length === 0 ? (
        <div className="p-10 text-center text-slate-500 space-y-2">
          <p className="text-sm">No leads currently attached to this person.</p>
          <button
            onClick={onOpenAddLeadModal}
            className="text-xs text-amber-700 hover:underline font-semibold"
          >
            + Add inbound lead for {fullName}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Lead Title</th>
                <th className="p-3">Stage</th>
                <th className="p-3">Source</th>
                <th className="p-3">Intent / Signals</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">{l.title || 'Untitled Lead'}</div>
                    {(l.description || l.notes) && (
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {l.description || l.notes}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="text-xs uppercase font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                      {l.stage}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 font-mono text-xs">{l.source}</td>
                  <td className="p-3 text-xs text-slate-700">
                    {l.intent && <div className="font-medium">{l.intent}</div>}
                    {l.signal_strength && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase">
                        Signal: {l.signal_strength}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {l.stage !== 'converted' ? (
                      <button
                        onClick={() => onConvertLead(l.id, l.title)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded font-semibold transition"
                      >
                        Convert to Opp →
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-700 font-semibold">✓ Converted</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
