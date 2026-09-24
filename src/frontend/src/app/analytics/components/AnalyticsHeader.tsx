'use client';

import Link from 'next/link';

export function AnalyticsHeader() {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-lg border border-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold tracking-wider uppercase border border-purple-500/30">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Intelligence & Performance Analytics
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Signal Performance & ROI Analytics
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
            Real-time measurement of detection precision, operational turnaround latency (MTTA),
            downstream opportunity creation, account reactivation, and revenue attribution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/signals"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 shadow-sm"
          >
            <span>⚡</span>
            <span>Open Signals Radar</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
