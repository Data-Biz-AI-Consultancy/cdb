import React from 'react';

interface CompanyProfileTabProps {
  company: any;
  onEditCompany: () => void;
}

export const CompanyProfileTab: React.FC<CompanyProfileTabProps> = ({
  company,
  onEditCompany,
}) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Company Intelligence & Profile</h2>
          <p className="text-xs text-slate-500">Firmographic profile data, location, domain, and custom tags.</p>
        </div>
        <button
          onClick={onEditCompany}
          className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
        >
          ✎ Edit Information
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div className="space-y-4">
          <div>
            <dt className="text-xs text-slate-500 font-medium">Company Name</dt>
            <dd className="text-slate-900 font-bold text-base mt-0.5">{company.name}</dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500 font-medium">Domain</dt>
            <dd className="text-slate-900 font-mono text-xs mt-0.5">{company.domain || '—'}</dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500 font-medium">Industry</dt>
            <dd className="text-slate-900 font-medium mt-0.5">{company.industry || '—'}</dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500 font-medium">Company Size</dt>
            <dd className="text-slate-900 font-medium mt-0.5">{company.size_range || '—'}</dd>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <dt className="text-xs text-slate-500 font-medium">Headquarters Location</dt>
            <dd className="text-slate-900 font-medium mt-0.5">
              {[company.city, company.country].filter(Boolean).join(', ') || '—'}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500 font-medium">LinkedIn URL</dt>
            <dd className="text-slate-900 mt-0.5">
              {company.linkedin_url ? (
                <a
                  href={company.linkedin_url.startsWith('http') ? company.linkedin_url : `https://${company.linkedin_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs"
                >
                  {company.linkedin_url} ↗
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500 font-medium">Record Timestamps</dt>
            <dd className="text-slate-600 font-mono text-xs mt-0.5">
              Created: {new Date(company.created_at).toLocaleDateString()} · Updated:{' '}
              {new Date(company.updated_at).toLocaleDateString()}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500 font-medium">Internal Notes & Context</dt>
            <dd className="text-slate-700 text-xs mt-0.5 bg-slate-50 p-2.5 rounded border">
              {company.attributes?.notes || 'No overview notes entered.'}
            </dd>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfileTab;
