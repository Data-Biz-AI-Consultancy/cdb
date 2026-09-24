'use client';

import React from 'react';
import { formatDate } from '@/lib/dateUtils';

interface PersonOpportunitiesTabProps {
  fullName: string;
  opportunities: any[];
  onOpenAddOppModal: () => void;
  onAdvanceOpportunity: (id: string) => Promise<void>;
}

export function PersonOpportunitiesTab({
  fullName,
  opportunities,
  onOpenAddOppModal,
  onAdvanceOpportunity,
}: PersonOpportunitiesTabProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Opportunities Attached ({opportunities.length})
          </h2>
          <p className="text-xs text-slate-500">
            Sales pipeline and consulting deals involving {fullName}
          </p>
        </div>
        <button
          onClick={onOpenAddOppModal}
          className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-3.5 py-2 rounded-lg shadow-sm"
        >
          + New Opportunity
        </button>
      </div>

      {opportunities.length === 0 ? (
        <div className="p-10 text-center text-slate-500 space-y-2">
          <p className="text-sm">
            No sales deals or opportunities currently attached to this person.
          </p>
          <button
            onClick={onOpenAddOppModal}
            className="text-xs text-emerald-700 hover:underline font-semibold"
          >
            + Create new opportunity for {fullName}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Deal Title</th>
                <th className="p-3">Stage</th>
                <th className="p-3">Value</th>
                <th className="p-3">Probability</th>
                <th className="p-3">Expected Close</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {opportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">{opp.title}</div>
                    {opp.notes && (
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{opp.notes}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="text-xs uppercase font-bold bg-slate-100 text-slate-800 border px-2 py-0.5 rounded">
                      {opp.stage.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-emerald-700">
                    {opp.value
                      ? `${opp.currency || '€'} ${Number(opp.value).toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="p-3 text-slate-700">
                    {opp.probability ? `${opp.probability}%` : '—'}
                  </td>
                  <td className="p-3 text-xs text-slate-500">
                    {opp.expected_close_date ? formatDate(opp.expected_close_date) : '—'}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    {opp.stage !== 'closed_won' && opp.stage !== 'closed_lost' && (
                      <button
                        onClick={() => onAdvanceOpportunity(opp.id)}
                        className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium px-2.5 py-1 rounded"
                      >
                        Advance Stage →
                      </button>
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
