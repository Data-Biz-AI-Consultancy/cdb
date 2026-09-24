import React from 'react';

interface LinkContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  allPersons: any[];
  linkForm: {
    person_id: string;
    title: string;
    is_current: boolean;
    started_at: string;
    ended_at: string;
  };
  setLinkForm: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
}

export const LinkContactModal: React.FC<LinkContactModalProps> = ({
  isOpen,
  onClose,
  companyName,
  allPersons,
  linkForm,
  setLinkForm,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Link Contact to {companyName}</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Person *</label>
            <select
              required
              value={linkForm.person_id}
              onChange={(e) => setLinkForm({ ...linkForm, person_id: e.target.value })}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
            >
              <option value="">-- Choose Contact --</option>
              {allPersons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.primary_email || p.city || 'ID: ' + p.id.slice(0, 8)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title / Role</label>
            <input
              type="text"
              value={linkForm.title}
              onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
              placeholder="e.g. VP Engineering, Head of Data, CTO"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_current_emp"
              checked={linkForm.is_current}
              onChange={(e) => setLinkForm({ ...linkForm, is_current: e.target.checked })}
              className="rounded text-blue-600"
            />
            <label htmlFor="is_current_emp" className="text-xs font-semibold text-slate-800">
              Currently Employed at {companyName}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={linkForm.started_at}
                onChange={(e) => setLinkForm({ ...linkForm, started_at: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>
            {!linkForm.is_current && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={linkForm.ended_at}
                  onChange={(e) => setLinkForm({ ...linkForm, ended_at: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
                />
              </div>
            )}
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
              className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
            >
              Link Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LinkContactModal;
