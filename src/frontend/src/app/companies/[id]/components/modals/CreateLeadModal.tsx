import React from 'react';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  employees: any[];
  allPersons: any[];
  leadForm: {
    person_id: string;
    title: string;
    stage: string;
    source: string;
    intent: string;
    signal_strength: string;
    notes: string;
  };
  setLeadForm: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateLeadModal: React.FC<CreateLeadModalProps> = ({
  isOpen,
  onClose,
  companyName,
  employees,
  allPersons,
  leadForm,
  setLeadForm,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Create Lead for {companyName}</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Contact *</label>
            <select
              required
              value={leadForm.person_id}
              onChange={(e) => setLeadForm({ ...leadForm, person_id: e.target.value })}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
            >
              <option value="">-- Choose Contact --</option>
              {employees.map((e) => (
                <option key={e.person_id} value={e.person_id}>
                  {e.first_name} {e.last_name} ({e.title || 'Staff'})
                </option>
              ))}
              {allPersons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} (Directory Contact)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Title *</label>
            <input
              type="text"
              required
              value={leadForm.title}
              onChange={(e) => setLeadForm({ ...leadForm, title: e.target.value })}
              placeholder="e.g. AI Governance advisory inquiry"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Source</label>
              <select
                value={leadForm.source}
                onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
              >
                <option value="linkedin_message">LinkedIn Message</option>
                <option value="inbound">Inbound Website</option>
                <option value="referral">Referral</option>
                <option value="event">Event / Conference</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Signal Strength</label>
              <select
                value={leadForm.signal_strength}
                onChange={(e) => setLeadForm({ ...leadForm, signal_strength: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
              >
                <option value="strong">Strong (High Intent)</option>
                <option value="medium">Medium</option>
                <option value="weak">Weak</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Intent</label>
            <input
              type="text"
              value={leadForm.intent}
              onChange={(e) => setLeadForm({ ...leadForm, intent: e.target.value })}
              placeholder="e.g. Consulting Inquiry, Architecture Audit"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={leadForm.notes}
              onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
              placeholder="Context, conversation history, or inquiry details..."
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
              className="px-4 py-2 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 shadow-sm"
            >
              Create Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLeadModal;
