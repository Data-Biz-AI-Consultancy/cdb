'use client';

import React from 'react';
import Link from 'next/link';
import { DetectedSignal, SignalDefinition, DetectedSignalStatus } from '../types';
import { normalizeSlug } from '../utils';

interface GroupedAccountData {
  companyId: string | null;
  groupName: string;
  signals: DetectedSignal[];
}

interface SignalTriageFeedProps {
  loading: boolean;
  viewMode: 'feed' | 'account_group';
  setViewMode: (mode: 'feed' | 'account_group') => void;
  selectedSignalIds: string[];
  setSelectedSignalIds: (ids: string[]) => void;
  onBulkAction: (actionType: 'snoozed' | 'resolved' | 'dismissed') => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  categoryFilter: string;
  setCategoryFilter: (val: string) => void;
  severityFilter: string;
  setSeverityFilter: (val: string) => void;
  signalTypeFilter: string;
  setSignalTypeFilter: (val: string) => void;
  priorityFilter: string;
  setPriorityFilter: (val: string) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  lookbackDays: number;
  onLookbackChange: (days: number) => void;
  onResetFilters: () => void;
  catalog: SignalDefinition[];
  availableCatalog: SignalDefinition[];
  filteredSignals: DetectedSignal[];
  opportunitySignals: DetectedSignal[];
  hybridSignals: DetectedSignal[];
  riskSignals: DetectedSignal[];
  groupedByAccount: [string, GroupedAccountData][];
  onToggleSelectAll: () => void;
  onRunEvaluation: () => void;
  renderCard: (sig: DetectedSignal, variant: 'opportunity' | 'risk' | 'hybrid') => React.ReactNode;
}

export const SignalTriageFeed: React.FC<SignalTriageFeedProps> = ({
  loading,
  viewMode,
  setViewMode,
  selectedSignalIds,
  setSelectedSignalIds,
  onBulkAction,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  severityFilter,
  setSeverityFilter,
  signalTypeFilter,
  setSignalTypeFilter,
  priorityFilter,
  setPriorityFilter,
  sortBy,
  setSortBy,
  lookbackDays,
  onLookbackChange,
  onResetFilters,
  catalog,
  availableCatalog,
  filteredSignals,
  opportunitySignals,
  hybridSignals,
  riskSignals,
  groupedByAccount,
  onToggleSelectAll,
  onRunEvaluation,
  renderCard,
}) => {
  return (
    <div className="space-y-6">
      {/* View Switcher & Bulk Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* View Mode Toggle */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setViewMode('feed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'feed'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📋</span>
            <span>Feed View</span>
          </button>
          <button
            onClick={() => setViewMode('account_group')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'account_group'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🏢</span>
            <span>Group by Account / Organization</span>
          </button>
        </div>

        {/* Bulk Selection Bar */}
        {selectedSignalIds.length > 0 && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs">
            <span className="font-bold text-emerald-900">
              {selectedSignalIds.length} signal(s) selected
            </span>
            <button
              onClick={() => onBulkAction('snoozed')}
              className="px-2.5 py-1 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition cursor-pointer"
            >
              💤 Bulk Snooze 14d
            </button>
            <button
              onClick={() => onBulkAction('resolved')}
              className="px-2.5 py-1 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition cursor-pointer"
            >
              Resolve Selected
            </button>
            <button
              onClick={() => onBulkAction('dismissed')}
              className="px-2.5 py-1 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition cursor-pointer"
            >
              Dismiss Selected
            </button>
            <button
              onClick={() => setSelectedSignalIds([])}
              className="text-slate-500 hover:text-slate-700 ml-1 cursor-pointer font-bold"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search signals by entity, title, or summary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Quick Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="active">Status: Active Only</option>
            <option value="acknowledged">Status: Acknowledged</option>
            <option value="snoozed">Status: Snoozed</option>
            <option value="resolved">Status: Resolved</option>
            <option value="actioned">Status: Actioned</option>
            <option value="dismissed">Status: Dismissed</option>
            <option value="all">Status: All Statuses</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              const newCat = e.target.value;
              setCategoryFilter(newCat);
              if (newCat !== 'all' && signalTypeFilter !== 'all') {
                const matched = catalog.find(
                  (c) =>
                    c.id === signalTypeFilter ||
                    normalizeSlug(c.id) === normalizeSlug(signalTypeFilter)
                );
                if (
                  matched &&
                  matched.category?.toLowerCase() !== newCat.toLowerCase() &&
                  matched.category?.toLowerCase() !== 'hybrid'
                ) {
                  setSignalTypeFilter('all');
                }
              }
            }}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Category: All</option>
            <option value="opportunity">Opportunity</option>
            <option value="risk">Risk</option>
            <option value="hybrid">Mixed</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Severity: All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            id="signal-type-filter"
            aria-label="Filter by Signal Type"
            value={signalTypeFilter}
            onChange={(e) => setSignalTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Signal: All Types</option>
            {availableCatalog && availableCatalog.length > 0 ? (
              availableCatalog.map((def) => (
                <option key={def.id} value={def.id}>
                  {def.name}
                </option>
              ))
            ) : (
              <>
                <option value="dormant_strategic_account">Dormant Strategic Account</option>
                <option value="unanswered_conversation">Unanswered Conversation</option>
                <option value="expiring_contract">Expiring Contract</option>
                <option value="leadership_change">Leadership Change</option>
                <option value="hiring_funding_event">Hiring or Funding Event</option>
                <option value="competitor_signal">Competitor Signal</option>
              </>
            )}
          </select>

          <select
            id="priority-filter"
            aria-label="Filter by Priority Tier"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-amber-50/60 border border-amber-300/80 rounded-lg text-amber-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Priority: All Tiers</option>
            <option value="P0">P0 • Critical Emergency</option>
            <option value="P1">P1 • High Impact</option>
            <option value="P2">P2 • Medium Impact</option>
            <option value="P3">P3 • Moderate Impact</option>
            <option value="P4">P4 • Low Impact</option>
          </select>

          <select
            id="sort-by-filter"
            aria-label="Sort Signals"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-emerald-50/70 border border-emerald-300 rounded-lg text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="priority">Sort: Business Impact (Default)</option>
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="severity">Sort: Highest Severity</option>
            <option value="confidence_desc">Sort: Highest Confidence</option>
            <option value="confidence_asc">Sort: Lowest Confidence</option>
          </select>

          <select
            id="lookback-filter"
            aria-label="Filter by Lookback Window"
            value={lookbackDays}
            onChange={(e) => onLookbackChange(Number(e.target.value))}
            className="px-3 py-2 text-xs font-semibold bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value={90}>Lookback: 3 Months (Default)</option>
            <option value={180}>Lookback: 6 Months</option>
            <option value={365}>Lookback: 1 Year</option>
            <option value={730}>Lookback: 2 Years (Max)</option>
          </select>

          {(statusFilter !== 'active' ||
            categoryFilter !== 'all' ||
            severityFilter !== 'all' ||
            signalTypeFilter !== 'all' ||
            priorityFilter !== 'all' ||
            sortBy !== 'priority' ||
            lookbackDays !== 90 ||
            searchQuery.trim().length > 0) && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-dashed border-slate-300 transition-colors cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Select All Toggle Bar */}
      {filteredSignals.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={
                selectedSignalIds.length === filteredSignals.length &&
                filteredSignals.length > 0
              }
              onChange={onToggleSelectAll}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <span>
              Select all {filteredSignals.length} filtered signal(s)
            </span>
          </label>
          <span>Showing {filteredSignals.length} items</span>
        </div>
      )}

      {/* Feed List / Grouped List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <svg
            className="animate-spin h-6 w-6 text-emerald-500 mx-auto mb-3"
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
          Scanning signal state across entities...
        </div>
      ) : filteredSignals.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-xl">
            ✓
          </div>
          <h3 className="text-base font-medium text-slate-800">No signals matching filter</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            No detected signals match your current status or filter criteria. Click &quot;Run
            Signal Detection&quot; to perform a fresh sweep.
          </p>
          <button
            onClick={onRunEvaluation}
            className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            Run Detection Sweep Now
          </button>
        </div>
      ) : viewMode === 'account_group' ? (
        /* GROUPED BY ACCOUNT VIEW */
        <div className="space-y-6">
          {groupedByAccount.map(([key, group]) => (
            <div
              key={key}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏢</span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      {group.companyId ? (
                        <Link
                          href={`/companies/${group.companyId}`}
                          className="hover:text-emerald-600 transition hover:underline"
                        >
                          {group.groupName}
                        </Link>
                      ) : (
                        <span>{group.groupName}</span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Account Clustered Signals · {group.signals.length} alert(s) detected
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {group.signals.length} Signal{group.signals.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.signals.map((sig) => {
                  const variant =
                    sig.has_conflict || sig.signal?.category === 'hybrid'
                      ? 'hybrid'
                      : sig.signal?.category === 'risk'
                      ? 'risk'
                      : 'opportunity';
                  return renderCard(sig, variant);
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 3-COLUMN TRIAGE FEED */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Column 1: Opportunities */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">🟢</span>
                <div>
                  <h2 className="text-sm font-bold text-emerald-900">Opportunities</h2>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Upside, Expansion & Inbound Intent
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900 border border-emerald-300">
                {opportunitySignals.length}
              </span>
            </div>

            {opportunitySignals.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                No opportunity signals matching filter
              </div>
            ) : (
              <div className="space-y-3">
                {opportunitySignals.map((sig) => renderCard(sig, 'opportunity'))}
              </div>
            )}
          </div>

          {/* Column 2: Mixed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">🟡</span>
                <div>
                  <h2 className="text-sm font-bold text-amber-900">Mixed</h2>
                  <p className="text-[11px] text-amber-700 font-medium">
                    Opposing Polarities & Ambiguity
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900 border border-amber-300">
                {hybridSignals.length}
              </span>
            </div>

            {hybridSignals.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                No mixed signals detected
              </div>
            ) : (
              <div className="space-y-3">
                {hybridSignals.map((sig) => renderCard(sig, 'hybrid'))}
              </div>
            )}
          </div>

          {/* Column 3: Risks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔴</span>
                <div>
                  <h2 className="text-sm font-bold text-rose-900">Risks</h2>
                  <p className="text-[11px] text-rose-700 font-medium">
                    Dormancy, Churn & Unanswered Comms
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-200 text-rose-900 border border-rose-300">
                {riskSignals.length}
              </span>
            </div>

            {riskSignals.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                No risk signals matching filter
              </div>
            ) : (
              <div className="space-y-3">
                {riskSignals.map((sig) => renderCard(sig, 'risk'))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
