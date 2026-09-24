'use client';

import { DetectedSignal } from '../types';

interface SignalLifecycleAuditCardProps {
  signal: DetectedSignal;
}

export function SignalLifecycleAuditCard({ signal }: SignalLifecycleAuditCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
        <span>🛡️</span>
        <span>Lifecycle & Deduplication Audit</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          <span className="text-slate-500 font-medium block">Current Status</span>
          <span className="text-sm font-bold text-slate-900 mt-1 capitalize block">
            {signal.status}
          </span>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          <span className="text-slate-500 font-medium block">Snooze Expiry</span>
          <span className="text-sm font-bold text-purple-700 mt-1 block">
            {signal.snoozed_until ? new Date(signal.snoozed_until).toLocaleDateString() : 'Not Snoozed'}
          </span>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          <span className="text-slate-500 font-medium block">Re-Alert Counter</span>
          <span className="text-sm font-bold text-slate-900 mt-1 block">
            {signal.reopen_count || 0} time(s) re-opened
          </span>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          <span className="text-slate-500 font-medium block">Evidence Fingerprint</span>
          <span
            className="text-xs font-mono text-slate-600 mt-1 block truncate"
            title={signal.evidence_fingerprint || 'None'}
          >
            {signal.evidence_fingerprint
              ? `${signal.evidence_fingerprint.slice(0, 12)}...`
              : 'None'}
          </span>
        </div>
      </div>
    </div>
  );
}
