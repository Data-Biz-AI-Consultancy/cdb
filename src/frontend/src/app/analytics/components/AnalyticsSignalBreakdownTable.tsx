'use client';

import Link from 'next/link';
import { SignalMetricsBreakdownItem } from '../types';
import { getSeverityBadge, getCategoryBadge } from '../utils';

interface AnalyticsSignalBreakdownTableProps {
  lookbackDays: number;
  signals: SignalMetricsBreakdownItem[];
}

export function AnalyticsSignalBreakdownTable({
  lookbackDays,
  signals,
}: AnalyticsSignalBreakdownTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Performance Breakdown by Signal Type
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Triage action rates, latency, and commercial conversion for each signal rule in the catalog.
          </p>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Window: {lookbackDays} days
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4">Signal Name</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">Severity</th>
              <th className="py-3.5 px-4 text-right">Detected</th>
              <th className="py-3.5 px-4 text-right">Actioned</th>
              <th className="py-3.5 px-4 text-right">Action Rate</th>
              <th className="py-3.5 px-4 text-right">MTTA (hrs)</th>
              <th className="py-3.5 px-4 text-right">Opps Created</th>
              <th className="py-3.5 px-4 text-right">Pipeline ($)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {signals.map((row) => (
              <tr key={row.key} className="hover:bg-slate-50/80 transition">
                <td className="py-3.5 px-4 font-semibold text-slate-900">
                  <Link
                    href={`/signals?signal_type=${encodeURIComponent(row.key)}`}
                    className="hover:text-emerald-600 transition flex items-center gap-1.5 group"
                    title={`View all ${row.total_detected} ${row.label} signals in Signals Radar`}
                  >
                    <span className="group-hover:underline">{row.label}</span>
                    <span className="text-slate-400 group-hover:text-emerald-600 text-[10px]">
                      ↗
                    </span>
                  </Link>
                </td>
                <td className="py-3.5 px-4">
                  {row.category && (
                    <Link
                      href={`/signals?category=${encodeURIComponent(row.category.toLowerCase())}`}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border hover:opacity-80 transition inline-block ${getCategoryBadge(
                        row.category
                      )}`}
                      title={`Filter by ${row.category} category`}
                    >
                      {row.category}
                    </Link>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  {row.severity && (
                    <Link
                      href={`/signals?severity=${encodeURIComponent(row.severity.toLowerCase())}`}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border hover:opacity-80 transition inline-block ${getSeverityBadge(
                        row.severity
                      )}`}
                      title={`Filter by ${row.severity} severity`}
                    >
                      {row.severity}
                    </Link>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                  <Link
                    href={`/signals?signal_type=${encodeURIComponent(row.key)}`}
                    className="hover:text-emerald-600 font-bold hover:underline"
                    title={`View ${row.total_detected} detected signals`}
                  >
                    {row.total_detected}
                  </Link>
                </td>
                <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                  {row.actioned_count}
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                  {(row.action_rate * 100).toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                  {row.mean_time_to_action_hours !== null &&
                  row.mean_time_to_action_hours !== undefined
                    ? row.mean_time_to_action_hours
                    : '—'}
                </td>
                <td className="py-3.5 px-4 text-right font-medium text-indigo-700">
                  {row.opportunities_created_count}
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                  ${Number(row.influenced_pipeline).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
