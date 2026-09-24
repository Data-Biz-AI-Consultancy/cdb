import React from 'react';

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyForm: {
    name: string;
    domain: string;
    industry: string;
    size_range: string;
    city: string;
    country: string;
    linkedin_url: string;
    tags: string;
    notes: string;
  };
  setCompanyForm: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
}

export const EditCompanyModal: React.FC<EditCompanyModalProps> = ({
  isOpen,
  onClose,
  companyForm,
  setCompanyForm,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Edit Company Profile</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
            <input
              type="text"
              required
              value={companyForm.name}
              onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Domain</label>
              <input
                type="text"
                value={companyForm.domain}
                onChange={(e) => setCompanyForm({ ...companyForm, domain: e.target.value })}
                placeholder="example.com"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Industry</label>
              <input
                type="text"
                value={companyForm.industry}
                onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                placeholder="e.g. Artificial Intelligence"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Size Range</label>
              <input
                type="text"
                value={companyForm.size_range}
                onChange={(e) => setCompanyForm({ ...companyForm, size_range: e.target.value })}
                placeholder="51-200"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={companyForm.city}
                onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                placeholder="Berlin"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Country (ISO)</label>
              <input
                type="text"
                maxLength={2}
                value={companyForm.country}
                onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value.toUpperCase() })}
                placeholder="DE"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">LinkedIn URL</label>
            <input
              type="text"
              value={companyForm.linkedin_url}
              onChange={(e) => setCompanyForm({ ...companyForm, linkedin_url: e.target.value })}
              placeholder="linkedin.com/company/acme"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={companyForm.tags}
              onChange={(e) => setCompanyForm({ ...companyForm, tags: e.target.value })}
              placeholder="target_account, series_b, tech_modern"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Overview Notes</label>
            <textarea
              rows={3}
              value={companyForm.notes}
              onChange={(e) => setCompanyForm({ ...companyForm, notes: e.target.value })}
              placeholder="Account strategy notes, tech stack insights, etc."
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
              className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCompanyModal;
