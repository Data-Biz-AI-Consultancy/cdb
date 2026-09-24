'use client';

import React, { useMemo } from 'react';
import { useSuccessMessage } from '@/lib/useSuccessMessage';
import { SuccessToast } from '@/components/SuccessToast';
import { ComboboxOption } from '@/components/SearchableCombobox';
import { useActivities } from './hooks/useActivities';
import {
  ActivityKpis,
  ActivityFilterBar,
  ActivityTimelineFeed,
  ActivityCreateModal,
  ActivityEditModal,
  ActivityDetailDrawer,
} from './components';

export default function ActivitiesPage() {
  const { successMessage, setSuccessMessage, showSuccess } = useSuccessMessage();
  const {
    activities,
    stats,
    loading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    sourceFilter,
    setSourceFilter,
    dateFilter,
    setDateFilter,
    availablePersons,
    availableCompanies,
    showCreateModal,
    setShowCreateModal,
    selectedActivity,
    setSelectedActivity,
    editingActivity,
    setEditingActivity,
    expandedContentIds,
    toggleExpand,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    saving,
    handleSearchCompanies,
    handleSearchPersons,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleOpenEdit,
  } = useActivities(showSuccess);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const companyComboboxOptions: ComboboxOption[] = useMemo(
    () =>
      availableCompanies.map((c) => ({
        id: c.id,
        label: c.name,
        subtext: c.domain || undefined,
      })),
    [availableCompanies]
  );

  const personComboboxOptions: ComboboxOption[] = useMemo(
    () =>
      availablePersons.map((p) => {
        const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.primary_email || p.id;
        return {
          id: p.id,
          label: name,
          subtext: p.primary_email || undefined,
        };
      }),
    [availablePersons]
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <h1 className="text-2xl font-black tracking-tight text-white">Activities Feed</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Chronological Audit Trail
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            Omnichannel customer interactions: meetings, calls, LinkedIn threads, notes, and emails.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            data-testid="log-activity-button"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition duration-150"
          >
            <span>+</span>
            <span>Log Activity</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage(null)} />

      {/* Aggregated KPI Metrics Cards */}
      <ActivityKpis stats={stats} totalCount={totalCount} />

      {/* Filter and Search Bar */}
      <ActivityFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        onFilterChange={() => setPage(1)}
      />

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Chronological Timeline Feed */}
      <ActivityTimelineFeed
        activities={activities}
        loading={loading}
        searchQuery={searchQuery}
        typeFilter={typeFilter}
        sourceFilter={sourceFilter}
        dateFilter={dateFilter}
        onOpenCreate={() => setShowCreateModal(true)}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        expandedContentIds={expandedContentIds}
        onToggleExpand={toggleExpand}
        onSelect={setSelectedActivity}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      {/* Log Activity Modal */}
      <ActivityCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        form={createForm}
        setForm={setCreateForm}
        onSubmit={handleCreate}
        saving={saving}
        personOptions={personComboboxOptions}
        companyOptions={companyComboboxOptions}
        onSearchPersons={handleSearchPersons}
        onSearchCompanies={handleSearchCompanies}
      />

      {/* Edit Activity Modal */}
      <ActivityEditModal
        isOpen={!!editingActivity}
        onClose={() => setEditingActivity(null)}
        form={editForm}
        setForm={setEditForm}
        onSubmit={handleUpdate}
        saving={saving}
      />

      {/* Activity Detail Slide-over Drawer */}
      <ActivityDetailDrawer
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
