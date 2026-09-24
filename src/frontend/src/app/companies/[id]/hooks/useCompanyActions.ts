'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface UseCompanyActionsProps {
  id: string;
  company: any;
  allPersons: any[];
  employees: any[];
  loadAllData: (targetId?: string) => Promise<void>;
  showSuccess: (msg: string) => void;
}

export function useCompanyActions({
  id,
  company,
  allPersons,
  employees,
  loadAllData,
  showSuccess,
}: UseCompanyActionsProps) {
  // Modals state
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [showLinkContact, setShowLinkContact] = useState(false);
  const [showLogActivity, setShowLogActivity] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddOpp, setShowAddOpp] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);

  // Form states
  const [companyForm, setCompanyForm] = useState({
    name: '',
    domain: '',
    industry: '',
    size_range: '',
    city: '',
    country: '',
    linkedin_url: '',
    tags: '',
    notes: '',
  });

  const [noteForm, setNoteForm] = useState({
    title: '',
    summary: '',
  });

  const [linkForm, setLinkForm] = useState({
    person_id: '',
    title: '',
    is_current: true,
    started_at: '',
    ended_at: '',
  });

  const [activityForm, setActivityForm] = useState({
    title: '',
    type: 'linkedin_message',
    source: 'linkedin',
    summary: '',
    person_id: '',
  });

  const [oppForm, setOppForm] = useState({
    title: '',
    stage: 'prospect',
    value: '',
    currency: 'EUR',
    probability: 50,
    expected_close_date: '',
    notes: '',
  });

  const [leadForm, setLeadForm] = useState({
    person_id: '',
    title: '',
    stage: 'new',
    source: 'linkedin_message',
    intent: 'Enterprise Consulting',
    signal_strength: 'strong',
    notes: '',
  });

  // Sync form defaults when company or persons load
  useEffect(() => {
    if (company) {
      setCompanyForm({
        name: company.name || '',
        domain: company.domain || '',
        industry: company.industry || '',
        size_range: company.size_range || '',
        city: company.city || '',
        country: company.country || '',
        linkedin_url: company.linkedin_url || '',
        tags: Array.isArray(company.attributes?.tags) ? company.attributes.tags.join(', ') : '',
        notes: company.attributes?.notes || '',
      });
    }
  }, [company]);

  useEffect(() => {
    if (allPersons.length > 0) {
      setLinkForm((prev) => ({ ...prev, person_id: prev.person_id || allPersons[0].id }));
      setLeadForm((prev) => ({
        ...prev,
        person_id: prev.person_id || (employees?.[0]?.person_id || allPersons[0].id),
      }));
    }
  }, [allPersons, employees]);

  // Action Handlers
  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      const tagsArray = companyForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: any = {
        name: companyForm.name.trim(),
        domain: companyForm.domain.trim() || undefined,
        industry: companyForm.industry.trim() || undefined,
        size_range: companyForm.size_range.trim() || undefined,
        city: companyForm.city.trim() || undefined,
        country: companyForm.country.trim().toUpperCase() || undefined,
        linkedin_url: companyForm.linkedin_url.trim() || undefined,
        attributes: {
          ...(company?.attributes || {}),
          tags: tagsArray,
          notes: companyForm.notes.trim() || undefined,
        },
      };

      await apiFetch(`/api/v1/companies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setShowEditCompany(false);
      showSuccess('Company profile updated successfully.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error updating company: ' + err.message);
    }
  };

  const handleLinkContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !linkForm.person_id) return;
    try {
      const payload: any = {
        company_id: id,
        title: linkForm.title.trim(),
        is_current: linkForm.is_current,
      };
      if (linkForm.started_at) payload.started_at = linkForm.started_at;
      if (linkForm.ended_at && !linkForm.is_current) payload.ended_at = linkForm.ended_at;

      await apiFetch(`/api/v1/companies/persons/${linkForm.person_id}/companies`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowLinkContact(false);
      setLinkForm({
        person_id: allPersons[0]?.id || '',
        title: '',
        is_current: true,
        started_at: '',
        ended_at: '',
      });
      showSuccess('Contact linked to company successfully.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error linking contact: ' + err.message);
    }
  };

  const handleUnlinkContact = async (personId: string) => {
    if (!confirm('Are you sure you want to unlink this contact from the company?')) return;
    try {
      await apiFetch(`/api/v1/companies/persons/${personId}/companies/${id}`, {
        method: 'DELETE',
      });
      showSuccess('Contact unlinked from company.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error unlinking contact: ' + err.message);
    }
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await apiFetch('/api/v1/activities', {
        method: 'POST',
        body: JSON.stringify({
          company_id: id,
          person_id: activityForm.person_id || undefined,
          title: activityForm.title.trim(),
          type: activityForm.type,
          source: activityForm.source,
          summary: activityForm.summary.trim() || undefined,
          occurred_at: new Date().toISOString(),
        }),
      });
      setShowLogActivity(false);
      setActivityForm({
        title: '',
        type: 'linkedin_message',
        source: 'linkedin',
        summary: '',
        person_id: '',
      });
      showSuccess('Activity recorded for company.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error logging activity: ' + err.message);
    }
  };

  const handleAddNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!id || !noteForm.summary.trim()) return;
    try {
      await apiFetch('/api/v1/activities', {
        method: 'POST',
        body: JSON.stringify({
          company_id: id,
          type: 'note',
          source: 'manual',
          title: noteForm.title.trim() || 'Internal Company Note',
          summary: noteForm.summary.trim(),
          occurred_at: new Date().toISOString(),
        }),
      });
      setShowAddNote(false);
      setNoteForm({ title: '', summary: '' });
      showSuccess('Internal note added to company record.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error adding note: ' + err.message);
    }
  };

  const handleAddOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      const payload: any = {
        title: oppForm.title.trim(),
        stage: oppForm.stage,
        currency: oppForm.currency,
        probability: Number(oppForm.probability),
        notes: oppForm.notes.trim() || undefined,
        company_ids: [{ company_id: id, role: 'client' }],
      };
      if (oppForm.value) payload.value = Number(oppForm.value);
      if (oppForm.expected_close_date) payload.expected_close_date = oppForm.expected_close_date;

      await apiFetch('/api/v1/opportunities', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowAddOpp(false);
      setOppForm({
        title: '',
        stage: 'prospect',
        value: '',
        currency: 'EUR',
        probability: 50,
        expected_close_date: '',
        notes: '',
      });
      showSuccess('Opportunity attached to company pipeline.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error creating opportunity: ' + err.message);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !leadForm.person_id) return;
    try {
      await apiFetch('/api/v1/leads', {
        method: 'POST',
        body: JSON.stringify({
          company_id: id,
          person_id: leadForm.person_id,
          title: leadForm.title.trim(),
          stage: leadForm.stage,
          source: leadForm.source,
          intent: leadForm.intent.trim() || undefined,
          signal_strength: leadForm.signal_strength,
          notes: leadForm.notes.trim() || undefined,
        }),
      });
      setShowAddLead(false);
      setLeadForm({
        person_id: employees[0]?.person_id || allPersons[0]?.id || '',
        title: '',
        stage: 'new',
        source: 'linkedin_message',
        intent: 'Enterprise Consulting',
        signal_strength: 'strong',
        notes: '',
      });
      showSuccess('Lead recorded for company.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error creating lead: ' + err.message);
    }
  };

  const handleAdvanceOpportunity = async (oppId: string) => {
    if (!id) return;
    try {
      await apiFetch(`/api/v1/opportunities/${oppId}/advance`, { method: 'POST' });
      showSuccess('Opportunity stage advanced.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error advancing opportunity: ' + err.message);
    }
  };

  const handleConvertLead = async (leadId: string, leadTitle: string) => {
    if (!id) return;
    const oppTitle = prompt('Enter title for converted opportunity:', leadTitle || 'New Deal');
    if (!oppTitle) return;
    try {
      await apiFetch(`/api/v1/leads/${leadId}/convert`, {
        method: 'POST',
        body: JSON.stringify({
          title: oppTitle,
          opportunity_title: oppTitle,
          stage: 'prospect',
        }),
      });
      showSuccess('Lead converted to Opportunity.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error converting lead: ' + err.message);
    }
  };

  return {
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
    noteForm,
    setNoteForm,
    linkForm,
    setLinkForm,
    activityForm,
    setActivityForm,
    oppForm,
    setOppForm,
    leadForm,
    setLeadForm,
    handleUpdateCompany,
    handleLinkContact,
    handleUnlinkContact,
    handleLogActivity,
    handleAddNote,
    handleAddOpportunity,
    handleAddLead,
    handleAdvanceOpportunity,
    handleConvertLead,
  };
}
