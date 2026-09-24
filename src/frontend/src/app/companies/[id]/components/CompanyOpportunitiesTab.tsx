import React from 'react';

interface CompanyOpportunitiesTabProps {
  opportunities: any[];
  totalOppValue: number;
  onAddOpportunity: () => void;
  onAdvanceOpportunity: (oppId: string) => void;
}

export const CompanyOpportunitiesTab: React.FC<CompanyOpportunitiesTabProps> = ({
  opportunities,
  totalOppValue,
  onAddOpportunity,
  onAdvanceOpportunity,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Deals & Opportunities Pipeline</h2>
          <p className="text-xs text-slate-500">
            Total pipeline value: <span className="font-semibold text-emerald-700">€{totalOppValue.toLocaleString()}</span> across{' '}
            {opportunities.length} deals.
          </p>
        </div>
        <button
          onClick={onAddOpportunity}
          className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition"
        >
          + New Deal
        </button>
      </div>

      {opportunities.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3 shadow-sm">
          <p className="text-sm text-slate-500">No deals currently linked to this company.</p>
          <button
            onClick={onAddOpportunity}
            className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
          >
            + Create Deal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{opp.title}</h3>
                    <div className="text-base font-extrabold text-emerald-700 mt-1">
                      {opp.value ? `€${Number(opp.value).toLocaleString()}` : 'Value Unspecified'}
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {opp.stage.replace(/_/g, ' ')}
                  </span>
                </div>

                {opp.probability !== null && (
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                      <span>Confidence Level</span>
                      <span>{opp.probability}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${opp.probability}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {opp.notes && <p className="text-xs text-slate-600 mt-3 bg-slate-50 p-2.5 rounded border">{opp.notes}</p>}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">
                  {opp.expected_close_date ? `Close: ${opp.expected_close_date}` : 'No target date'}
                </span>
                {opp.stage !== 'closed_won' && opp.stage !== 'closed_lost' && (
                  <button
                    onClick={() => onAdvanceOpportunity(opp.id)}
                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
                  >
                    Advance Stage →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanyOpportunitiesTab;
