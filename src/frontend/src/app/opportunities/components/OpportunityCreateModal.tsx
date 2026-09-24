'use client';

import React from 'react';
import { STAGES } from '../types';
import { COMMON_CURRENCIES } from '@/lib/currency';
import SearchableCombobox, { ComboboxOption } from '@/components/SearchableCombobox';

interface OpportunityCreateModalProps {
  show: boolean;
  createForm: {
    title: string;
    description: string;
    notes: string;
    stage: string;
    value: string;
    currency: string;
    probability: number;
    expected_close_date: string;
    person_id: string;
    person_role: string;
    company_id: string;
    company_role: string;
  };
  setCreateForm: React.Dispatch<React.SetStateAction<any>>;
  personComboboxOptions: ComboboxOption[];
  companyComboboxOptions: ComboboxOption[];
  onSearchPersons: (query: string) => Promise<ComboboxOption[]>;
  onSearchCompanies: (query: string) => Promise<ComboboxOption[]>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const OpportunityCreateModal: React.FC<OpportunityCreateModalProps> = ({
  show,
  createForm,
  setCreateForm,
  personComboboxOptions,
  companyComboboxOptions,
  onSearchPersons,
  onSearchCompanies,
  onClose,
  onSubmit,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg text-slate-900">Create New Opportunity</h3>
            <p className="text-xs text-slate-500">Record a prospective deal in the revenue pipeline</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
            <input
              required
              placeholder="e.g. Acme Corp Enterprise Analytics Expansion"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              className="w-full px-3.5 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Describe scope, objectives, requirements, and strategic goals..."
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full min-h-[80px] px-3.5 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs leading-relaxed"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Internal Notes</label>
              <span className="text-[11px] text-slate-400">Meeting minutes, context, or discussion transcript</span>
            </div>
            <textarea
              rows={4}
              placeholder="Initial discovery notes, context, internal team observations, or call minutes..."
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              className="w-full min-h-[100px] px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs leading-relaxed bg-slate-50/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stage</label>
              <select
                value={createForm.stage}
                onChange={(e) => setCreateForm({ ...createForm, stage: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Deal Value</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 75000"
                value={createForm.value}
                onChange={(e) => setCreateForm({ ...createForm, value: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
              <select
                value={createForm.currency}
                onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
              >
                {COMMON_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confidence Level ({createForm.probability}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={createForm.probability}
                onChange={(e) => setCreateForm({ ...createForm, probability: Number(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Close Date</label>
              <input
                type="date"
                value={createForm.expected_close_date}
                onChange={(e) => setCreateForm({ ...createForm, expected_close_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
              />
            </div>
          </div>

          {/* Attach Person & Company */}
          <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <SearchableCombobox
                label="Primary Attached Contact"
                placeholder="-- None / Select Person --"
                searchPlaceholder="Type name or email to search..."
                value={createForm.person_id}
                onChange={(id) => setCreateForm({ ...createForm, person_id: id })}
                options={personComboboxOptions}
                onSearch={onSearchPersons}
                data-testid="create-opp-person-select"
              />
            </div>

            <div>
              <SearchableCombobox
                label="Primary Attached Company"
                placeholder="-- None / Select Company --"
                searchPlaceholder="Type company name (e.g. Taxfix)..."
                value={createForm.company_id}
                onChange={(id) => setCreateForm({ ...createForm, company_id: id })}
                options={companyComboboxOptions}
                onSearch={onSearchCompanies}
                data-testid="create-opp-company-select"
              />
            </div>
          </div>

          <div className="border-t pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
            >
              Create Opportunity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
