import React from 'react';

interface LogActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  employees: any[];
  activityForm: {
    title: string;
    type: string;
    source: string;
    summary: string;
    person_id: string;
  };
  setActivityForm: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
}

export const LogActivityModal: React.FC<LogActivityModalProps> = ({
  isOpen,
  onClose,
  companyName,
  employees,
  activityForm,
  setActivityForm,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Log Activity for {companyName}</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Activity Title *</label>
            <input
              type="text"
              required
              value={activityForm.title}
              onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
              placeholder="e.g. Architecture intro sync, contract proposal discussion"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={activityForm.type}
                onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
              >
                <option value="linkedin_message">LinkedIn Message</option>
                <option value="meeting">Meeting / Notion Sync</option>
                <option value="email">Email</option>
                <option value="call">Phone Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="note">Internal Note</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Source</label>
              <select
                value={activityForm.source}
                onChange={(e) => setActivityForm({ ...activityForm, source: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
              >
                <option value="linkedin">LinkedIn</option>
                <option value="notion">Notion</option>
                <option value="gmail">Gmail</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Associated Contact (Optional)
            </label>
            <select
              value={activityForm.person_id}
              onChange={(e) => setActivityForm({ ...activityForm, person_id: e.target.value })}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white"
            >
              <option value="">-- No specific person (Company Wide) --</option>
              {employees.map((e) => (
                <option key={e.person_id} value={e.person_id}>
                  {e.first_name} {e.last_name} ({e.title || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Summary / Notes</label>
            <textarea
              rows={3}
              value={activityForm.summary}
              onChange={(e) => setActivityForm({ ...activityForm, summary: e.target.value })}
              placeholder="Key takeaways, discussed points, or next action items..."
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
              className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm"
            >
              Log Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogActivityModal;
