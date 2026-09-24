'use client';

import React from 'react';
import Link from 'next/link';
import { Opportunity } from '../types';
import SearchableCombobox, { ComboboxOption } from '@/components/SearchableCombobox';

interface OpportunityContactsTabProps {
  opportunity: Opportunity;
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
}

export const OpportunityContactsTab: React.FC<OpportunityContactsTabProps> = ({
  opportunity,
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
}) => {
  return (
    <div className="space-y-6">
      {/* Attached People */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-slate-900 flex items-center justify-between">
          <span>👤 Attached Contacts</span>
          <span className="text-xs text-slate-500 font-normal">
            {opportunity.persons?.length || 0} attached
          </span>
        </h3>

        <div className="space-y-2">
          {(opportunity.persons || []).map((p) => (
            <div
              key={p.person_id}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                  {p.person_name ? p.person_name.charAt(0).toUpperCase() : 'P'}
                </div>
                <div>
                  <Link
                    href={`/persons/${p.person_id}`}
                    className="font-semibold text-slate-900 hover:text-indigo-600 hover:underline text-xs"
                  >
                    {p.person_name || 'Contact'}
                  </Link>
                  <div className="text-[11px] text-slate-400">{p.person_email || 'No email'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium capitalize">
                  {(p.role || 'contact').replace('_', ' ')}
                </span>
                <button
                  onClick={() => onDetachPerson(p.person_id)}
                  className="text-xs text-slate-400 hover:text-red-600 p-1"
                  title="Unlink contact"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {(!opportunity.persons || opportunity.persons.length === 0) && (
            <div className="text-xs text-slate-400 italic p-3 text-center border border-dashed rounded-xl">
              No contacts attached to this deal yet.
            </div>
          )}
        </div>

        {/* Attach Contact Form */}
        <form
          onSubmit={onAttachPerson}
          className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3"
        >
          <div className="text-xs font-semibold text-slate-800">+ Link Person to Opportunity</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <SearchableCombobox
              placeholder="-- Choose Person --"
              searchPlaceholder="Type name or email..."
              value={attachPersonForm.person_id}
              onChange={(id) => setAttachPersonForm({ ...attachPersonForm, person_id: id })}
              options={personComboboxOptions}
              onSearch={onSearchPersons}
              required
              data-testid="drawer-attach-person-select"
            />

            <select
              value={attachPersonForm.role}
              onChange={(e) => setAttachPersonForm({ ...attachPersonForm, role: e.target.value })}
              className="px-2.5 py-1.5 border rounded-lg focus:outline-none text-xs"
            >
              <option value="decision_maker">Decision Maker</option>
              <option value="champion">Champion</option>
              <option value="influencer">Influencer</option>
              <option value="stakeholder">Stakeholder</option>
              <option value="evaluator">Evaluator</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={attachingPerson || !attachPersonForm.person_id}
            className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition"
          >
            {attachingPerson ? 'Linking...' : 'Attach Person'}
          </button>
        </form>
      </div>

      {/* Attached Companies */}
      <div className="space-y-3 pt-4 border-t">
        <h3 className="font-bold text-sm text-slate-900 flex items-center justify-between">
          <span>🏢 Attached Organizations</span>
          <span className="text-xs text-slate-500 font-normal">
            {opportunity.companies?.length || 0} attached
          </span>
        </h3>

        <div className="space-y-2">
          {(opportunity.companies || []).map((c) => (
            <div
              key={c.company_id}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                  🏢
                </div>
                <div>
                  <Link
                    href={`/companies/${c.company_id}`}
                    className="font-semibold text-slate-900 hover:text-blue-600 hover:underline text-xs"
                  >
                    {c.company_name || 'Organization'}
                  </Link>
                  <div className="text-[11px] text-slate-400">{c.company_domain || 'No domain'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium capitalize">
                  {(c.role || 'client').replace('_', ' ')}
                </span>
                <button
                  onClick={() => onDetachCompany(c.company_id)}
                  className="text-xs text-slate-400 hover:text-red-600 p-1"
                  title="Unlink company"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {(!opportunity.companies || opportunity.companies.length === 0) && (
            <div className="text-xs text-slate-400 italic p-3 text-center border border-dashed rounded-xl">
              No organizations attached to this deal yet.
            </div>
          )}
        </div>

        {/* Attach Company Form */}
        <form
          onSubmit={onAttachCompany}
          className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3"
        >
          <div className="text-xs font-semibold text-slate-800">+ Link Company to Opportunity</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <SearchableCombobox
              placeholder="-- Choose Company --"
              searchPlaceholder="Type company name (e.g. Taxfix)..."
              value={attachCompanyForm.company_id}
              onChange={(id) => setAttachCompanyForm({ ...attachCompanyForm, company_id: id })}
              options={companyComboboxOptions}
              onSearch={onSearchCompanies}
              required
              data-testid="drawer-attach-company-select"
            />

            <select
              value={attachCompanyForm.role}
              onChange={(e) => setAttachCompanyForm({ ...attachCompanyForm, role: e.target.value })}
              className="px-2.5 py-1.5 border rounded-lg focus:outline-none text-xs"
            >
              <option value="client">Client</option>
              <option value="partner">Partner</option>
              <option value="vendor">Vendor</option>
              <option value="prospect">Prospect</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={attachingCompany || !attachCompanyForm.company_id}
            className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition"
          >
            {attachingCompany ? 'Linking...' : 'Attach Company'}
          </button>
        </form>
      </div>
    </div>
  );
};
