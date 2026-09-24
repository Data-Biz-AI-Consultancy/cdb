import React from 'react';

interface CompanyLeadsTabProps {
  leads: any[];
  onAddLead: () => void;
  onConvertLead: (leadId: string, leadTitle: string) => void;
}

export const CompanyLeadsTab: React.FC<CompanyLeadsTabProps> = ({
  leads,
  onAddLead,
  onConvertLead,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Leads & Inbound Signals</h2>
          <p className="text-xs text-slate-500">{leads.length} active lead signals registered for this account.</p>
        </div>
        <button
          onClick={onAddLead}
          className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 shadow-sm transition"
        >
          + New Lead
        </button>
      </div>

      {leads.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3 shadow-sm">
          <p className="text-sm text-slate-500">No leads currently tracked for this company.</p>
          <button
            onClick={onAddLead}
            className="px-3.5 py-2 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 shadow-sm"
          >
            + Create Lead
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{lead.title}</h3>
                    {lead.intent && <div className="text-xs font-medium text-slate-600 mt-1">Intent: {lead.intent}</div>}
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                    {lead.stage}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {lead.signal_strength && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      Signal: {lead.signal_strength}
                    </span>
                  )}
                  {lead.source && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {lead.source}
                    </span>
                  )}
                </div>

                {(lead.description || lead.notes) && (
                  <p className="text-xs text-slate-600 mt-3 bg-slate-50 p-2.5 rounded border leading-relaxed">
                    {lead.description || lead.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">
                  {new Date(lead.created_at).toLocaleDateString()}
                </span>
                {lead.stage !== 'converted' && lead.stage !== 'disqualified' && (
                  <button
                    onClick={() => onConvertLead(lead.id, lead.title)}
                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition"
                  >
                    Convert to Opp →
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

export default CompanyLeadsTab;
