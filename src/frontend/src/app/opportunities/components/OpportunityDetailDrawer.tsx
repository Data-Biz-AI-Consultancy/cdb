'use client';

import React from 'react';
import { Opportunity, OpportunityDetectedSignal, OpportunityHistoryItem } from '../types';
import { formatMoney } from '@/lib/currency';
import { ComboboxOption } from '@/components/SearchableCombobox';
import { OpportunityOverviewTab } from './OpportunityOverviewTab';
import { OpportunitySignalsTab } from './OpportunitySignalsTab';
import { OpportunityContactsTab } from './OpportunityContactsTab';
import { OpportunityHistoryTab } from './OpportunityHistoryTab';

interface OpportunityDetailDrawerProps {
  opportunity: Opportunity | null;
  detailTab: 'overview' | 'signals' | 'contacts' | 'history';
  setDetailTab: (tab: 'overview' | 'signals' | 'contacts' | 'history') => void;
  onClose: () => void;
  onDelete: (oppId: string) => void;

  // Signals Tab Props
  signals: OpportunityDetectedSignal[];
  filteredSignals: OpportunityDetectedSignal[];
  signalsLoading: boolean;
  signalsError: string | null;
  signalSubFilter: 'all' | 'active' | 'risk' | 'opportunity';
  setSignalSubFilter: (filter: 'all' | 'active' | 'risk' | 'opportunity') => void;
  actionLoadingId: string | null;
  onUpdateSignalStatus: (
    signalId: string,
    status: 'active' | 'acknowledged' | 'actioned' | 'snoozed' | 'dismissed' | 'resolved'
  ) => void;
  onRefreshSignals: () => void;

  // Overview Tab Props
  editForm: any;
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  savingEdit: boolean;
  onSaveEdit: (e: React.FormEvent) => void;
  isOppOverdue: (opp: Opportunity) => boolean;
  getDaysOverdue: (opp: Opportunity) => number;

  // Contacts Tab Props
  attachPersonForm: { person_id: string; role: string };
  setAttachPersonForm: React.Dispatch<React.SetStateAction<{ person_id: string; role: string }>>;
  attachCompanyForm: { company_id: string; role: string };
  setAttachCompanyForm: React.Dispatch<React.SetStateAction<{ company_id: string; role: string }>>;
  attachingPerson: boolean;
  attachingCompany: boolean;
  personComboboxOptions: ComboboxOption[];
  companyComboboxOptions: ComboboxOption[];
  onSearchPersons: (query: string) => Promise<ComboboxOption[]>;
  onSearchCompanies: (query: string) => Promise<ComboboxOption[]>;
  onAttachPerson: (e: React.FormEvent) => void;
  onDetachPerson: (personId: string) => void;
  onAttachCompany: (e: React.FormEvent) => void;
  onDetachCompany: (companyId: string) => void;

  // History Tab Props
  historyItems: OpportunityHistoryItem[];
  historyLoading: boolean;
  newHistoryNote: string;
  setNewHistoryNote: React.Dispatch<React.SetStateAction<string>>;
  savingNote: boolean;
  onAddNote: (e: React.FormEvent) => void;
}

export const OpportunityDetailDrawer: React.FC<OpportunityDetailDrawerProps> = ({
  opportunity,
  detailTab,
  setDetailTab,
  onClose,
  onDelete,
  signals,
  filteredSignals,
  signalsLoading,
  signalsError,
  signalSubFilter,
  setSignalSubFilter,
  actionLoadingId,
  onUpdateSignalStatus,
  onRefreshSignals,
  editForm,
  setEditForm,
  savingEdit,
  onSaveEdit,
  isOppOverdue,
  getDaysOverdue,
  attachPersonForm,
  setAttachPersonForm,
  attachCompanyForm,
  setAttachCompanyForm,
  attachingPerson,
  attachingCompany,
  personComboboxOptions,
  companyComboboxOptions,
  onSearchPersons,
  onSearchCompanies,
  onAttachPerson,
  onDetachPerson,
  onAttachCompany,
  onDetachCompany,
  historyItems,
  historyLoading,
  newHistoryNote,
  setNewHistoryNote,
  savingNote,
  onAddNote,
}) => {
  if (!opportunity) return null;

  const activeSignalsCount = signals.filter((s) => s.status === 'active').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b bg-slate-50 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                {opportunity.stage.replace('_', ' ')}
              </span>
              {opportunity.value !== null && opportunity.value !== undefined && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {formatMoney(opportunity.value, opportunity.currency)}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1 leading-snug">
              {opportunity.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDelete(opportunity.id)}
              title="Delete Opportunity"
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 text-sm transition"
            >
              🗑️
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 text-base transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b px-5 bg-white text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setDetailTab('overview')}
            className={`py-3 px-3.5 border-b-2 transition shrink-0 ${
              detailTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📋 Overview & Edit
          </button>
          <button
            onClick={() => setDetailTab('signals')}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              detailTab === 'signals'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>⚡ Signals & Risks</span>
            {activeSignalsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 font-black text-[10px]">
                {activeSignalsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setDetailTab('contacts')}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              detailTab === 'contacts'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>👥 Attached People & Orgs</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px]">
              {(opportunity.persons?.length || 0) + (opportunity.companies?.length || 0)}
            </span>
          </button>
          <button
            onClick={() => setDetailTab('history')}
            className={`py-3 px-3.5 border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              detailTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>⏱️ History & Activity</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px]">
              {historyItems.length}
            </span>
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="p-6 overflow-y-auto flex-1 text-sm">
          {detailTab === 'overview' && (
            <OpportunityOverviewTab
              opportunity={opportunity}
              editForm={editForm}
              setEditForm={setEditForm}
              savingEdit={savingEdit}
              onSaveEdit={onSaveEdit}
              isOppOverdue={isOppOverdue}
              getDaysOverdue={getDaysOverdue}
            />
          )}

          {detailTab === 'signals' && (
            <OpportunitySignalsTab
              opportunity={opportunity}
              signals={signals}
              filteredSignals={filteredSignals}
              loading={signalsLoading}
              error={signalsError}
              signalSubFilter={signalSubFilter}
              setSignalSubFilter={setSignalSubFilter}
              actionLoadingId={actionLoadingId}
              onUpdateStatus={onUpdateSignalStatus}
              onRefresh={onRefreshSignals}
            />
          )}

          {detailTab === 'contacts' && (
            <OpportunityContactsTab
              opportunity={opportunity}
              attachPersonForm={attachPersonForm}
              setAttachPersonForm={setAttachPersonForm}
              attachCompanyForm={attachCompanyForm}
              setAttachCompanyForm={setAttachCompanyForm}
              attachingPerson={attachingPerson}
              attachingCompany={attachingCompany}
              personComboboxOptions={personComboboxOptions}
              companyComboboxOptions={companyComboboxOptions}
              onSearchPersons={onSearchPersons}
              onSearchCompanies={onSearchCompanies}
              onAttachPerson={onAttachPerson}
              onDetachPerson={onDetachPerson}
              onAttachCompany={onAttachCompany}
              onDetachCompany={onDetachCompany}
            />
          )}

          {detailTab === 'history' && (
            <OpportunityHistoryTab
              historyItems={historyItems}
              historyLoading={historyLoading}
              newHistoryNote={newHistoryNote}
              setNewHistoryNote={setNewHistoryNote}
              savingNote={savingNote}
              onAddNote={onAddNote}
            />
          )}
        </div>
      </div>
    </div>
  );
};
