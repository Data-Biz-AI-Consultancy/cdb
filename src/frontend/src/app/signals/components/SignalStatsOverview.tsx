'use client';

import React from 'react';
import {
  DetectedSignal,
  DetectedSignalStatsResponse,
  SignalMetricsResponse,
  SignalDefinition,
} from '../types';

interface SignalStatsOverviewProps {
  stats: DetectedSignalStatsResponse | null;
  signals: DetectedSignal[];
  metrics: SignalMetricsResponse | null;
  catalog: SignalDefinition[];
  evaluating: boolean;
  evaluationBanner: string | null;
  activeTab: 'triage' | 'conflicts' | 'uncertain' | 'metrics' | 'catalog';
  severityFilter: string;
  onRunEvaluation: () => void;
  onDismissBanner: () => void;
  onSetSeverityFilter: (severity: string) => void;
  onSelectTab: (tab: 'triage' | 'conflicts' | 'uncertain' | 'metrics' | 'catalog') => void;
}

export const SignalStatsOverview: React.FC<SignalStatsOverviewProps> = ({
  stats,
  signals,
  metrics,
  catalog,
  evaluating,
  evaluationBanner,
  activeTab,
  severityFilter,
  onRunEvaluation,
  onDismissBanner,
  onSetSeverityFilter,
  onSelectTab,
}) => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📡</span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Opportunity & Risk Signals Radar
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Automated detection of relationship changes, account dormancy, communication lapses,
              and contract milestones.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRunEvaluation}
              disabled={evaluating}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-900 font-semibold text-sm rounded-xl shadow-md transition duration-150 disabled:opacity-50 cursor-pointer"
            >
              {evaluating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-900"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Evaluating DB...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Run Signal Detection
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Optional Feedback Alert Banner */}
      {evaluationBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>{evaluationBanner}</span>
          </div>
          <button
            onClick={onDismissBanner}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs uppercase ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Active Signals
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              {stats?.total_active ?? signals.filter((s) => s.status === 'active').length}
            </p>
            <p className="text-xs text-slate-400 mt-1">Requiring commercial attention</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl text-slate-700">
            📡
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Snoozed Signals
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1">
              {stats?.total_snoozed ?? signals.filter((s) => s.status === 'snoozed').length}
            </p>
            <p className="text-xs text-purple-500 mt-1">Suppressed until review date</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-xl text-purple-600">
            💤
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Conflicting Signals
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-rose-600 mt-1">
              {stats?.total_conflicting ?? signals.filter((s) => s.has_conflict).length}
            </p>
            <p className="text-xs text-rose-500 mt-1">Opposing polarities</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-xl text-rose-600">
            ⚠️
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Needs Verification
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-amber-600 mt-1">
              {stats?.total_uncertain ?? signals.filter((s) => s.is_uncertain).length}
            </p>
            <p className="text-xs text-amber-500 mt-1">Low confidence / ambiguous</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl text-amber-600">
            🔍
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Active Opportunities
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">
              {stats?.by_category?.opportunity ?? 0}
            </p>
            <p className="text-xs text-emerald-600 mt-1">Hiring, funding & expansions</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl text-emerald-600">
            🚀
          </div>
        </div>
      </div>

      {/* Quick Severity Filter Pill Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
          Quick Severity Filter:
        </span>
        <button
          id="quick-sev-all"
          onClick={() => {
            onSetSeverityFilter('all');
            if (activeTab === 'metrics' || activeTab === 'catalog') onSelectTab('triage');
          }}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
            severityFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All ({signals.length})
        </button>
        <button
          id="quick-sev-critical"
          onClick={() => {
            onSetSeverityFilter('critical');
            if (activeTab === 'metrics' || activeTab === 'catalog') onSelectTab('triage');
          }}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            severityFilter === 'critical'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
          Critical ({stats?.by_severity?.critical ?? signals.filter((s) => s.severity === 'critical').length})
        </button>
        <button
          id="quick-sev-high"
          onClick={() => {
            onSetSeverityFilter('high');
            if (activeTab === 'metrics' || activeTab === 'catalog') onSelectTab('triage');
          }}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            severityFilter === 'high'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-orange-700 hover:bg-orange-50 border border-orange-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
          High ({stats?.by_severity?.high ?? signals.filter((s) => s.severity === 'high').length})
        </button>
        <button
          id="quick-sev-medium"
          onClick={() => {
            onSetSeverityFilter('medium');
            if (activeTab === 'metrics' || activeTab === 'catalog') onSelectTab('triage');
          }}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            severityFilter === 'medium'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          Medium ({stats?.by_severity?.medium ?? signals.filter((s) => s.severity === 'medium').length})
        </button>
        <button
          id="quick-sev-low"
          onClick={() => {
            onSetSeverityFilter('low');
            if (activeTab === 'metrics' || activeTab === 'catalog') onSelectTab('triage');
          }}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            severityFilter === 'low'
              ? 'bg-slate-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
          Low ({stats?.by_severity?.low ?? signals.filter((s) => s.severity === 'low').length})
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex flex-wrap gap-4 sm:gap-8" aria-label="Tabs">
          <button
            onClick={() => onSelectTab('triage')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'triage'
                ? 'border-emerald-500 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span>All Active Signals</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              {signals.filter((s) => s.status === 'active').length}
            </span>
          </button>

          <button
            onClick={() => onSelectTab('conflicts')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'conflicts'
                ? 'border-rose-500 text-rose-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span>⚠️ Conflicting Signals</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
              {signals.filter((s) => s.has_conflict).length}
            </span>
          </button>

          <button
            onClick={() => onSelectTab('uncertain')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'uncertain'
                ? 'border-amber-500 text-amber-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span>🔍 Needs Verification</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              {signals.filter((s) => s.is_uncertain).length}
            </span>
          </button>

          <button
            id="tab-metrics"
            onClick={() => onSelectTab('metrics')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'metrics'
                ? 'border-purple-500 text-purple-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span>📊 Success & Quality Metrics</span>
            {metrics?.quality?.total_detected !== undefined && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                {metrics.quality.total_detected}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('catalog')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-indigo-500 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span>Signal Dimension Catalog</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {catalog.length || 6}
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
};
