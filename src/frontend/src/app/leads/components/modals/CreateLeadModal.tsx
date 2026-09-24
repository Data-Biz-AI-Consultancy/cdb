'use client';

import React from 'react';
import Modal from '@/components/Modal';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    person_id: string;
    company_id: string;
    title: string;
    intent: string;
    signal_strength: string;
    source: string;
    stage: string;
    description: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      person_id: string;
      company_id: string;
      title: string;
      intent: string;
      signal_strength: string;
      source: string;
      stage: string;
      description: string;
    }>
  >;
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateLeadModal: React.FC<CreateLeadModalProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Lead"
      subtitle="Add an inbound inquiry or business opportunity signal"
      size="xl"
    >
      <form onSubmit={onSubmit} className="space-y-3 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Person ID (UUID) *</label>
            <input
              required
              placeholder="e.g. 73a2fa80-..."
              value={form.person_id}
              onChange={(e) => setForm((prev) => ({ ...prev, person_id: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Company ID (UUID Optional)</label>
            <input
              placeholder="e.g. 81bb59de-..."
              value={form.company_id}
              onChange={(e) => setForm((prev) => ({ ...prev, company_id: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Stage</label>
            <select
              value={form.stage}
              onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="stale">Stale</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Source</label>
            <select
              value={form.source}
              onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="linkedin_message">LinkedIn Message</option>
              <option value="inbound">Inbound</option>
              <option value="referral">Referral</option>
              <option value="event">Event</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Signal Strength</label>
            <select
              value={form.signal_strength}
              onChange={(e) => setForm((prev) => ({ ...prev, signal_strength: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="strong">🔥 Strong</option>
              <option value="medium">⚡ Medium</option>
              <option value="weak">🌱 Weak</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Intent / Category</label>
          <input
            placeholder="e.g. business_collaboration, consulting_request"
            value={form.intent}
            onChange={(e) => setForm((prev) => ({ ...prev, intent: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Description & Conversation Transcript
          </label>
          <textarea
            rows={4}
            placeholder="Enter details of the conversation, key requirements, or conversation transcript..."
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
          >
            Save Lead
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateLeadModal;
