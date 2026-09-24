'use client';

import React, { useState } from 'react';
import { CompanyFormState } from '../hooks/useCompanies';

interface CompanyCreateModalProps {
  onClose: () => void;
  onSubmit: (form: CompanyFormState) => Promise<void>;
}

const EMPTY_FORM: CompanyFormState = {
  name: '',
  domain: '',
  industry: '',
  size_range: '',
  country: '',
  city: '',
  linkedin_url: '',
};

export const CompanyCreateModal: React.FC<CompanyCreateModalProps> = ({ onClose, onSubmit }) => {
  const [form, setForm] = useState<CompanyFormState>(EMPTY_FORM);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(form);
      setForm(EMPTY_FORM);
      onClose();
    } catch (err: any) {
      alert('Error creating company: ' + err.message);
    }
  };

  return (
    <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4 animate-fade-in">
      <h2 className="text-base font-bold text-slate-900">Register New Company</h2>
      <form
        id="company-create-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs"
      >
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
          <input
            id="company-create-name"
            required
            placeholder="e.g. Acme AI Corp"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Domain</label>
          <input
            id="company-create-domain"
            placeholder="acme.ai"
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Industry</label>
          <input
            id="company-create-industry"
            placeholder="Artificial Intelligence, Software, Finance..."
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Size Range</label>
          <input
            id="company-create-size"
            placeholder="1-10, 11-50, 51-200, 201-500..."
            value={form.size_range}
            onChange={(e) => setForm({ ...form, size_range: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">City</label>
          <input
            id="company-create-city"
            placeholder="Berlin, London, New York..."
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Country Code (ISO 2)</label>
          <input
            id="company-create-country"
            maxLength={2}
            placeholder="DE, GB, US..."
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="sm:col-span-2 md:col-span-3">
          <label className="block font-semibold text-slate-700 mb-1">LinkedIn URL</label>
          <input
            id="company-create-linkedin"
            placeholder="linkedin.com/company/acme"
            value={form.linkedin_url}
            onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="sm:col-span-2 md:col-span-3 flex justify-end gap-2 pt-2 border-t">
          <button
            id="company-create-cancel"
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
          >
            Cancel
          </button>
          <button
            id="company-create-submit"
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold shadow-sm"
          >
            Save Company
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyCreateModal;
