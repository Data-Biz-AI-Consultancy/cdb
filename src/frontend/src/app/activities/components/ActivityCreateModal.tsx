'use client';

import React from 'react';
import Modal from '@/components/Modal';
import { ACTIVITY_TYPE_CONFIG } from '@/lib/activityTypes';
import SearchableCombobox, { ComboboxOption } from '@/components/SearchableCombobox';
import { CreateActivityFormData } from '../hooks/useActivities';

interface ActivityCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: CreateActivityFormData;
  setForm: React.Dispatch<React.SetStateAction<CreateActivityFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  personOptions: ComboboxOption[];
  companyOptions: ComboboxOption[];
  onSearchPersons: (query: string) => Promise<ComboboxOption[]>;
  onSearchCompanies: (query: string) => Promise<ComboboxOption[]>;
}

export const ActivityCreateModal: React.FC<ActivityCreateModalProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  onSubmit,
  saving,
  personOptions,
  companyOptions,
  onSearchPersons,
  onSearchCompanies,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log New Customer Activity"
      icon="✨"
      size="2xl"
    >
      <form onSubmit={onSubmit} className="space-y-4 text-sm">
        {/* Activity Type Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Activity Type *
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Object.entries(ACTIVITY_TYPE_CONFIG).map(([typeKey, cfg]) => (
              <button
                key={typeKey}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, type: typeKey }))}
                className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                  form.type === typeKey
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg">{cfg.icon}</span>
                <span className="text-[11px] leading-tight">{cfg.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title & Occurred Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
            <input
              placeholder="e.g. Intro discovery call regarding cloud platform"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Occurred At *</label>
            <input
              type="datetime-local"
              required
              value={form.occurred_at}
              onChange={(e) => setForm((prev) => ({ ...prev, occurred_at: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Associated Person & Company using SearchableCombobox */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <SearchableCombobox
            label="Associated Contact / Person"
            value={form.person_id}
            options={personOptions}
            onSearch={onSearchPersons}
            onChange={(id) => setForm((prev) => ({ ...prev, person_id: id }))}
            placeholder="Search contact by name or email..."
            searchPlaceholder="Type contact name..."
            data-testid="create-activity-person-combobox"
          />

          <SearchableCombobox
            label="Associated Company / Org"
            value={form.company_id}
            options={companyOptions}
            onSearch={onSearchCompanies}
            onChange={(id) => setForm((prev) => ({ ...prev, company_id: id }))}
            placeholder="Search company by name or domain..."
            searchPlaceholder="Type company name..."
            data-testid="create-activity-company-combobox"
          />

          <div className="sm:col-span-2 text-[11px] text-slate-500">
            💡 Link to a person, company, or both to correlate activity with contact histories and pipeline deals.
          </div>
        </div>

        {/* Source & Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Source</label>
            <select
              value={form.source}
              onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="manual">Manual Entry</option>
              <option value="notion">Notion</option>
              <option value="linkedin">LinkedIn</option>
              <option value="gmail">Gmail</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Summary / Key Takeaways</label>
            <input
              placeholder="Brief highlights or action items..."
              value={form.summary}
              onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Raw Content / Notes Textarea */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Full Notes / Conversation Transcript (Optional)
          </label>
          <textarea
            rows={4}
            placeholder="Detailed meeting notes, email body text, or conversation snippet..."
            value={form.raw_content}
            onChange={(e) => setForm((prev) => ({ ...prev, raw_content: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
          >
            {saving ? 'Logging...' : 'Save Activity'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ActivityCreateModal;
