'use client';

import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/Modal';
import { PersonOption } from '@/lib/entityTypes';
import SearchableCombobox, { ComboboxOption } from '@/components/SearchableCombobox';
import { apiFetch, ApiResponse } from '@/lib/api';

interface AttachContactModalProps {
  isOpen: boolean;
  allPersons: PersonOption[];
  onClose: () => void;
  onSubmit: (personId: string, role: string) => Promise<void>;
}

export function AttachContactModal({
  isOpen,
  allPersons,
  onClose,
  onSubmit,
}: AttachContactModalProps) {
  const [attachPersonId, setAttachPersonId] = useState('');
  const [attachRole, setAttachRole] = useState('client_lead');
  const [submitting, setSubmitting] = useState(false);

  const personComboboxOptions: ComboboxOption[] = useMemo(() => {
    return allPersons.map((p) => {
      const name =
        [p.first_name, p.last_name].filter(Boolean).join(' ') || p.primary_email || p.id;
      return {
        id: p.id,
        label: name,
        subtext: p.primary_email || undefined,
      };
    });
  }, [allPersons]);

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
    if (!attachPersonId) return;

    setSubmitting(true);
    try {
      await onSubmit(attachPersonId, attachRole);
      setAttachPersonId('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attach Contact Person"
      subtitle="Connect key sponsor, technical lead, or client stakeholder."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <SearchableCombobox
            label="Select Contact Person"
            placeholder="Search contact..."
            searchPlaceholder="Type name or email..."
            value={attachPersonId}
            onChange={(id) => setAttachPersonId(id)}
            onSearch={handleSearchPersons}
            options={personComboboxOptions}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Contact Role
          </label>
          <select
            value={attachRole}
            onChange={(e) => setAttachRole(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
          >
            <option value="client_lead">Client Lead / Sponsor</option>
            <option value="technical_contact">Technical Contact</option>
            <option value="stakeholder">Stakeholder</option>
            <option value="delivery_lead">Delivery Lead</option>
          </select>
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
            disabled={submitting || !attachPersonId}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {submitting ? 'Attaching...' : 'Attach Person'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
