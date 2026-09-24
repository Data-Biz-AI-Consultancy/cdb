import React from 'react';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  noteForm: {
    title: string;
    summary: string;
  };
  setNoteForm: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
}

export const AddNoteModal: React.FC<AddNoteModalProps> = ({
  isOpen,
  onClose,
  companyName,
  noteForm,
  setNoteForm,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Add Note for {companyName}</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={noteForm.title}
              onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
              placeholder="e.g. Account Strategy Note"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Note Content *</label>
            <textarea
              required
              rows={4}
              value={noteForm.summary}
              onChange={(e) => setNoteForm({ ...noteForm, summary: e.target.value })}
              placeholder="Enter internal CRM note..."
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
              Save Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNoteModal;
