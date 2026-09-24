'use client';

import Link from 'next/link';
import { SignalMetricsBreakdownItem } from '../types';
import { getSeverityBadge, getCategoryBadge } from '../utils';

interface AnalyticsDistributionGridProps {
  byCategory: SignalMetricsBreakdownItem[];
  bySeverity: SignalMetricsBreakdownItem[];
}

export function AnalyticsDistributionGrid({
  byCategory,
  bySeverity,
}: AnalyticsDistributionGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* By Category */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Breakdown by Category
          </h4>
          <span className="text-[11px] text-slate-400">Click to filter Radar</span>
        </div>
        <div className="space-y-3">
          {byCategory.map((cat) => (
            <Link
              key={cat.key}
              href={`/signals?category=${encodeURIComponent(cat.key.toLowerCase())}`}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition border border-slate-100 text-xs cursor-pointer group"
              title={`View all ${cat.total_detected} ${cat.label} signals in Signals Radar`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full border font-semibold text-[11px] ${getCategoryBadge(
                    cat.key
                  )}`}
                >
                  {cat.label}
                </span>
                <span className="text-slate-500 group-hover:text-slate-800 font-medium">
                  ({cat.total_detected} detected)
                </span>
              </div>
              <div className="flex items-center gap-4 text-right">
                <span className="font-semibold text-emerald-700">
                  {(cat.action_rate * 100).toFixed(1)}% actioned
                </span>
                <span className="font-bold text-slate-900">
                  ${Number(cat.influenced_pipeline).toLocaleString()}
                </span>
                <span className="text-slate-400 group-hover:text-emerald-600 font-bold ml-1 text-sm">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* By Severity */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Breakdown by Severity Level
          </h4>
          <span className="text-[11px] text-slate-400">Click to filter Radar</span>
        </div>
        <div className="space-y-3">
          {bySeverity.map((sev) => (
            <Link
              key={sev.key}
              href={`/signals?severity=${encodeURIComponent(sev.key.toLowerCase())}`}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition border border-slate-100 text-xs cursor-pointer group"
              title={`View all ${sev.total_detected} ${sev.label} severity signals in Signals Radar`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full border font-semibold text-[11px] ${getSeverityBadge(
                    sev.key
                  )}`}
                >
                  {sev.label}
                </span>
                <span className="text-slate-500 group-hover:text-slate-800 font-medium">
                  ({sev.total_detected} detected)
                </span>
              </div>
              <div className="flex items-center gap-4 text-right">
                <span className="font-semibold text-emerald-700">
                  {(sev.action_rate * 100).toFixed(1)}% actioned
                </span>
                <span className="font-bold text-slate-900">
                  ${Number(sev.influenced_pipeline).toLocaleString()}
                </span>
                <span className="text-slate-400 group-hover:text-emerald-600 font-bold ml-1 text-sm">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
