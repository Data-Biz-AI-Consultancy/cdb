import React, { useState } from 'react';
import { CreatePersonFormData } from '../types';

interface PersonCreatePanelProps {
  onClose: () => void;
  onSubmit: (data: CreatePersonFormData) => Promise<void>;
}

export function PersonCreatePanel({ onClose, onSubmit }: PersonCreatePanelProps) {
  const [form, setForm] = useState<CreatePersonFormData>({
    first_name: '',
    last_name: '',
    primary_email: '',
    primary_phone: '',
    linkedin_url: '',
    city: '',
    country: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold text-slate-800">Create New Person</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-sm"
          aria-label="Close creation form"
        >
          ✕
        </button>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">First Name *</label>
          <input
            required
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
            placeholder="e.g. Jane"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
          <input
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
            placeholder="e.g. Doe"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Primary Email</label>
          <input
            type="email"
            value={form.primary_email}
            onChange={(e) => setForm({ ...form, primary_email: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
            placeholder="e.g. jane.doe@example.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Primary Phone</label>
          <input
            value={form.primary_phone}
            onChange={(e) => setForm({ ...form, primary_phone: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
            placeholder="e.g. +1 555 0199"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">LinkedIn Profile URL</label>
          <input
            value={form.linkedin_url}
            onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
            placeholder="linkedin.com/in/..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Location (City, Country)</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="City (e.g. New York)"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
            <input
              placeholder="Country Code (e.g. US, GB)"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
          </div>
        </div>
        <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-medium transition disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
