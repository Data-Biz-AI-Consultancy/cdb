import React from 'react';
import { STAGES } from '../types';

interface CompanyModalsProps {
  company: any;
  employees: any[];
  allPersons: any[];
  // Modal visibility
  showEditCompany: boolean;
  setShowEditCompany: (show: boolean) => void;
  showLinkContact: boolean;
  setShowLinkContact: (show: boolean) => void;
  showLogActivity: boolean;
  setShowLogActivity: (show: boolean) => void;
  showAddNote: boolean;
  setShowAddNote: (show: boolean) => void;
  showAddOpp: boolean;
  setShowAddOpp: (show: boolean) => void;
  showAddLead: boolean;
  setShowAddLead: (show: boolean) => void;
  // Forms & Handlers
  companyForm: any;
  setCompanyForm: React.Dispatch<React.SetStateAction<any>>;
  handleUpdateCompany: (e: React.FormEvent) => void;
  linkForm: any;
  setLinkForm: React.Dispatch<React.SetStateAction<any>>;
  handleLinkContact: (e: React.FormEvent) => void;
  activityForm: any;
  setActivityForm: React.Dispatch<React.SetStateAction<any>>;
  handleLogActivity: (e: React.FormEvent) => void;
  noteForm: any;
  setNoteForm: React.Dispatch<React.SetStateAction<any>>;
  handleAddNote: (e?: React.FormEvent) => void;
  oppForm: any;
  setOppForm: React.Dispatch<React.SetStateAction<any>>;
  handleAddOpportunity: (e: React.FormEvent) => void;
  leadForm: any;
  setLeadForm: React.Dispatch<React.SetStateAction<any>>;
  handleAddLead: (e: React.FormEvent) => void;
}

export const CompanyModals: React.FC<CompanyModalsProps> = ({
  company,
  employees,
  allPersons,
  showEditCompany,
  setShowEditCompany,
  showLinkContact,
  setShowLinkContact,
  showLogActivity,
  setShowLogActivity,
  showAddNote,
  setShowAddNote,
  showAddOpp,
  setShowAddOpp,
  showAddLead,
  setShowAddLead,
  companyForm,
  setCompanyForm,
  handleUpdateCompany,
  linkForm,
  setLinkForm,
  handleLinkContact,
  activityForm,
  setActivityForm,
  handleLogActivity,
  noteForm,
  setNoteForm,
  handleAddNote,
  oppForm,
  setOppForm,
  handleAddOpportunity,
  leadForm,
  setLeadForm,
  handleAddLead,
}) => {
  return (
    <>
      {/* Edit Company Modal */}
      {showEditCompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Edit Company Profile</h2>
            <form onSubmit={handleUpdateCompany} className="space-y-4">
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
                  onClick={() => setShowEditCompany(false)}
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
      )}

      {/* Link Contact Modal */}
      {showLinkContact && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Link Contact to {company.name}</h2>
            <form onSubmit={handleLinkContact} className="space-y-4">
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
                  Currently Employed at {company.name}
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
                  onClick={() => setShowLinkContact(false)}
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
      )}

      {/* Log Activity Modal */}
      {showLogActivity && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Log Activity for {company.name}</h2>
            <form onSubmit={handleLogActivity} className="space-y-4">
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
                  onClick={() => setShowLogActivity(false)}
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
      )}

      {/* Add Note Modal */}
      {showAddNote && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Add Note for {company.name}</h2>
            <form onSubmit={handleAddNote} className="space-y-4">
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
                  onClick={() => setShowAddNote(false)}
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
      )}

      {/* Create Opportunity Modal */}
      {showAddOpp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Create Deal for {company.name}</h2>
            <form onSubmit={handleAddOpportunity} className="space-y-4">
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
                  onClick={() => setShowAddOpp(false)}
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
      )}

      {/* Create Lead Modal */}
      {showAddLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Create Lead for {company.name}</h2>
            <form onSubmit={handleAddLead} className="space-y-4">
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
                  onClick={() => setShowAddLead(false)}
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
      )}
    </>
  );
};

export default CompanyModals;
