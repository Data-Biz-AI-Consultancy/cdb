import React from 'react';
import Link from 'next/link';

interface CompanyHeroHeaderProps {
  company: any;
  employees: any[];
  opportunities: any[];
  leads: any[];
  activities: any[];
  detectedSignals: any[];
  onLogActivity: () => void;
  onAddNote: () => void;
  onLinkContact: () => void;
  onAddOpportunity: () => void;
  onAddLead: () => void;
  onEditCompany: () => void;
  onReviewSignals: () => void;
}

export const CompanyHeroHeader: React.FC<CompanyHeroHeaderProps> = ({
  company,
  employees,
  opportunities,
  leads,
  activities,
  detectedSignals,
  onLogActivity,
  onAddNote,
  onLinkContact,
  onAddOpportunity,
  onAddLead,
  onEditCompany,
  onReviewSignals,
}) => {
  const currentEmployeesCount = employees.filter((e) => e.is_current).length;
  const alumniCount = employees.filter((e) => !e.is_current).length;
  const totalOppValue = opportunities.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
  const customTags: string[] = Array.isArray(company.attributes?.tags) ? company.attributes.tags : [];
  const activeSignals = detectedSignals.filter((s) => s.status === 'active');

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/companies"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <span>←</span>
          <span>Back to Companies Directory</span>
        </Link>
        <span className="text-xs text-slate-400 font-mono">ID: {company.id}</span>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left Avatar & Identity */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-700 to-slate-900 text-white flex items-center justify-center text-xl font-bold tracking-tight shadow-md shrink-0 border-2 border-slate-700">
              {company.name?.[0]?.toUpperCase() || 'C'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{company.name}</h1>
                {company.industry && (
                  <span className="text-xs px-3 py-1 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {company.industry}
                  </span>
                )}
                {company.size_range && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    👥 {company.size_range}
                  </span>
                )}
              </div>

              {/* Domain, Location & Social */}
              <div className="text-sm text-slate-600 mt-2 flex flex-wrap items-center gap-3">
                {company.domain && (
                  <a
                    href={`https://${company.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-mono text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-200"
                  >
                    <span>🌐</span>
                    <span>{company.domain}</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                )}
                {(company.city || company.country) && (
                  <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
                    <span>📍</span>
                    <span>{[company.city, company.country].filter(Boolean).join(', ')}</span>
                  </span>
                )}
                {company.linkedin_url && (
                  <a
                    href={company.linkedin_url.startsWith('http') ? company.linkedin_url : `https://${company.linkedin_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-700 hover:underline text-xs bg-sky-50 px-2 py-0.5 rounded border border-sky-200"
                  >
                    <span>💼 LinkedIn</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                )}
              </div>

              {/* Tags */}
              {customTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {customTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-mono px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md border border-slate-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onLogActivity}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-sm transition flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Log Activity</span>
            </button>
            <button
              onClick={onAddNote}
              className="px-3.5 py-2 text-xs font-semibold bg-white text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm transition flex items-center gap-1.5"
            >
              <span>📌</span>
              <span>Add Note</span>
            </button>
            <button
              onClick={onLinkContact}
              className="px-3.5 py-2 text-xs font-semibold bg-white text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm transition flex items-center gap-1.5"
            >
              <span>👥</span>
              <span>Link Contact</span>
            </button>
            <button
              onClick={onAddOpportunity}
              className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-sm transition flex items-center gap-1.5"
            >
              <span>💼</span>
              <span>New Deal</span>
            </button>
            <button
              onClick={onAddLead}
              className="px-3.5 py-2 text-xs font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-600 shadow-sm transition flex items-center gap-1.5"
            >
              <span>🎯</span>
              <span>New Lead</span>
            </button>
            <button
              onClick={onEditCompany}
              className="px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-200 transition flex items-center gap-1"
            >
              <span>✏️</span>
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Key KPI Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Associated Contacts</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{employees.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              <span className="text-emerald-700 font-semibold">{currentEmployeesCount} active</span> · {alumniCount} alumni
            </div>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Pipeline Value</div>
            <div className="text-xl font-bold text-emerald-700 mt-0.5">€{totalOppValue.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{opportunities.length} open/active deals</div>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active Leads</div>
            <div className="text-xl font-bold text-amber-600 mt-0.5">{leads.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Inbound & outbound signals</div>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Activities Logged</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">{activities.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Meetings, notes & touchpoints</div>
          </div>
        </div>

        {/* Active Signals Alert Banner */}
        {activeSignals.length > 0 && (
          <div className="mt-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-300/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl font-bold shadow-xs">
                ⚡
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>{activeSignals.length} Active Opportunity & Risk Signals Detected</span>
                  {activeSignals.some((s) => s.severity === 'critical') && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600 text-white font-bold uppercase tracking-wider">
                      Critical SLA
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Actionable relationship moments detected across touchpoints, contracts, and company enrichment data.
                </p>
              </div>
            </div>

            <button
              onClick={onReviewSignals}
              className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition shrink-0 shadow-xs self-start sm:self-auto"
            >
              Review Signals →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyHeroHeader;
