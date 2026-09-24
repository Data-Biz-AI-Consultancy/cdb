'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';
import {
  AccountAIBriefResponse,
  NextBestActionItem,
} from '@/app/signals/types';
import {
  TEMPERATURE_META,
  CompanyActiveTab,
} from './types';
import {
  CompanyHeroHeader,
  CompanyAIBriefTab,
  CompanyEmployeesTab,
  CompanyTimelineTab,
  CompanyNotesTab,
  CompanyOpportunitiesTab,
  CompanyLeadsTab,
  CompanyEngagementsTab,
  CompanyProfileTab,
  CompanySignalsTab,
  CompanyModals,
} from './components';

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>('');

  const [company, setCompany] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [allPersons, setAllPersons] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // AI Account Brief & Next Best Actions
  const [aiBrief, setAiBrief] = useState<AccountAIBriefResponse | null>(null);
  const [nextBestActions, setNextBestActions] = useState<NextBestActionItem[]>([]);
  const [regeneratingBrief, setRegeneratingBrief] = useState(false);

  // Active Tab (Defaults to AI Account Brief & Actions)
  const [activeTab, setActiveTab] = useState<CompanyActiveTab>('brief');

  // Employee Tab Controls: Subfilter & Sorting
  const [employeeSubFilter, setEmployeeSubFilter] = useState<'all' | 'current' | 'alumni'>('all');
  const [employeeSortBy, setEmployeeSortBy] = useState<'warmth' | 'interaction' | 'name' | 'tenure'>('warmth');

  // Activity filter
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');

  // Signals filter
  const [detectedSignals, setDetectedSignals] = useState<any[]>([]);
  const [signalSubFilter, setSignalSubFilter] = useState<'all' | 'active' | 'risk' | 'opportunity'>('active');

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

  useEffect(() => {
    if (params && typeof (params as any).then === 'function') {
      (params as Promise<{ id: string }>).then((p) => {
        if (p?.id) setId(p.id);
      });
    } else if (params && (params as any).id) {
      setId((params as any).id);
    }
  }, [params]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const loadAllData = async (targetId: string) => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const [
        compData,
        empData,
        actData,
        oppData,
        leadData,
        personsData,
        engData,
        sigData,
        briefData,
        nbaData,
      ] = await Promise.all([
        apiFetch<any>(`/api/v1/companies/${targetId}`),
        apiFetch<any[]>(`/api/v1/companies/${targetId}/employees`).catch(() => []),
        apiFetch<ApiResponse<any[]>>(`/api/v1/activities?company_id=${targetId}&page_size=100`).catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>(`/api/v1/opportunities?company_id=${targetId}&page_size=100`).catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>(`/api/v1/leads?company_id=${targetId}&page_size=100&sort=created_at&order=desc`).catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>('/api/v1/persons?page_size=100').catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>(`/api/v1/engagements?company_id=${targetId}&limit=100`).catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>(`/api/v1/signals/detected?company_id=${targetId}&page_size=100`).catch(() => ({ data: [] })),
        apiFetch<AccountAIBriefResponse>(`/api/v1/companies/${targetId}/ai-brief`).catch(() => null),
        apiFetch<{ data: NextBestActionItem[] }>(`/api/v1/companies/${targetId}/next-best-actions`).catch(() => ({ data: [] })),
      ]);

      setCompany(compData);
      setEmployees(empData || []);
      setActivities(actData.data || []);
      setOpportunities(oppData.data || []);
      setLeads(leadData.data || []);
      setAllPersons(personsData.data || []);
      setEngagements(engData.data || []);
      setDetectedSignals(sigData?.data || []);
      setAiBrief(briefData);
      setNextBestActions(nbaData?.data || []);

      // Populate edit form
      setCompanyForm({
        name: compData.name || '',
        domain: compData.domain || '',
        industry: compData.industry || '',
        size_range: compData.size_range || '',
        city: compData.city || '',
        country: compData.country || '',
        linkedin_url: compData.linkedin_url || '',
        tags: Array.isArray(compData.attributes?.tags) ? compData.attributes.tags.join(', ') : '',
        notes: compData.attributes?.notes || '',
      });

      if (personsData.data?.length > 0) {
        setLinkForm((prev) => ({ ...prev, person_id: prev.person_id || personsData.data[0].id }));
        setLeadForm((prev) => ({ ...prev, person_id: prev.person_id || (empData?.[0]?.person_id || personsData.data[0].id) }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBrief = async () => {
    if (!id) return;
    setRegeneratingBrief(true);
    try {
      const [updatedBrief, updatedNba] = await Promise.all([
        apiFetch<AccountAIBriefResponse>(`/api/v1/companies/${id}/ai-brief/regenerate`, { method: 'POST' }),
        apiFetch<{ data: NextBestActionItem[] }>(`/api/v1/companies/${id}/next-best-actions`),
      ]);
      setAiBrief(updatedBrief);
      setNextBestActions(updatedNba?.data || []);
      showSuccess('AI Account Intelligence Brief regenerated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate AI Account Brief.');
    } finally {
      setRegeneratingBrief(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadAllData(id);
    }
  }, [id]);

  // Compute latest activity per person
  const latestInteractionByPerson = activities.reduce((acc: Record<string, any>, act) => {
    if (act.person_id) {
      const existing = acc[act.person_id];
      if (!existing || new Date(act.occurred_at) > new Date(existing.occurred_at)) {
        acc[act.person_id] = act;
      }
    }
    return acc;
  }, {});

  // Processed and sorted employees
  const processedEmployees = employees
    .filter((emp) => {
      if (employeeSubFilter === 'current') return emp.is_current;
      if (employeeSubFilter === 'alumni') return !emp.is_current;
      return true;
    })
    .sort((a, b) => {
      if (employeeSortBy === 'warmth') {
        const tempA = (a.attributes?.temperature || 'dormant').toLowerCase();
        const tempB = (b.attributes?.temperature || 'dormant').toLowerCase();
        const orderA = TEMPERATURE_META[tempA]?.order ?? 5;
        const orderB = TEMPERATURE_META[tempB]?.order ?? 5;
        if (orderA !== orderB) return orderA - orderB;
      }

      if (employeeSortBy === 'interaction') {
        const actA = latestInteractionByPerson[a.person_id]?.occurred_at;
        const actB = latestInteractionByPerson[b.person_id]?.occurred_at;
        if (actA && !actB) return -1;
        if (!actA && actB) return 1;
        if (actA && actB) return new Date(actB).getTime() - new Date(actA).getTime();
      }

      if (employeeSortBy === 'name') {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      }

      if (employeeSortBy === 'tenure') {
        const startA = a.started_at ? new Date(a.started_at).getTime() : 0;
        const startB = b.started_at ? new Date(b.started_at).getTime() : 0;
        return startB - startA;
      }

      return 0;
    });

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
      setLinkForm({ person_id: allPersons[0]?.id || '', title: '', is_current: true, started_at: '', ended_at: '' });
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
      setActivityForm({ title: '', type: 'linkedin_message', source: 'linkedin', summary: '', person_id: '' });
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Loading company intelligence & staff directory...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto">
            🏢
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Company Record Not Found</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {error
                ? error
                : `The requested company record${id ? ` (ID: ${id})` : ''} does not exist in the database or may have been deleted.`}
            </p>
          </div>
          <div className="pt-4 flex items-center justify-center gap-3">
            <Link
              href="/companies"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              ← Back to Companies Directory
            </Link>
            <Link
              href="/activities"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              View Activities Feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalOppValue = opportunities.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
  const companyNotes = activities.filter((a) => a.type === 'note');
  const filteredActivities = activities.filter((act) => {
    if (activityTypeFilter === 'all') return true;
    return act.type === activityTypeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-200 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="font-bold">✓</span>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Header Card */}
      <CompanyHeroHeader
        company={company}
        employees={employees}
        opportunities={opportunities}
        leads={leads}
        activities={activities}
        detectedSignals={detectedSignals}
        onLogActivity={() => setShowLogActivity(true)}
        onAddNote={() => setShowAddNote(true)}
        onLinkContact={() => setShowLinkContact(true)}
        onAddOpportunity={() => setShowAddOpp(true)}
        onAddLead={() => setShowAddLead(true)}
        onEditCompany={() => setShowEditCompany(true)}
        onReviewSignals={() => setActiveTab('signals')}
      />

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 bg-white px-3 pt-2 rounded-t-xl border">
        <button
          onClick={() => setActiveTab('brief')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'brief'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span>🤖 AI Account Brief & Actions</span>
          {nextBestActions.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
              {nextBestActions.length} Actions
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'employees'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span>👥 Employees & Contacts</span>
          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
            {employees.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'timeline'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span>⏱️ Activity Timeline</span>
          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
            {activities.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'notes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span>📌 Notes</span>
          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
            {companyNotes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('opportunities')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'opportunities'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span>💼 Opportunities</span>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
            {opportunities.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('leads')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'leads'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span>🎯 Leads & Signals</span>
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
            {leads.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('engagements')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'engagements'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span>📋 Engagements</span>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
            {engagements.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('signals')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'signals'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span>⚡ Signals</span>
          {detectedSignals.filter((s) => s.status === 'active').length > 0 ? (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold animate-pulse">
              {detectedSignals.filter((s) => s.status === 'active').length} Active
            </span>
          ) : (
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {detectedSignals.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span>🏢 Company Details</span>
        </button>
      </div>

      {/* Tab: AI Account Brief & Actions */}
      {activeTab === 'brief' && (
        <CompanyAIBriefTab
          aiBrief={aiBrief}
          nextBestActions={nextBestActions}
          regeneratingBrief={regeneratingBrief}
          onRegenerateBrief={handleRegenerateBrief}
          onNavigateToTimeline={() => setActiveTab('timeline')}
        />
      )}

      {/* Tab: Employees & Contacts */}
      {activeTab === 'employees' && (
        <CompanyEmployeesTab
          employees={employees}
          processedEmployees={processedEmployees}
          employeeSubFilter={employeeSubFilter}
          setEmployeeSubFilter={setEmployeeSubFilter}
          employeeSortBy={employeeSortBy}
          setEmployeeSortBy={setEmployeeSortBy}
          latestInteractionByPerson={latestInteractionByPerson}
          onLinkContact={() => setShowLinkContact(true)}
          onUnlinkContact={handleUnlinkContact}
        />
      )}

      {/* Tab: Timeline & Activities */}
      {activeTab === 'timeline' && (
        <CompanyTimelineTab
          activities={activities}
          filteredActivities={filteredActivities}
          employees={employees}
          activityTypeFilter={activityTypeFilter}
          setActivityTypeFilter={setActivityTypeFilter}
          onLogActivity={() => setShowLogActivity(true)}
        />
      )}

      {/* Tab: Notes */}
      {activeTab === 'notes' && (
        <CompanyNotesTab
          companyNotes={companyNotes}
          noteForm={noteForm}
          setNoteForm={setNoteForm}
          onAddNote={handleAddNote}
        />
      )}

      {/* Tab: Opportunities */}
      {activeTab === 'opportunities' && (
        <CompanyOpportunitiesTab
          opportunities={opportunities}
          totalOppValue={totalOppValue}
          onAddOpportunity={() => setShowAddOpp(true)}
          onAdvanceOpportunity={handleAdvanceOpportunity}
        />
      )}

      {/* Tab: Leads */}
      {activeTab === 'leads' && (
        <CompanyLeadsTab
          leads={leads}
          onAddLead={() => setShowAddLead(true)}
          onConvertLead={handleConvertLead}
        />
      )}

      {/* Tab: Client Engagements */}
      {activeTab === 'engagements' && (
        <CompanyEngagementsTab
          company={company}
          engagements={engagements}
        />
      )}

      {/* Tab: Profile & Metadata */}
      {activeTab === 'profile' && (
        <CompanyProfileTab
          company={company}
          onEditCompany={() => setShowEditCompany(true)}
        />
      )}

      {/* Tab: Account Opportunity & Risk Signals */}
      {activeTab === 'signals' && (
        <CompanySignalsTab
          company={company}
          detectedSignals={detectedSignals}
          signalSubFilter={signalSubFilter}
          setSignalSubFilter={setSignalSubFilter}
        />
      )}

      {/* Modals Dialogs */}
      <CompanyModals
        company={company}
        employees={employees}
        allPersons={allPersons}
        showEditCompany={showEditCompany}
        setShowEditCompany={setShowEditCompany}
        showLinkContact={showLinkContact}
        setShowLinkContact={setShowLinkContact}
        showLogActivity={showLogActivity}
        setShowLogActivity={setShowLogActivity}
        showAddNote={showAddNote}
        setShowAddNote={setShowAddNote}
        showAddOpp={showAddOpp}
        setShowAddOpp={setShowAddOpp}
        showAddLead={showAddLead}
        setShowAddLead={setShowAddLead}
        companyForm={companyForm}
        setCompanyForm={setCompanyForm}
        handleUpdateCompany={handleUpdateCompany}
        linkForm={linkForm}
        setLinkForm={setLinkForm}
        handleLinkContact={handleLinkContact}
        activityForm={activityForm}
        setActivityForm={setActivityForm}
        handleLogActivity={handleLogActivity}
        noteForm={noteForm}
        setNoteForm={setNoteForm}
        handleAddNote={handleAddNote}
        oppForm={oppForm}
        setOppForm={setOppForm}
        handleAddOpportunity={handleAddOpportunity}
        leadForm={leadForm}
        setLeadForm={setLeadForm}
        handleAddLead={handleAddLead}
      />
    </div>
  );
}
