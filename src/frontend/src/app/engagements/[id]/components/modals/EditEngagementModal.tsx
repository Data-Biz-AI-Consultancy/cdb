'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/Modal';
import { EngagementItem, EditEngagementFormData } from '../../types';
import { COMMON_CURRENCIES, getCurrencySymbol } from '@/lib/currency';

interface EditEngagementModalProps {
  isOpen: boolean;
  engagement: EngagementItem;
  onClose: () => void;
  onSubmit: (data: EditEngagementFormData) => Promise<void>;
}

export function EditEngagementModal({
  isOpen,
  engagement,
  onClose,
  onSubmit,
}: EditEngagementModalProps) {
  const [formTitle, setFormTitle] = useState(engagement.title);
  const [formStatus, setFormStatus] = useState<any>(engagement.status);
  const [formType, setFormType] = useState(engagement.engagement_type);
  const [formCurrency, setFormCurrency] = useState(engagement.currency || 'EUR');
  const [formRateType, setFormRateType] = useState(engagement.rate_type);
  const [formRateValue, setFormRateValue] = useState(
    engagement.rate_value !== null && engagement.rate_value !== undefined
      ? String(engagement.rate_value)
      : ''
  );
  const [formTotalValue, setFormTotalValue] = useState(
    engagement.total_value !== null && engagement.total_value !== undefined
      ? String(engagement.total_value)
      : ''
  );
  const [formContractRef, setFormContractRef] = useState(engagement.contract_ref || '');
  const [formContractStatus, setFormContractStatus] = useState(
    engagement.contract_status || 'signed'
  );
  const [formSignedAt, setFormSignedAt] = useState(engagement.signed_at || '');
  const [formTerms, setFormTerms] = useState(engagement.terms_and_conditions || '');
  const [formStartDate, setFormStartDate] = useState(engagement.start_date || '');
  const [formExpectedEndDate, setFormExpectedEndDate] = useState(
    engagement.expected_end_date || ''
  );
  const [formNotes, setFormNotes] = useState(engagement.notes || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        title: formTitle,
        status: formStatus,
        engagement_type: formType,
        currency: formCurrency,
        rate_type: formRateType,
        rate_value: formRateValue,
        total_value: formTotalValue,
        contract_ref: formContractRef,
        contract_status: formContractStatus,
        signed_at: formSignedAt,
        terms_and_conditions: formTerms,
        start_date: formStartDate,
        expected_end_date: formExpectedEndDate,
        notes: formNotes,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Client Engagement"
      subtitle="Modify rates, terms, legal status, or delivery timelines."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Engagement Title *
          </label>
          <input
            type="text"
            required
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Status
            </label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="in_delivery">In Delivery</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Type
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
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

        {/* Financials */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Rate & Billing
            </span>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-semibold text-slate-600">Currency:</label>
              <select
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-800"
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
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
              >
                <option value="daily">Daily Rate</option>
                <option value="hourly">Hourly Rate</option>
                <option value="monthly">Monthly Retainer</option>
                <option value="fixed">Fixed Price</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Rate ({getCurrencySymbol(formCurrency)})
              </label>
              <input
                type="number"
                value={formRateValue}
                onChange={(e) => setFormRateValue(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Cap ({getCurrencySymbol(formCurrency)})
              </label>
              <input
                type="number"
                value={formTotalValue}
                onChange={(e) => setFormTotalValue(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        {/* Contract Ref & Terms */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Contract & Terms
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Contract Ref / Link
              </label>
              <input
                type="text"
                value={formContractRef}
                onChange={(e) => setFormContractRef(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Contract Status
              </label>
              <select
                value={formContractStatus}
                onChange={(e) => setFormContractStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
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
              className="w-full sm:w-1/2 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Terms & Conditions (T&C)
            </label>
            <textarea
              rows={2}
              value={formTerms}
              onChange={(e) => setFormTerms(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Internal Notes
          </label>
          <textarea
            rows={2}
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>

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
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
