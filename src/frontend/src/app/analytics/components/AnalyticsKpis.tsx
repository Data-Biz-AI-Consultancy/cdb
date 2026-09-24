'use client';

import { SignalMetricsResponse } from '../types';

interface AnalyticsKpisProps {
  metrics: SignalMetricsResponse;
}

export function AnalyticsKpis({ metrics }: AnalyticsKpisProps) {
  return (
    <div className="space-y-4">
      {/* Top 4 Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Action & Acceptance Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Action / Acceptance Rate
            </span>
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
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
            <span className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-lg">
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
            <span className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
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
            <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
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

      {/* Quality & Detection Health Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs flex items-center justify-between shadow-xs">
          <div>
            <p className="text-slate-500 font-medium">Detection Precision Proxy</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {(metrics.quality.precision_proxy * 100).toFixed(1)}%
            </p>
          </div>
          <span className="text-slate-400 font-mono">1 - Dismiss %</span>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 text-xs flex items-center justify-between shadow-xs">
          <div>
            <p className="text-rose-800 font-medium">False Positive Rate (FPR)</p>
            <p className="text-xl font-bold text-rose-950 mt-0.5">
              {metrics.quality.false_positive_rate !== undefined
                ? `${(metrics.quality.false_positive_rate * 100).toFixed(1)}%`
                : '0.0%'}
            </p>
          </div>
          <span className="text-rose-700 font-medium">
            {metrics.quality.total_false_positives || 0} flagged
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

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 text-xs flex items-center justify-between shadow-xs">
          <div>
            <p className="text-emerald-700 font-medium">Deal Value Coverage</p>
            <p className="text-xl font-bold text-emerald-900 mt-0.5">
              {(metrics.revenue.value_coverage_rate * 100).toFixed(1)}%
            </p>
          </div>
          <span className="text-emerald-600">With Valuations</span>
        </div>
      </div>
    </div>
  );
}
