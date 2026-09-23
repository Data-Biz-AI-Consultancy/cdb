'use client';

import React from 'react';
import { SignalMetricsResponse } from '../types';
import { getCategoryBadge, getSeverityBadge } from '../utils';

interface SignalMetricsTabProps {
  metrics: SignalMetricsResponse | null;
  lookbackDays: number;
  onLookbackChange: (days: number) => void;
  onDrilldownSignal: (signalKey: string, category?: string | null, severity?: string | null) => void;
  onDrilldownSeverity: (severityKey: string) => void;
}

export const SignalMetricsTab: React.FC<SignalMetricsTabProps> = ({
  metrics,
  lookbackDays,
  onLookbackChange,
  onDrilldownSignal,
  onDrilldownSeverity,
}) => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Signal Quality, MTTA Latency & Business Outcomes
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluation window: {lookbackDays} days. Comprehensive operational precision and revenue impact.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          {[
            { label: '90d (Default)', days: 90 },
            { label: '180d', days: 180 },
            { label: '1 Year', days: 365 },
            { label: '2 Years', days: 730 },
          ].map((tf) => (
            <button
              key={tf.days}
              onClick={() => onLookbackChange(tf.days)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                lookbackDays === tf.days
                  ? 'bg-white text-purple-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {!metrics ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          Loading signal metrics...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 4 Primary KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Action & Acceptance Rate */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Action / Acceptance Rate
                </span>
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-base">
                  🎯
                </span>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900">
                  {(metrics.quality.action_rate * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {metrics.quality.total_actioned} actioned · {metrics.quality.total_dismissed} dismissed
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Precision Proxy:</span>
                <span className="font-semibold text-slate-800">
                  {(metrics.quality.precision_proxy * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* 2. Mean Time to Action (MTTA) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Time-to-Action (MTTA)
                </span>
                <span className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-base">
                  ⏱️
                </span>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900">
                  {metrics.latency.mean_time_to_action_hours !== null &&
                  metrics.latency.mean_time_to_action_hours !== undefined
                    ? `${metrics.latency.mean_time_to_action_hours} hrs`
                    : '—'}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Median (p50):{' '}
                  {metrics.latency.median_time_to_action_hours !== null &&
                  metrics.latency.median_time_to_action_hours !== undefined
                    ? `${metrics.latency.median_time_to_action_hours} hrs`
                    : '—'}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>SLA Breaches:</span>
                <span
                  className={`font-semibold ${
                    metrics.latency.sla_breach_count > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {metrics.latency.sla_breach_count} ({(metrics.latency.sla_breach_rate * 100).toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* 3. Influenced Pipeline */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Influenced Pipeline
                </span>
                <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-base">
                  💰
                </span>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900">
                  ${Number(metrics.revenue.influenced_pipeline_total).toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Weighted: ${Number(metrics.revenue.weighted_influenced_pipeline_total).toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Protected Revenue:</span>
                <span className="font-semibold text-emerald-700">
                  ${Number(metrics.revenue.protected_revenue_total).toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>

            {/* 4. Downstream Outcomes (90-Day Window) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  90d Downstream Outcomes
                </span>
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-base">
                  🚀
                </span>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900">
                  {metrics.outcomes.opportunities_created_count} Deals
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {(metrics.outcomes.opportunity_conversion_rate * 100).toFixed(1)}% Conversion Rate
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Reactivations:</span>
                <span className="font-semibold text-slate-800">
                  {metrics.outcomes.account_reactivations_count} accounts
                </span>
              </div>
            </div>
          </div>

          {/* Safeguards & Data Quality Health Indicators Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs flex items-center justify-between shadow-xs">
              <div>
                <p className="text-slate-500 font-medium">False Positive Rate (FPR)</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">
                  {metrics.quality.false_positive_rate !== undefined
                    ? `${(metrics.quality.false_positive_rate * 100).toFixed(1)}%`
                    : '0.0%'}
                </p>
              </div>
              <span className="text-rose-600 font-mono font-semibold">
                {metrics.quality.total_false_positives || 0} reported
              </span>
            </div>

            <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 text-xs flex items-center justify-between shadow-xs">
              <div>
                <p className="text-amber-800 font-medium">Quality Warnings Rate</p>
                <p className="text-xl font-bold text-amber-950 mt-0.5">
                  {metrics.quality.quality_warning_rate !== undefined
                    ? `${(metrics.quality.quality_warning_rate * 100).toFixed(1)}%`
                    : '0.0%'}
                </p>
              </div>
              <span className="text-amber-700 font-medium">
                {Math.round((metrics.quality.quality_warning_rate || 0) * (metrics.quality.total_detected || 0))} signals
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs flex items-center justify-between shadow-xs">
              <div>
                <p className="text-slate-500 font-medium">Source Reliability</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {metrics.quality.source_reliability_breakdown ? (
                    <span>
                      <span className="text-emerald-700">{metrics.quality.source_reliability_breakdown.high || 0}H</span> ·{' '}
                      <span className="text-blue-700">{metrics.quality.source_reliability_breakdown.medium || 0}M</span> ·{' '}
                      <span className="text-amber-700">{metrics.quality.source_reliability_breakdown.low || 0}L</span> ·{' '}
                      <span className="text-rose-700">{metrics.quality.source_reliability_breakdown.unreliable || 0}U</span>
                    </span>
                  ) : (
                    '100% High'
                  )}
                </p>
              </div>
              <span className="text-slate-400 font-mono">H / M / L / U</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs flex items-center justify-between shadow-xs">
              <div>
                <p className="text-slate-500 font-medium">Verification Needed</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">
                  {(metrics.quality.needs_verification_rate * 100).toFixed(1)}%
                </p>
              </div>
              <span className="text-amber-600 font-mono">Uncertainty</span>
            </div>
          </div>

          {/* Detailed Breakdown by Signal Type Table */}
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
                Window: {metrics.lookback_days} days
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
                  {metrics.by_signal.map((row) => (
                    <tr
                      key={row.key}
                      onClick={() => onDrilldownSignal(row.key, row.category, row.severity)}
                      className="hover:bg-purple-50/60 cursor-pointer transition group"
                      title={`Click to view and triage all ${row.label} signals`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2 group-hover:text-purple-700">
                        <span>{row.label}</span>
                        <span className="text-[10px] text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity font-normal">
                          → View Signals
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {row.category && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryBadge(
                              row.category
                            )}`}
                          >
                            {row.category}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {row.severity && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getSeverityBadge(
                              row.severity
                            )}`}
                          >
                            {row.severity}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                        {row.total_detected}
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

          {/* By Severity Breakdown Grid */}
          {metrics.by_severity && metrics.by_severity.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Filter by Severity Volume & Action Rate
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {metrics.by_severity.map((sev) => (
                  <button
                    key={sev.key}
                    onClick={() => onDrilldownSeverity(sev.key.toLowerCase())}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/40 text-left transition flex flex-col justify-between cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase border ${getSeverityBadge(
                          sev.key
                        )}`}
                      >
                        {sev.key}
                      </span>
                      <span className="text-xs text-purple-600 font-semibold">Triage →</span>
                    </div>
                    <div className="mt-2">
                      <div className="text-xl font-bold text-slate-900">
                        {sev.total_detected} Detected
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Action Rate: {(sev.action_rate * 100).toFixed(1)}% · ${Number(sev.influenced_pipeline).toLocaleString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
