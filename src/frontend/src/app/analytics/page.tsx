'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export interface SignalQualityMetrics {
  total_detected: number;
  total_actioned: number;
  total_dismissed: number;
  total_resolved: number;
  total_active: number;
  action_rate: number;
  dismissal_rate: number;
  precision_proxy: number;
  needs_verification_rate: number;
  conflict_rate: number;
}

export interface SignalLatencyMetrics {
  mean_time_to_action_hours?: number | null;
  median_time_to_action_hours?: number | null;
  sla_breach_count: number;
  sla_breach_rate: number;
  total_actioned_measured: number;
}

export interface SignalOutcomeMetrics {
  attribution_window_days: number;
  opportunities_created_count: number;
  opportunity_conversion_rate: number;
  account_reactivations_count: number;
  account_reactivation_rate: number;
  contracts_renewed_count: number;
  contract_renewal_rate: number;
}

export interface SignalRevenueMetrics {
  influenced_pipeline_total: string | number;
  weighted_influenced_pipeline_total: string | number;
  protected_revenue_total: string | number;
  currency: string;
  value_coverage_rate: number;
}

export interface SignalMetricsBreakdownItem {
  key: string;
  label: string;
  category?: string | null;
  severity?: string | null;
  total_detected: number;
  actioned_count: number;
  dismissed_count: number;
  action_rate: number;
  mean_time_to_action_hours?: number | null;
  opportunities_created_count: number;
  influenced_pipeline: string | number;
}

export interface SignalMetricsResponse {
  lookback_days: number;
  evaluated_at: string;
  quality: SignalQualityMetrics;
  latency: SignalLatencyMetrics;
  outcomes: SignalOutcomeMetrics;
  revenue: SignalRevenueMetrics;
  by_signal: SignalMetricsBreakdownItem[];
  by_category: SignalMetricsBreakdownItem[];
  by_severity: SignalMetricsBreakdownItem[];
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<SignalMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lookbackDays, setLookbackDays] = useState<number>(90);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const loadMetrics = async (days: number = lookbackDays) => {
    try {
      setLoading(true);
      const res = await apiFetch<SignalMetricsResponse>(
        `/api/v1/signals/metrics?lookback_days=${days}`
      );
      if (res && res.quality) {
        setMetrics(res);
      }
    } catch (err) {
      console.error('Failed to load analytics metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleLookbackChange = (days: number) => {
    setLookbackDays(days);
    loadMetrics(days);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-rose-100 text-rose-800 border-rose-200 font-semibold';
      case 'high':
        return 'bg-amber-100 text-amber-800 border-amber-200 font-medium';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'opportunity':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 font-medium';
      case 'risk':
        return 'bg-rose-100 text-rose-800 border-rose-200 font-medium';
      case 'hybrid':
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200 font-medium';
    }
  };

  const filteredSignalBreakdown = metrics?.by_signal.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category?.toLowerCase() === selectedCategory.toLowerCase();
  }) || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header Banner */}
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
              Real-time measurement of detection precision, operational turnaround latency (MTTA), downstream opportunity creation, account reactivation, and revenue attribution.
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

      {/* Control Bar: Lookback Window Selector & Category Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span>Lookback Window:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { label: '30d', days: 30 },
              { label: '90d (Default)', days: 90 },
              { label: '180d', days: 180 },
              { label: '1 Year', days: 365 },
              { label: '2 Years', days: 730 },
            ].map((tf) => (
              <button
                key={tf.days}
                onClick={() => handleLookbackChange(tf.days)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer text-xs ${
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

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span>Filter Category:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { label: 'All Categories', value: 'all' },
              { label: 'Opportunities', value: 'opportunity' },
              { label: 'Risks', value: 'risk' },
              { label: 'Mixed', value: 'hybrid' },
            ].map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer text-xs ${
                  selectedCategory === cat.value
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && !metrics ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          Loading analytics metrics...
        </div>
      ) : !metrics ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          No metrics available.
        </div>
      ) : (
        <div className="space-y-8">
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
                  {metrics.latency.sla_breach_count} ({ (metrics.latency.sla_breach_rate * 100).toFixed(1)}%)
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

            <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 text-xs flex items-center justify-between shadow-xs">
              <div>
                <p className="text-amber-700 font-medium">Needs Verification Rate</p>
                <p className="text-xl font-bold text-amber-900 mt-0.5">
                  {(metrics.quality.needs_verification_rate * 100).toFixed(1)}%
                </p>
              </div>
              <span className="text-amber-600">Ambiguity</span>
            </div>

            <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 text-xs flex items-center justify-between shadow-xs">
              <div>
                <p className="text-rose-700 font-medium">Opposing Conflict Rate</p>
                <p className="text-xl font-bold text-rose-900 mt-0.5">
                  {(metrics.quality.conflict_rate * 100).toFixed(1)}%
                </p>
              </div>
              <span className="text-rose-600">Multi-Entity</span>
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

          {/* Detailed Breakdown by Signal Type Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Performance Breakdown by Signal Type</h3>
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
                  {filteredSignalBreakdown.map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {row.label}
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
                        {row.mean_time_to_action_hours !== null && row.mean_time_to_action_hours !== undefined
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

          {/* Category & Severity Distribution Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Category */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Breakdown by Category
              </h4>
              <div className="space-y-3">
                {metrics.by_category.map((cat) => (
                  <div
                    key={cat.key}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full border font-semibold text-[11px] ${getCategoryBadge(
                          cat.key
                        )}`}
                      >
                        {cat.label}
                      </span>
                      <span className="text-slate-500">({cat.total_detected} detected)</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <span className="font-semibold text-emerald-700">
                        {(cat.action_rate * 100).toFixed(1)}% actioned
                      </span>
                      <span className="font-bold text-slate-900">
                        ${Number(cat.influenced_pipeline).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Severity */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Breakdown by Severity Level
              </h4>
              <div className="space-y-3">
                {metrics.by_severity.map((sev) => (
                  <div
                    key={sev.key}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full border font-semibold text-[11px] ${getSeverityBadge(
                          sev.key
                        )}`}
                      >
                        {sev.label}
                      </span>
                      <span className="text-slate-500">({sev.total_detected} detected)</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <span className="font-semibold text-emerald-700">
                        {(sev.action_rate * 100).toFixed(1)}% actioned
                      </span>
                      <span className="font-bold text-slate-900">
                        ${Number(sev.influenced_pipeline).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
