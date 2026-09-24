'use client';

import React from 'react';
import { useSuccessMessage } from '@/lib/useSuccessMessage';
import { SuccessToast } from '@/components/SuccessToast';
import { useLeads } from './hooks/useLeads';
import {
  LeadKpis,
  LeadFilterBar,
  LeadTable,
  LeadDetailDrawer,
  CreateLeadModal,
  ConvertOpportunityModal,
  DisqualifyModal,
  AdvanceStageModal,
  BulkConvertModal,
  BulkDisqualifyModal,
  BulkEditModal,
} from './components';

export default function LeadsPage() {
  const { successMessage, showSuccess, setSuccessMessage } = useSuccessMessage();
  const {
    leads,
    loading,
    error,
    stageFilter,
    sourceFilter,
    signalFilter,
    searchQuery,
    sortOption,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    selectedIds,
    setSelectedIds,
    showBulkEditModal,
    setShowBulkEditModal,
    showBulkConvertModal,
    setShowBulkConvertModal,
    showBulkDisqualifyModal,
    setShowBulkDisqualifyModal,
    bulkProcessing,
    bulkForm,
    setBulkForm,
    bulkConvertForm,
    setBulkConvertForm,
    bulkDisqualifyForm,
    setBulkDisqualifyForm,
    showCreateModal,
    setShowCreateModal,
    selectedLeadForView,
    setSelectedLeadForView,
    convertModalLead,
    setConvertModalLead,
    disqualifyModalLead,
    setDisqualifyModalLead,
    advanceModalLead,
    setAdvanceModalLead,
    createForm,
    setCreateForm,
    convertForm,
    setConvertForm,
    disqualifyForm,
    setDisqualifyForm,
    advanceForm,
    setAdvanceForm,
    handleStageFilterChange,
    handleSourceFilterChange,
    handleSignalFilterChange,
    handleSortChange,
    handleSearchChange,
    handlePageSizeChange,
    isAllCurrentPageSelected,
    handleSelectAll,
    handleToggleSelect,
    handleBulkUpdateSubmit,
    handleBulkConvertSubmit,
    handleBulkDisqualifySubmit,
    handleBulkDelete,
    handleCreate,
    openConvertModal,
    handleConvertSubmit,
    handleAdvanceSubmit,
    handleDisqualifySubmit,
  } = useLeads(showSuccess);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leads & Inbound Signals</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Distilled from LinkedIn messages and inbound conversations — auto-tracked for staleness (30d+) & expiry (90d+)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
          >
            <span>+</span>
            <span>New Lead</span>
          </button>
        </div>
      </div>

      <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage(null)} />

      {/* KPI Stats Overview Cards (Interactive Filters) */}
      <LeadKpis
        leads={leads}
        totalCount={totalCount}
        stageFilter={stageFilter}
        onStageFilterChange={handleStageFilterChange}
      />

      {/* Filters & Sorting Bar */}
      <LeadFilterBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        stageFilter={stageFilter}
        onStageFilterChange={handleStageFilterChange}
        sourceFilter={sourceFilter}
        onSourceFilterChange={handleSourceFilterChange}
        signalFilter={signalFilter}
        onSignalFilterChange={handleSignalFilterChange}
        sortOption={sortOption}
        onSortChange={handleSortChange}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        selectedIds={selectedIds}
        onOpenBulkConvert={() => setShowBulkConvertModal(true)}
        onOpenBulkDisqualify={() => setShowBulkDisqualifyModal(true)}
        onOpenBulkEdit={() => setShowBulkEditModal(true)}
        onBulkDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds([])}
      />

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 shadow-sm">
          {error}
        </div>
      )}

      {/* Main Leads Table */}
      <LeadTable
        leads={leads}
        loading={loading}
        selectedIds={selectedIds}
        isAllCurrentPageSelected={isAllCurrentPageSelected}
        onSelectAll={handleSelectAll}
        onToggleSelect={handleToggleSelect}
        onViewLead={setSelectedLeadForView}
        onOpenConvert={openConvertModal}
        onOpenAdvance={(l) => {
          setAdvanceModalLead(l);
          setAdvanceForm({ notes: '' });
        }}
        onOpenDisqualify={(l) => {
          setDisqualifyModalLead(l);
          setDisqualifyForm({ reason: 'wrong_fit', notes: '' });
        }}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Single Item Modals */}
      <CreateLeadModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        form={createForm}
        setForm={setCreateForm}
        onSubmit={handleCreate}
      />

      <ConvertOpportunityModal
        lead={convertModalLead}
        onClose={() => setConvertModalLead(null)}
        form={convertForm}
        setForm={setConvertForm}
        onSubmit={handleConvertSubmit}
      />

      <AdvanceStageModal
        lead={advanceModalLead}
        onClose={() => setAdvanceModalLead(null)}
        form={advanceForm}
        setForm={setAdvanceForm}
        onSubmit={handleAdvanceSubmit}
      />

      <DisqualifyModal
        lead={disqualifyModalLead}
        onClose={() => setDisqualifyModalLead(null)}
        form={disqualifyForm}
        setForm={setDisqualifyForm}
        onSubmit={handleDisqualifySubmit}
      />

      <LeadDetailDrawer
        lead={selectedLeadForView}
        onClose={() => setSelectedLeadForView(null)}
      />

      {/* Bulk Action Modals */}
      <BulkConvertModal
        isOpen={showBulkConvertModal}
        onClose={() => setShowBulkConvertModal(false)}
        count={selectedIds.length}
        form={bulkConvertForm}
        setForm={setBulkConvertForm}
        onSubmit={handleBulkConvertSubmit}
        processing={bulkProcessing}
      />

      <BulkDisqualifyModal
        isOpen={showBulkDisqualifyModal}
        onClose={() => setShowBulkDisqualifyModal(false)}
        count={selectedIds.length}
        form={bulkDisqualifyForm}
        setForm={setBulkDisqualifyForm}
        onSubmit={handleBulkDisqualifySubmit}
        processing={bulkProcessing}
      />

      <BulkEditModal
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        count={selectedIds.length}
        form={bulkForm}
        setForm={setBulkForm}
        onSubmit={handleBulkUpdateSubmit}
        processing={bulkProcessing}
      />
    </div>
  );
}
