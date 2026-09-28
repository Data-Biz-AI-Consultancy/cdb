'use client';

import { useState } from 'react';

export default function OrganizationSettingsPage() {
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handleExport = () => {
    setExportStatus('Exporting complete tenant manifest (JSON + CSV)...');
    setTimeout(() => {
      setExportStatus('GDPR Export generated successfully (Download Ready).');
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700">
              Tenant & Compliance
            </span>
            <span className="text-xs text-slate-500 font-mono">Hetzner EU Sovereign Cloud</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Organization & GDPR Governance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your organization profile, team members, data retention policies, and GDPR Right-to-be-Forgotten requests.
          </p>
        </div>
      </div>

      {/* Team & Org Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Organization Profile</h2>
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Organization Name</label>
              <input
                type="text"
                defaultValue="Data Biz Demo Org"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 font-medium bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Primary Tenant Domain</label>
              <input
                type="text"
                defaultValue="demo.databiz.ai"
                disabled
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-500 bg-slate-100"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Cloud Deployment Region</label>
              <div className="text-slate-800 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Hetzner Cloud — Falkenstein / Nuremberg (EU-GDPR)
              </div>
            </div>
          </div>
        </div>

        {/* GDPR Compliance & Data Portability */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-2">GDPR Compliance & Data Sovereignty</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Execute full tenant portable data exports (Article 20) and automated Right-to-be-Forgotten data erasure cascades (Article 17).
          </p>

          <div className="space-y-3">
            <button
              onClick={handleExport}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export Full GDPR Tenant Archive</span>
            </button>

            {exportStatus && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium text-center">
                {exportStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
