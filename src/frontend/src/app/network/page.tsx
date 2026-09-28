'use client';

import { useState } from 'react';

export default function NetworkPage() {
  const [participating, setParticipating] = useState(true);
  const [piiStrict, setPiiStrict] = useState(true);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700">
              Consented Network
            </span>
            <span className="text-xs text-slate-500 font-mono">Give-to-Get Exchange</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Privacy-Preserving Company Exchange</h1>
          <p className="text-sm text-slate-500 mt-1">
            Contribute anonymized company domain metadata to gain real-time signals from across the CDB network.
          </p>
        </div>

        {/* Network status pill */}
        <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-200">Network Active</span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div className="text-xs font-mono text-emerald-400">1,248,920 Anonymized Records</div>
        </div>
      </div>

      {/* Network Boundary Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-2">Network Participation ("Give-to-Get")</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            By enabling participation, your tenant contributes non-PII firmographic updates (company names, industry, domain, employee tiers) and in return unlocks continuous signal triggers.
          </p>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-900">Enable Network Exchange</div>
              <div className="text-[11px] text-slate-500">Status: {participating ? 'Active (Consented)' : 'Opted-out'}</div>
            </div>
            <button
              onClick={() => setParticipating(!participating)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                participating ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  participating ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-2">Zero-PII Sanitization Boundary</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Strict automated inspection strips emails, phone numbers, person identities, and activity notes before any payload leaves your tenant perimeter.
          </p>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-900">PII Strict Sanitizer</div>
              <div className="text-[11px] text-slate-500">Enforced by SHA-256 HMAC validation</div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
              Hardcoded Invariant
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
