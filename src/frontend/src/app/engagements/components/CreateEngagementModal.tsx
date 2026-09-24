'use client';

import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/Modal';
import { CreateEngagementFormData } from '../types';
import { CompanyOption, PersonOption } from '@/lib/entityTypes';
import { COMMON_CURRENCIES, getCurrencySymbol } from '@/lib/currency';
import SearchableCombobox, { ComboboxOption } from '@/components/SearchableCombobox';
import { apiFetch, ApiResponse } from '@/lib/api';

interface CreateEngagementModalProps {
  isOpen: boolean;
  companies: CompanyOption[];
  persons: PersonOption[];
  onClose: () => void;
  onSubmit: (data: CreateEngagementFormData) => Promise<void>;
}

export function CreateEngagementModal({
  isOpen,
  companies,
  persons,
  onClose,
  onSubmit,
}: CreateEngagementModalProps) {
  const [formTitle, setFormTitle] = useState('');
  const [formCompanyId, setFormCompanyId] = useState(companies[0]?.id || '');

  React.useEffect(() => {
    if (companies.length > 0 && !formCompanyId) {
      setFormCompanyId(companies[0].id);
    }
  }, [companies, formCompanyId]);
  const [formPersonId, setFormPersonId] = useState('');
  const [formPersonRole, setFormPersonRole] = useState('client_lead');
  const [formType, setFormType] = useState('consultancy');
  const [formStatus, setFormStatus] = useState<
    'planning' | 'active' | 'in_delivery' | 'on_hold' | 'completed' | 'cancelled'
  >('active');
  const [formRateType, setFormRateType] = useState<'hourly' | 'daily' | 'monthly' | 'fixed'>('daily');
  const [formRateValue, setFormRateValue] = useState('1500');
  const [formCurrency, setFormCurrency] = useState('EUR');
  const [formTotalValue, setFormTotalValue] = useState('45000');
  const [formContractRef, setFormContractRef] = useState('');
  const [formContractStatus, setFormContractStatus] = useState('signed');
  const [formSignedAt, setFormSignedAt] = useState(new Date().toISOString().split('T')[0]);
  const [formTerms, setFormTerms] = useState(
    'Net 30 days payment. 40 hours/week delivery cap. IP assigned on receipt of payment.'
  );
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formExpectedEndDate, setFormExpectedEndDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const companyComboboxOptions: ComboboxOption[] = useMemo(() => {
    return companies.map((c) => ({
      id: c.id,
      label: c.name,
    }));
  }, [companies]);

  const personComboboxOptions: ComboboxOption[] = useMemo(() => {
    return persons.map((p) => {
      const name =
        [p.first_name, p.last_name].filter(Boolean).join(' ') || p.primary_email || p.id;
      return {
        id: p.id,
        label: name,
        subtext: p.primary_email || undefined,
      };
    });
  }, [persons]);

  const handleSearchCompanies = async (query: string): Promise<ComboboxOption[]> => {
    try {
      const res = await apiFetch<ApiResponse<CompanyOption[]>>(
        `/api/v1/companies?q=${encodeURIComponent(query)}&limit=50&sort=name&order=asc`
      );
      return (res.data || []).map((c) => ({
        id: c.id,
        label: c.name,
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
        const name =
          [p.first_name, p.last_name].filter(Boolean).join(' ') || p.primary_email || p.id;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formCompanyId) return;

    setSubmitting(true);
    try {
      await onSubmit({
        title: formTitle,
        company_id: formCompanyId,
        person_id: formPersonId,
        person_role: formPersonRole,
        engagement_type: formType,
        status: formStatus,
        rate_type: formRateType,
        rate_value: formRateValue,
        currency: formCurrency,
        total_value: formTotalValue,
        contract_ref: formContractRef,
        contract_status: formContractStatus,
        signed_at: formSignedAt,
        terms_and_conditions: formTerms,
        start_date: formStartDate,
        expected_end_date: formExpectedEndDate,
        notes: formNotes,
      });
      setFormTitle('');
      setFormContractRef('');
      setFormNotes('');
      setFormExpectedEndDate('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Client Engagement"
      subtitle="Connect client company, signed contract, rates, terms & contacts."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {/* Title & Client Company */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Engagement Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. AI Data Platform & Cloud Migration Delivery"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <SearchableCombobox
              label="Client Organization"
              required
              placeholder="Search and select client company..."
              searchPlaceholder="Type company name (e.g. Synthetix)..."
              value={formCompanyId}
              onChange={(id) => setFormCompanyId(id)}
              onSearch={handleSearchCompanies}
              options={companyComboboxOptions}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Engagement Type
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
            >
              <option value="consultancy">Consultancy</option>
              <option value="retainer">Retainer</option>
              <option value="fixed_fee">Fixed Fee</option>
              <option value="time_and_materials">Time & Materials</option>
              <option value="advisory">Advisory</option>
              <option value="full_time">Full Time</option>
            </select>
          </div>
        </div>

        {/* Rates & Financials */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Rate & Billing Structure
            </span>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-semibold text-slate-600">Currency:</label>
              <select
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {COMMON_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rate Type</label>
              <select
                value={formRateType}
                onChange={(e: any) => setFormRateType(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="daily">Daily Rate</option>
                <option value="hourly">Hourly Rate</option>
                <option value="monthly">Monthly Retainer</option>
                <option value="fixed">Fixed Price</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Rate Amount ({getCurrencySymbol(formCurrency)})
              </label>
              <input
                type="number"
                placeholder="1500"
                value={formRateValue}
                onChange={(e) => setFormRateValue(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Total Cap ({getCurrencySymbol(formCurrency)})
              </label>
              <input
                type="number"
                placeholder="45000"
                value={formTotalValue}
                onChange={(e) => setFormTotalValue(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Signed Contract & Terms & Conditions */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Contract & Terms
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Contract ID / Link / Doc Ref
              </label>
              <input
                type="text"
                placeholder="e.g. MSA-2026-088 or https://notion.so/..."
                value={formContractRef}
                onChange={(e) => setFormContractRef(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contract Status</label>
              <select
                value={formContractStatus}
                onChange={(e) => setFormContractStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="signed">Signed</option>
                <option value="pending_signature">Pending Signature</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Signed Date</label>
            <input
              type="date"
              value={formSignedAt}
              onChange={(e) => setFormSignedAt(e.target.value)}
              className="w-full sm:w-1/2 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Terms & Conditions (T&C)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Net 30 days payment. 40 hours/week delivery cap. IP assigned on receipt of payment."
              value={formTerms}
              onChange={(e) => setFormTerms(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Contact Person & Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <SearchableCombobox
              label="Primary Contact Person"
              placeholder="Search client contact..."
              searchPlaceholder="Type contact name or email..."
              value={formPersonId}
              onChange={(id) => setFormPersonId(id)}
              onSearch={handleSearchPersons}
              options={personComboboxOptions}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Contact Role
            </label>
            <select
              value={formPersonRole}
              onChange={(e) => setFormPersonRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
            >
              <option value="client_lead">Client Lead / Sponsor</option>
              <option value="technical_contact">Technical Contact</option>
              <option value="stakeholder">Stakeholder</option>
              <option value="delivery_lead">Delivery Lead</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={formStartDate}
              onChange={(e) => setFormStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Expected End Date
            </label>
            <input
              type="date"
              value={formExpectedEndDate}
              onChange={(e) => setFormExpectedEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Save Engagement'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
