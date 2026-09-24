import React from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/currency';

interface CompanyEngagementsTabProps {
  company: any;
  engagements: any[];
}

export const CompanyEngagementsTab: React.FC<CompanyEngagementsTabProps> = ({
  company,
  engagements,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>📋</span> Client Engagements & Signed Contracts
          </h2>
          <p className="text-xs text-slate-500">Active and historical delivery work with {company.name}.</p>
        </div>
        <Link
          href="/engagements"
          className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>+</span> Log New Engagement
        </Link>
      </div>

      {engagements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-6 space-y-2">
          <span className="text-3xl">📋</span>
          <p className="text-sm font-semibold text-slate-700">No active client engagements logged for {company.name}.</p>
          <p className="text-xs text-slate-400">Track signed contracts, daily/hourly rates, terms & conditions, and meeting notes.</p>
          <Link
            href="/engagements"
            className="inline-block mt-3 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Engagement
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {engagements.map((eng: any) => (
            <div
              key={eng.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 p-5 shadow-sm space-y-3 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      eng.status === 'active'
                        ? 'bg-emerald-500'
                        : eng.status === 'in_delivery'
                        ? 'bg-blue-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <Link
                    href={`/engagements/${eng.id}`}
                    className="text-base font-bold text-slate-900 hover:text-blue-600 transition"
                  >
                    {eng.title}
                  </Link>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                    {eng.engagement_type?.replace('_', ' ') || 'Consultancy'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {eng.rate_value ? (
                      <span className="text-sm font-bold text-slate-900">
                        {formatMoney(eng.rate_value, eng.currency)} <span className="text-xs font-medium text-slate-500">/{eng.rate_type}</span>
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-slate-900">
                        {formatMoney(eng.total_value, eng.currency, { includeCode: true })}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${
                      eng.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : eng.status === 'in_delivery'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {eng.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400">Contract Ref:</span>{' '}
                  <span className="font-mono font-medium text-slate-800">
                    {eng.contract_ref || 'Signed Agreement'}
                  </span>
                  {eng.signed_at && <span className="text-slate-400 ml-1">({eng.signed_at})</span>}
                </div>

                <div>
                  <span className="text-slate-400">Timeline:</span>{' '}
                  <span className="font-medium text-slate-800">
                    {eng.start_date || 'Start'} → {eng.expected_end_date || 'Open-ended'}
                  </span>
                </div>
              </div>

              {eng.terms_and_conditions && (
                <div className="bg-slate-50 p-2.5 rounded-lg text-xs text-slate-700 border border-slate-100">
                  <span className="font-semibold text-slate-800">T&C:</span> {eng.terms_and_conditions}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Link
                  href={`/engagements/${eng.id}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Open Engagement Workspace →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanyEngagementsTab;
