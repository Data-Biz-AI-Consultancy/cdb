'use client';

import { useEngagements } from './hooks/useEngagements';
import {
  EngagementKpis,
  EngagementFilterBar,
  EngagementList,
  CreateEngagementModal,
} from './components';

export default function EngagementsPage() {
  const {
    engagements,
    filtered,
    companies,
    persons,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    showAddModal,
    setShowAddModal,
    handleCreateEngagement,
    activeCount,
    totalValue,
    completedCount,
    onTrackCount,
  } = useEngagements();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-100 text-blue-800">
              Active Client Delivery
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Client Engagements</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Active jobs with existing clients, signed contracts, rates, terms & conditions, and meeting notes.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
        >
          <span>+</span> New Engagement
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Metric Cards */}
      <EngagementKpis
        activeCount={activeCount}
        totalValue={totalValue}
        onTrackCount={onTrackCount}
        completedCount={completedCount}
      />

      {/* Filter Bar */}
      <EngagementFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        filterType={filterType}
        onTypeChange={setFilterType}
        filteredCount={filtered.length}
        totalCount={engagements.length}
      />

      {/* Engagements List */}
      <EngagementList engagements={filtered} loading={loading} />

      {/* Create Modal */}
      <CreateEngagementModal
        isOpen={showAddModal}
        companies={companies}
        persons={persons}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreateEngagement}
      />
    </div>
  );
}
