'use client';

import React, { useState } from 'react';
import { SuccessToast } from '@/components/SuccessToast';
import { usePersons } from './hooks/usePersons';
import {
  PersonsFilterBar,
  PersonsTable,
  PersonCreatePanel,
  PersonBulkEditModal,
} from './components';

export default function PersonsPage() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const {
    persons,
    loading,
    error,
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    isAllCurrentPageSelected,
    sortField,
    sortOrder,
    setSortField,
    setSortOrder,
    showCreate,
    setShowCreate,
    selectedIds,
    setSelectedIds,
    showBulkEdit,
    setShowBulkEdit,
    handleSearch,
    handleClearSearch,
    handleSort,
    handleCreate,
    handleDelete,
    handleSelectAll,
    handleSelectRow,
    handleBulkEditSubmit,
    handleBulkDelete,
  } = usePersons(showSuccess);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Persons</h1>
          <p className="text-sm text-slate-500 mt-1">
            Global directory of professional contacts and resolved identity records.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium transition shadow-sm"
        >
          {showCreate ? '✕ Close Form' : '+ New Person'}
        </button>
      </div>

      {/* Notifications */}
      <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage(null)} />

      {error && (
        <div className="p-3.5 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center justify-between shadow-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Create New Person Panel */}
      {showCreate && (
        <PersonCreatePanel
          onClose={() => setShowCreate(false)}
          onSubmit={async (formData) => {
            await handleCreate(undefined, formData);
          }}
        />
      )}

      {/* Bulk Edit Modal */}
      <PersonBulkEditModal
        isOpen={showBulkEdit}
        selectedCount={selectedIds.length}
        onClose={() => setShowBulkEdit(false)}
        onSubmit={async (bulkData) => {
          await handleBulkEditSubmit(undefined, bulkData);
        }}
      />

      {/* Control Bar: Search, Quick Sort, Page Size, Bulk Actions */}
      <PersonsFilterBar
        search={search}
        setSearch={setSearch}
        onSearch={handleSearch}
        onClearSearch={handleClearSearch}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortField(field);
          setSortOrder(order);
          setPage(1);
        }}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        selectedIds={selectedIds}
        onOpenBulkEdit={() => setShowBulkEdit(true)}
        onBulkDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Table Container */}
      <PersonsTable
        persons={persons}
        loading={loading}
        selectedIds={selectedIds}
        isAllCurrentPageSelected={isAllCurrentPageSelected}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        onDelete={handleDelete}
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
