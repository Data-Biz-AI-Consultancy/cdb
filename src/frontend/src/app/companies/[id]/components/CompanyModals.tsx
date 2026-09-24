import React from 'react';
import {
  EditCompanyModal,
  LinkContactModal,
  LogActivityModal,
  AddNoteModal,
  CreateOpportunityModal,
  CreateLeadModal,
} from './modals';

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
      <EditCompanyModal
        isOpen={showEditCompany}
        onClose={() => setShowEditCompany(false)}
        companyForm={companyForm}
        setCompanyForm={setCompanyForm}
        onSubmit={handleUpdateCompany}
      />

      <LinkContactModal
        isOpen={showLinkContact}
        onClose={() => setShowLinkContact(false)}
        companyName={company?.name || 'Company'}
        allPersons={allPersons}
        linkForm={linkForm}
        setLinkForm={setLinkForm}
        onSubmit={handleLinkContact}
      />

      <LogActivityModal
        isOpen={showLogActivity}
        onClose={() => setShowLogActivity(false)}
        companyName={company?.name || 'Company'}
        employees={employees}
        activityForm={activityForm}
        setActivityForm={setActivityForm}
        onSubmit={handleLogActivity}
      />

      <AddNoteModal
        isOpen={showAddNote}
        onClose={() => setShowAddNote(false)}
        companyName={company?.name || 'Company'}
        noteForm={noteForm}
        setNoteForm={setNoteForm}
        onSubmit={handleAddNote}
      />

      <CreateOpportunityModal
        isOpen={showAddOpp}
        onClose={() => setShowAddOpp(false)}
        companyName={company?.name || 'Company'}
        oppForm={oppForm}
        setOppForm={setOppForm}
        onSubmit={handleAddOpportunity}
      />

      <CreateLeadModal
        isOpen={showAddLead}
        onClose={() => setShowAddLead(false)}
        companyName={company?.name || 'Company'}
        employees={employees}
        allPersons={allPersons}
        leadForm={leadForm}
        setLeadForm={setLeadForm}
        onSubmit={handleAddLead}
      />
    </>
  );
};

export default CompanyModals;
