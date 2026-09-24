'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/Modal';
import { OpportunityFormData } from '../../types';
import { STAGE_OPTIONS as STAGES } from '@/lib/pipelineStages';

interface AddOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OpportunityFormData) => Promise<void>;
}

export function AddOpportunityModal({
  isOpen,
  onClose,
  onSubmit,
}: AddOpportunityModalProps) {
  const [oppForm, setOppForm] = useState<OpportunityFormData>({
    title: '',
    stage: 'prospect',
    value: '',
    currency: 'EUR',
    probability: 50,
    expected_close_date: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(oppForm);
      setOppForm({
        title: '',
        stage: 'prospect',
        value: '',
        currency: 'EUR',
        probability: 50,
        expected_close_date: '',
        notes: '',
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
      title="Attach New Opportunity"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Deal Title *</label>
          <input
            required
            placeholder="e.g. Cloud Data Mesh Architecture Project"
            value={oppForm.title}
            onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Stage</label>
            <select
              value={oppForm.stage}
              onChange={(e) => setOppForm({ ...oppForm, stage: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Value (€)</label>
            <input
              type="number"
              placeholder="e.g. 75000"
              value={oppForm.value}
              onChange={(e) => setOppForm({ ...oppForm, value: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Probability (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={oppForm.probability}
              onChange={(e) => setOppForm({ ...oppForm, probability: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Close Date</label>
            <input
              type="date"
              value={oppForm.expected_close_date}
              onChange={(e) => setOppForm({ ...oppForm, expected_close_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
          <textarea
            rows={2}
            placeholder="Deal scope, milestones, or requirements..."
            value={oppForm.notes}
            onChange={(e) => setOppForm({ ...oppForm, notes: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-xs"
          />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-slate-700 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Opportunity'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
