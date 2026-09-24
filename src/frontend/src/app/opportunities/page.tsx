'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiResponse } from '@/lib/api';
import { ComboboxOption } from '@/components/SearchableCombobox';
import {
  Opportunity,
  PersonOption,
  CompanyOption,
} from './types';
import { useOpportunities } from './hooks/useOpportunities';
import { useOpportunitySignals } from './hooks/useOpportunitySignals';
import { useOpportunityDrawer } from './hooks/useOpportunityDrawer';
import {
  OpportunityHeader,
  OpportunityFilterBar,
  OpportunityKanbanBoard,
  OpportunityDetailDrawer,
  OpportunityCreateModal,
  OpportunityCloseModal,
} from './components';

export default function OpportunitiesPage() {
  const {
    opps,
    filteredOpps,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    signalFilter,
    setSignalFilter,
    draggedOppId,
    setDraggedOppId,
    dragOverStage,
    setDragOverStage,
    handleStageChange,
    handleAdvanceStage,
    handleConfirmClose,
    handleDeleteOpp,
    getOppSignalSummary,
    refreshOpps,
  } = useOpportunities();

  // Available options for attaching
  const [availablePersons, setAvailablePersons] = useState<PersonOption[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<CompanyOption[]>([]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [closeConfirmData, setCloseConfirmData] = useState<{
    oppId: string;
    outcome: 'closed_won' | 'closed_lost';
    notes: string;
  } | null>(null);

  // Forms state
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    notes: '',
    stage: 'prospect',
    value: '',
    currency: 'USD',
    probability: 50,
    expected_close_date: '',
    person_id: '',
    person_role: 'decision_maker',
    company_id: '',
    company_role: 'client',
  });

  // Drawer Hook
  const {
    selectedOppForDetail,
    setSelectedOppForDetail,
    detailTab,
    setDetailTab,
    historyItems,
    historyLoading,
    newHistoryNote,
    setNewHistoryNote,
    savingNote,
    editForm,
    setEditForm,
    savingEdit,
    attachPersonForm,
    setAttachPersonForm,
    attachCompanyForm,
    setAttachCompanyForm,
    attachingPerson,
    attachingCompany,
    handleOpenDetail,
    isOppOverdue,
    getDaysOverdue,
    handleSaveEdit,
    handleAddNote,
    handleAttachPerson,
    handleDetachPerson,
    handleAttachCompany,
    handleDetachCompany,
  } = useOpportunityDrawer(refreshOpps, () => refreshSignals());

  // Signals Hook for the active opportunity in the detail drawer
  const {
    signals: drawerSignals,
    filteredSignals: drawerFilteredSignals,
    loading: drawerSignalsLoading,
    error: drawerSignalsError,
    signalSubFilter: drawerSignalSubFilter,
    setSignalSubFilter: setDrawerSignalSubFilter,
    actionLoadingId: signalActionLoadingId,
    updateSignalStatus,
    refreshSignals,
  } = useOpportunitySignals(selectedOppForDetail);

  const loadPersonsAndCompanies = async () => {
    try {
      const [personsRes, compRes] = await Promise.allSettled([
        apiFetch<ApiResponse<PersonOption[]>>('/api/v1/persons?limit=100&sort=first_name&order=asc'),
        apiFetch<ApiResponse<CompanyOption[]>>('/api/v1/companies?limit=100&sort=name&order=asc'),
      ]);
      if (personsRes.status === 'fulfilled') {
        setAvailablePersons(personsRes.value.data || []);
      }
      if (compRes.status === 'fulfilled') {
        setAvailableCompanies(compRes.value.data || []);
      }
    } catch {
      // Non-critical background loading
    }
  };

  useEffect(() => {
    loadPersonsAndCompanies();
  }, []);

  const handleSearchCompanies = async (query: string): Promise<ComboboxOption[]> => {
    try {
      const res = await apiFetch<ApiResponse<CompanyOption[]>>(
        `/api/v1/companies?q=${encodeURIComponent(query)}&limit=50&sort=name&order=asc`
      );
      return (res.data || []).map((c) => ({
        id: c.id,
        label: c.name,
        subtext: c.domain || undefined,
      }));
    } catch {
      return [];
    }
  };

  const handleSearchPersons = async (query: string): Promise<ComboboxOption[]> => {
    try {
      const res = await apiFetch<ApiResponse<PersonOption[]>>(
        `/api/v1/persons?q=${encodeURIComponent(query)}&limit=50&sort=first_name&order=asc`
      );
      return (res.data || []).map((p) => {
        const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.primary_email || p.id;
        return {
          id: p.id,
          label: name,
          subtext: p.primary_email || undefined,
        };
      });
    } catch {
      return [];
    }
  };

  const companyComboboxOptions: ComboboxOption[] = availableCompanies.map((c) => ({
    id: c.id,
    label: c.name,
    subtext: c.domain || undefined,
  }));

  const personComboboxOptions: ComboboxOption[] = availablePersons.map((p) => {
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.primary_email || p.id;
    return {
      id: p.id,
      label: name,
      subtext: p.primary_email || undefined,
    };
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        title: createForm.title,
        description: createForm.description || null,
        notes: createForm.notes || null,
        stage: createForm.stage,
        currency: createForm.currency,
        probability: Number(createForm.probability),
      };
      if (createForm.value !== '') {
        payload.value = parseFloat(createForm.value);
      }
      if (createForm.expected_close_date) {
        payload.expected_close_date = createForm.expected_close_date;
      }
      if (createForm.person_id) {
        payload.person_id = createForm.person_id;
        payload.person_role = createForm.person_role;
      }
      if (createForm.company_id) {
        payload.company_id = createForm.company_id;
        payload.company_role = createForm.company_role;
      }

      await apiFetch('/api/v1/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        notes: '',
        stage: 'prospect',
        value: '',
        currency: 'USD',
        probability: 50,
        expected_close_date: '',
        person_id: '',
        person_role: 'decision_maker',
        company_id: '',
        company_role: 'client',
      });
      refreshOpps();
    } catch (err: any) {
      alert(err.message || 'Failed to create opportunity');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Metric Summary */}
      <OpportunityHeader opps={opps} onOpenCreate={() => setShowCreateModal(true)} />

      {/* Search & Filter Controls */}
      <OpportunityFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        signalFilter={signalFilter}
        setSignalFilter={setSignalFilter}
      />

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-24 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mr-3" />
          <span className="text-sm font-medium">Loading opportunities pipeline...</span>
        </div>
      ) : (
        <OpportunityKanbanBoard
          opportunities={filteredOpps}
          dragOverStage={dragOverStage}
          getOppSignalSummary={getOppSignalSummary}
          onOpenDetail={handleOpenDetail}
          onAdvanceStage={handleAdvanceStage}
          onDragStart={(e, oppId) => {
            setDraggedOppId(oppId);
            e.dataTransfer.setData('text/plain', oppId);
          }}
          onDragOver={(e, stageId) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (dragOverStage !== stageId) setDragOverStage(stageId);
          }}
          onDragLeave={() => setDragOverStage(null)}
          onDrop={(e, stageId) => {
            e.preventDefault();
            const oppId = e.dataTransfer.getData('text/plain') || draggedOppId;
            setDragOverStage(null);
            setDraggedOppId(null);
            if (oppId) handleStageChange(oppId, stageId);
          }}
          onOpenCloseModal={(oppId, outcome) => {
            setCloseConfirmData({ oppId, outcome, notes: '' });
          }}
        />
      )}

      {/* Opportunity Creation Modal */}
      <OpportunityCreateModal
        show={showCreateModal}
        createForm={createForm}
        setCreateForm={setCreateForm}
        personComboboxOptions={personComboboxOptions}
        companyComboboxOptions={companyComboboxOptions}
        onSearchPersons={handleSearchPersons}
        onSearchCompanies={handleSearchCompanies}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
      />

      {/* Close Outcome Modal */}
      <OpportunityCloseModal
        closeConfirmData={closeConfirmData}
        onClose={() => setCloseConfirmData(null)}
        onChangeNotes={(notes) =>
          setCloseConfirmData((prev) => (prev ? { ...prev, notes } : null))
        }
        onConfirm={async () => {
          if (!closeConfirmData) return;
          const success = await handleConfirmClose(
            closeConfirmData.oppId,
            closeConfirmData.outcome,
            closeConfirmData.notes
          );
          if (success) setCloseConfirmData(null);
        }}
      />

      {/* Opportunity Detail Drawer */}
      <OpportunityDetailDrawer
        opportunity={selectedOppForDetail}
        detailTab={detailTab}
        setDetailTab={setDetailTab}
        onClose={() => setSelectedOppForDetail(null)}
        onDelete={async (oppId) => {
          const success = await handleDeleteOpp(oppId);
          if (success) setSelectedOppForDetail(null);
        }}
        signals={drawerSignals}
        filteredSignals={drawerFilteredSignals}
        signalsLoading={drawerSignalsLoading}
        signalsError={drawerSignalsError}
        signalSubFilter={drawerSignalSubFilter}
        setSignalSubFilter={setDrawerSignalSubFilter}
        actionLoadingId={signalActionLoadingId}
        onUpdateSignalStatus={updateSignalStatus}
        onRefreshSignals={refreshSignals}
        editForm={editForm}
        setEditForm={setEditForm}
        savingEdit={savingEdit}
        onSaveEdit={handleSaveEdit}
        isOppOverdue={isOppOverdue}
        getDaysOverdue={getDaysOverdue}
        attachPersonForm={attachPersonForm}
        setAttachPersonForm={setAttachPersonForm}
        attachCompanyForm={attachCompanyForm}
        setAttachCompanyForm={setAttachCompanyForm}
        attachingPerson={attachingPerson}
        attachingCompany={attachingCompany}
        personComboboxOptions={personComboboxOptions}
        companyComboboxOptions={companyComboboxOptions}
        onSearchPersons={handleSearchPersons}
        onSearchCompanies={handleSearchCompanies}
        onAttachPerson={handleAttachPerson}
        onDetachPerson={handleDetachPerson}
        onAttachCompany={handleAttachCompany}
        onDetachCompany={handleDetachCompany}
        historyItems={historyItems}
        historyLoading={historyLoading}
        newHistoryNote={newHistoryNote}
        setNewHistoryNote={setNewHistoryNote}
        savingNote={savingNote}
        onAddNote={handleAddNote}
      />
    </div>
  );
}
