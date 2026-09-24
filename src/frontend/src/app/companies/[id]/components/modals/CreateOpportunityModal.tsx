import React from 'react';
import { STAGES } from '../../types';

interface CreateOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  oppForm: {
    title: string;
    stage: string;
    value: string;
    currency: string;
    probability: number;
    expected_close_date: string;
    notes: string;
  };
  setOppForm: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateOpportunityModal: React.FC<CreateOpportunityModalProps> = ({
  isOpen,
  onClose,
  companyName,
  oppForm,
  setOppForm,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Create Deal for {companyName}</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Deal Title *</label>
            <input
              type="text"
              required
              value={oppForm.title}
              onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
              placeholder="e.g. Enterprise Data Platform Modernization"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stage</label>
              <select
                value={oppForm.stage}
                onChange={(e) => setOppForm({ ...oppForm, stage: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Value (EUR)</label>
              <input
                type="number"
                value={oppForm.value}
                onChange={(e) => setOppForm({ ...oppForm, value: e.target.value })}
                placeholder="75000"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
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
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Close Date</label>
              <input
                type="date"
                value={oppForm.expected_close_date}
                onChange={(e) => setOppForm({ ...oppForm, expected_close_date: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={oppForm.notes}
              onChange={(e) => setOppForm({ ...oppForm, notes: e.target.value })}
              placeholder="Deal scope, deliverables, or procurement steps..."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
            >
              Create Deal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOpportunityModal;
