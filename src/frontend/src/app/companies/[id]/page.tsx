'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';

// Segment definitions & visual mapping
const SEGMENT_META: Record<string, { label: string; bg: string; text: string; border: string }> = {
  clients_and_prospects: {
    label: 'Clients & Prospects',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  hiring_decision_makers: {
    label: 'Hiring Decision-Makers',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
  recruiters_and_talent: {
    label: 'Recruiters & Talent',
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  former_colleagues_alumni: {
    label: 'Alumni & Colleagues',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  peer_collaborators: {
    label: 'Peer Collaborators',
    bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
  },
  general_network: {
    label: 'General Network',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    text: 'text-slate-700',
    border: 'border-slate-200',
  },
};

const TEMPERATURE_META: Record<string, { label: string; icon: string; bg: string; text: string; order: number }> = {
  hot: { label: 'Hot', icon: '🔥', bg: 'bg-red-100 border-red-200', text: 'text-red-700', order: 1 },
  warm: { label: 'Warm', icon: '☀️', bg: 'bg-amber-100 border-amber-200', text: 'text-amber-700', order: 2 },
  cold: { label: 'Cold', icon: '❄️', bg: 'bg-blue-100 border-blue-200', text: 'text-blue-700', order: 3 },
  dormant: { label: 'Dormant', icon: '⏳', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600', order: 4 },
};

const ACTIVITY_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  linkedin_message: { label: 'LinkedIn Message', icon: '💼', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  meeting: { label: 'Meeting / Notion Notes', icon: '📝', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  email: { label: 'Email', icon: '✉️', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  call: { label: 'Phone Call', icon: '📞', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  whatsapp: { label: 'WhatsApp', icon: '💬', color: 'bg-green-100 text-green-800 border-green-200' },
  note: { label: 'Internal Note', icon: '📌', color: 'bg-slate-100 text-slate-800 border-slate-200' },
};

const STAGES = [
  { id: 'prospect', label: 'Prospect' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'closed_won', label: 'Closed Won' },
  { id: 'closed_lost', label: 'Closed Lost' },
];

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>('');

  const [company, setCompany] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [allPersons, setAllPersons] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'employees' | 'timeline' | 'notes' | 'opportunities' | 'leads' | 'profile'>('employees');

  // Employee Tab Controls: Subfilter & Sorting
  const [employeeSubFilter, setEmployeeSubFilter] = useState<'all' | 'current' | 'alumni'>('all');
  const [employeeSortBy, setEmployeeSortBy] = useState<'warmth' | 'interaction' | 'name' | 'tenure'>('warmth');

  // Activity filter
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');

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
      const [compData, empData, actData, oppData, leadData, personsData] = await Promise.all([
        apiFetch<any>(`/api/v1/companies/${targetId}`),
        apiFetch<any[]>(`/api/v1/companies/${targetId}/employees`).catch(() => []),
        apiFetch<ApiResponse<any[]>>(`/api/v1/activities?company_id=${targetId}&page_size=100`).catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>(`/api/v1/opportunities?company_id=${targetId}&page_size=100`).catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>(`/api/v1/leads?company_id=${targetId}&page_size=100&sort=created_at&order=desc`).catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>('/api/v1/persons?page_size=100').catch(() => ({ data: [] })),
      ]);

      setCompany(compData);
      setEmployees(empData || []);
      setActivities(actData.data || []);
      setOpportunities(oppData.data || []);
      setLeads(leadData.data || []);
      setAllPersons(personsData.data || []);

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

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 shadow-sm space-y-3">
        <h2 className="font-bold text-base">Error Loading Company</h2>
        <p className="text-sm">{error}</p>
        <Link href="/companies" className="inline-block text-xs font-semibold text-red-800 underline">
          ← Return to Companies List
        </Link>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-slate-600">Company record not found.</p>
        <Link href="/companies" className="text-blue-600 hover:underline text-sm">
          ← Back to Companies
        </Link>
      </div>
    );
  }

  const currentEmployeesCount = employees.filter((e) => e.is_current).length;
  const alumniCount = employees.filter((e) => !e.is_current).length;
  const totalOppValue = opportunities.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
  const companyNotes = activities.filter((a) => a.type === 'note');
  const filteredActivities = activities.filter((act) => {
    if (activityTypeFilter === 'all') return true;
    return act.type === activityTypeFilter;
  });

  const customTags: string[] = Array.isArray(company.attributes?.tags) ? company.attributes.tags : [];

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

      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/companies"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <span>←</span>
          <span>Back to Companies Directory</span>
        </Link>
        <span className="text-xs text-slate-400 font-mono">ID: {company.id}</span>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left Avatar & Identity */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-700 to-slate-900 text-white flex items-center justify-center text-xl font-bold tracking-tight shadow-md shrink-0 border-2 border-slate-700">
              {company.name?.[0]?.toUpperCase() || 'C'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{company.name}</h1>
                {company.industry && (
                  <span className="text-xs px-3 py-1 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {company.industry}
                  </span>
                )}
                {company.size_range && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    👥 {company.size_range}
                  </span>
                )}
              </div>

              {/* Domain, Location & Social */}
              <div className="text-sm text-slate-600 mt-2 flex flex-wrap items-center gap-3">
                {company.domain && (
                  <a
                    href={`https://${company.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-mono text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-200"
                  >
                    <span>🌐</span>
                    <span>{company.domain}</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                )}
                {(company.city || company.country) && (
                  <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
                    <span>📍</span>
                    <span>{[company.city, company.country].filter(Boolean).join(', ')}</span>
                  </span>
                )}
                {company.linkedin_url && (
                  <a
                    href={company.linkedin_url.startsWith('http') ? company.linkedin_url : `https://${company.linkedin_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-700 hover:underline text-xs bg-sky-50 px-2 py-0.5 rounded border border-sky-200"
                  >
                    <span>💼 LinkedIn</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                )}
              </div>

              {/* Tags */}
              {customTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {customTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-mono px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md border border-slate-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowLogActivity(true)}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-sm transition flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Log Activity</span>
            </button>
            <button
              onClick={() => setShowAddNote(true)}
              className="px-3.5 py-2 text-xs font-semibold bg-white text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm transition flex items-center gap-1.5"
            >
              <span>📌</span>
              <span>Add Note</span>
            </button>
            <button
              onClick={() => setShowLinkContact(true)}
              className="px-3.5 py-2 text-xs font-semibold bg-white text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm transition flex items-center gap-1.5"
            >
              <span>👥</span>
              <span>Link Contact</span>
            </button>
            <button
              onClick={() => setShowAddOpp(true)}
              className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-sm transition flex items-center gap-1.5"
            >
              <span>💼</span>
              <span>New Deal</span>
            </button>
            <button
              onClick={() => setShowAddLead(true)}
              className="px-3.5 py-2 text-xs font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-600 shadow-sm transition flex items-center gap-1.5"
            >
              <span>🎯</span>
              <span>New Lead</span>
            </button>
            <button
              onClick={() => setShowEditCompany(true)}
              className="px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-200 transition flex items-center gap-1"
            >
              <span>✏️</span>
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Key KPI Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Associated Contacts</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{employees.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              <span className="text-emerald-700 font-semibold">{currentEmployeesCount} active</span> · {alumniCount} alumni
            </div>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Pipeline Value</div>
            <div className="text-xl font-bold text-emerald-700 mt-0.5">€{totalOppValue.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{opportunities.length} open/active deals</div>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active Leads</div>
            <div className="text-xl font-bold text-amber-600 mt-0.5">{leads.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Inbound & outbound signals</div>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Activities Logged</div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">{activities.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Meetings, notes & touchpoints</div>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 bg-white px-3 pt-2 rounded-t-xl border">
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
          <span>⏱️ Timeline & Activities</span>
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
          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
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
          <span>🎯 Leads</span>
          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
            {leads.length}
          </span>
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

      {/* Tab 1: Employees & Contacts */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Controls Bar: Sub-filters & Sort dropdown */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Filter:</span>
              <button
                onClick={() => setEmployeeSubFilter('all')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  employeeSubFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Contacts ({employees.length})
              </button>
              <button
                onClick={() => setEmployeeSubFilter('current')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  employeeSubFilter === 'current'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Current Staff ({currentEmployeesCount})
              </button>
              <button
                onClick={() => setEmployeeSubFilter('alumni')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  employeeSubFilter === 'alumni'
                    ? 'bg-amber-700 text-white shadow-sm'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Alumni / Past ({alumniCount})
              </button>
            </div>

            {/* Sort & Action Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Sort by:</label>
                <select
                  value={employeeSortBy}
                  onChange={(e) => setEmployeeSortBy(e.target.value as any)}
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="warmth">🔥 Warmth (Hot → Cold)</option>
                  <option value="interaction">⏱️ Latest Interaction (Newest)</option>
                  <option value="name">🔤 Name (A-Z)</option>
                  <option value="tenure">📅 Tenure / Start Date</option>
                </select>
              </div>

              <button
                onClick={() => setShowLinkContact(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition"
              >
                + Link Person
              </button>
            </div>
          </div>

          {/* Employees List */}
          {processedEmployees.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3 shadow-sm">
              <p className="text-sm text-slate-500">No contacts match the selected filter.</p>
              <button
                onClick={() => setShowLinkContact(true)}
                className="px-3.5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
              >
                + Link First Person
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedEmployees.map((emp) => {
                const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unnamed Contact';
                const empInitials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase() || 'P';
                const rawSegment = emp.attributes?.segment || 'general_network';
                const segInfo = SEGMENT_META[rawSegment] || SEGMENT_META.general_network;
                const rawTemp = emp.attributes?.temperature || emp.attributes?.engagement_temperature;
                const tempInfo = rawTemp ? TEMPERATURE_META[rawTemp.toLowerCase()] : null;
                const lastAct = latestInteractionByPerson[emp.person_id];

                return (
                  <div
                    key={emp.relationship_id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center text-sm font-bold shadow shrink-0">
                            {empInitials}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/persons/${emp.person_id}`}
                                className="font-bold text-slate-900 hover:text-blue-600 transition text-base"
                              >
                                {empName}
                              </Link>
                              {emp.is_current ? (
                                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                  Current
                                </span>
                              ) : (
                                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                  Alumni
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-medium text-slate-700 mt-0.5">
                              {emp.title || 'Role not specified'}
                            </div>
                          </div>
                        </div>

                        {/* Unlink Action */}
                        <button
                          onClick={() => handleUnlinkContact(emp.person_id)}
                          title="Unlink contact from company"
                          className="text-slate-400 hover:text-red-600 text-xs p-1 rounded transition"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Badges: Segment & Warmth */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${segInfo.bg}`}>
                          {segInfo.label}
                        </span>

                        {tempInfo && (
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${tempInfo.bg} ${tempInfo.text} inline-flex items-center gap-1`}
                          >
                            <span>{tempInfo.icon}</span>
                            <span>{tempInfo.label}</span>
                          </span>
                        )}
                      </div>

                      {/* Contact Info & Location */}
                      <div className="text-xs text-slate-600 mt-3 space-y-1">
                        {emp.primary_email && (
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                            <span>✉️</span>
                            <a href={`mailto:${emp.primary_email}`} className="hover:underline text-blue-600">
                              {emp.primary_email}
                            </a>
                          </div>
                        )}
                        {(emp.city || emp.country) && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span>📍</span>
                            <span>{[emp.city, emp.country].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                        {emp.linkedin_url && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span>💼</span>
                            <a
                              href={emp.linkedin_url.startsWith('http') ? emp.linkedin_url : `https://${emp.linkedin_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-700 hover:underline"
                            >
                              LinkedIn Profile ↗
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer: Dates & Last Interaction */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <div>
                        {emp.started_at ? (
                          <span>
                            Tenure: {emp.started_at} {emp.ended_at ? `to ${emp.ended_at}` : '→ Present'}
                          </span>
                        ) : (
                          <span>Tenure dates not set</span>
                        )}
                      </div>

                      {lastAct ? (
                        <div className="inline-flex items-center gap-1 text-slate-700 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          <span>⏱️ Last touch:</span>
                          <span>{new Date(lastAct.occurred_at).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No logged interaction</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Timeline & Activities */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {/* Activity Filters & Log Button */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Type:</span>
              <button
                onClick={() => setActivityTypeFilter('all')}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                  activityTypeFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({activities.length})
              </button>
              {Object.entries(ACTIVITY_TYPE_META).map(([typeKey, meta]) => {
                const count = activities.filter((a) => a.type === typeKey).length;
                if (count === 0 && activityTypeFilter !== typeKey) return null;
                return (
                  <button
                    key={typeKey}
                    onClick={() => setActivityTypeFilter(typeKey)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                      activityTypeFilter === typeKey
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowLogActivity(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm transition"
            >
              + Log Activity
            </button>
          </div>

          {/* Activity List */}
          {filteredActivities.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3 shadow-sm">
              <p className="text-sm text-slate-500">No activities recorded for this filter.</p>
              <button
                onClick={() => setShowLogActivity(true)}
                className="px-3.5 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm"
              >
                + Log First Activity
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((act) => {
                const meta = ACTIVITY_TYPE_META[act.type] || {
                  label: act.type,
                  icon: '📌',
                  color: 'bg-slate-100 text-slate-800 border-slate-200',
                };
                const linkedPerson = employees.find((e) => e.person_id === act.person_id);

                return (
                  <div
                    key={act.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition flex items-start gap-3.5"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-lg shrink-0 border border-slate-200 shadow-xs">
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{act.title || meta.label}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${meta.color}`}>
                            {meta.label}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                            {act.source}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(act.occurred_at).toLocaleString()}
                        </span>
                      </div>

                      {linkedPerson && (
                        <div className="mt-1 text-xs text-slate-600">
                          <span>With contact: </span>
                          <Link
                            href={`/persons/${linkedPerson.person_id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {linkedPerson.first_name} {linkedPerson.last_name} ({linkedPerson.title || 'Staff'})
                          </Link>
                        </div>
                      )}

                      {act.summary && (
                        <p className="text-xs text-slate-600 mt-2 bg-slate-50/80 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                          {act.summary}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Notes */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* Quick Note Composer */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>📌</span>
              <span>Internal Company Scratchpad & Notes</span>
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={noteForm.title}
                onChange={(e) => setNoteForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Note title (e.g. Q4 Budget Discussion, Tech Stack Audit)..."
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={noteForm.summary}
                onChange={(e) => setNoteForm((prev) => ({ ...prev, summary: e.target.value }))}
                rows={3}
                placeholder="Write internal observations, meeting notes, stakeholder sentiments, or action items..."
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleAddNote()}
                  disabled={!noteForm.summary.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50 shadow-sm"
                >
                  Save Internal Note
                </button>
              </div>
            </div>
          </div>

          {/* Notes Feed */}
          {companyNotes.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm shadow-sm">
              No internal notes recorded yet for this company.
            </div>
          ) : (
            <div className="space-y-3">
              {companyNotes.map((n) => (
                <div key={n.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{n.title || 'Internal Note'}</span>
                    <span className="text-slate-400 font-mono">{new Date(n.occurred_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {n.summary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Opportunities */}
      {activeTab === 'opportunities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Deals & Opportunities Pipeline</h2>
              <p className="text-xs text-slate-500">
                Total pipeline value: <span className="font-semibold text-emerald-700">€{totalOppValue.toLocaleString()}</span> across{' '}
                {opportunities.length} deals.
              </p>
            </div>
            <button
              onClick={() => setShowAddOpp(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition"
            >
              + New Deal
            </button>
          </div>

          {opportunities.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3 shadow-sm">
              <p className="text-sm text-slate-500">No deals currently linked to this company.</p>
              <button
                onClick={() => setShowAddOpp(true)}
                className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
              >
                + Create Deal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{opp.title}</h3>
                        <div className="text-base font-extrabold text-emerald-700 mt-1">
                          {opp.value ? `€${Number(opp.value).toLocaleString()}` : 'Value Unspecified'}
                        </div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {opp.stage.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {opp.probability !== null && (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                          <span>Confidence Level</span>
                          <span>{opp.probability}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${opp.probability}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {opp.notes && <p className="text-xs text-slate-600 mt-3 bg-slate-50 p-2.5 rounded border">{opp.notes}</p>}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">
                      {opp.expected_close_date ? `Close: ${opp.expected_close_date}` : 'No target date'}
                    </span>
                    {opp.stage !== 'closed_won' && opp.stage !== 'closed_lost' && (
                      <button
                        onClick={() => handleAdvanceOpportunity(opp.id)}
                        className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
                      >
                        Advance Stage →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Leads */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Leads & Inbound Signals</h2>
              <p className="text-xs text-slate-500">{leads.length} active lead signals registered for this account.</p>
            </div>
            <button
              onClick={() => setShowAddLead(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 shadow-sm transition"
            >
              + New Lead
            </button>
          </div>

          {leads.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3 shadow-sm">
              <p className="text-sm text-slate-500">No leads currently tracked for this company.</p>
              <button
                onClick={() => setShowAddLead(true)}
                className="px-3.5 py-2 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 shadow-sm"
              >
                + Create Lead
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{lead.title}</h3>
                        {lead.intent && <div className="text-xs font-medium text-slate-600 mt-1">Intent: {lead.intent}</div>}
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                        {lead.stage}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {lead.signal_strength && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          Signal: {lead.signal_strength}
                        </span>
                      )}
                      {lead.source && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {lead.source}
                        </span>
                      )}
                    </div>

                    {(lead.description || lead.notes) && <p className="text-xs text-slate-600 mt-3 bg-slate-50 p-2.5 rounded border leading-relaxed">{lead.description || lead.notes}</p>}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                    {lead.stage !== 'converted' && lead.stage !== 'disqualified' && (
                      <button
                        onClick={() => handleConvertLead(lead.id, lead.title)}
                        className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition"
                      >
                        Convert to Opp →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Profile & Metadata */}
      {activeTab === 'profile' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Company Intelligence & Profile</h2>
              <p className="text-xs text-slate-500">Firmographic profile data, location, domain, and custom tags.</p>
            </div>
            <button
              onClick={() => setShowEditCompany(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
            >
              ✎ Edit Information
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-4">
              <div>
                <dt className="text-xs text-slate-500 font-medium">Company Name</dt>
                <dd className="text-slate-900 font-bold text-base mt-0.5">{company.name}</dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500 font-medium">Domain</dt>
                <dd className="text-slate-900 font-mono text-xs mt-0.5">{company.domain || '—'}</dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500 font-medium">Industry</dt>
                <dd className="text-slate-900 font-medium mt-0.5">{company.industry || '—'}</dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500 font-medium">Company Size</dt>
                <dd className="text-slate-900 font-medium mt-0.5">{company.size_range || '—'}</dd>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <dt className="text-xs text-slate-500 font-medium">Headquarters Location</dt>
                <dd className="text-slate-900 font-medium mt-0.5">
                  {[company.city, company.country].filter(Boolean).join(', ') || '—'}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500 font-medium">LinkedIn URL</dt>
                <dd className="text-slate-900 mt-0.5">
                  {company.linkedin_url ? (
                    <a
                      href={company.linkedin_url.startsWith('http') ? company.linkedin_url : `https://${company.linkedin_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs"
                    >
                      {company.linkedin_url} ↗
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500 font-medium">Record Timestamps</dt>
                <dd className="text-slate-600 font-mono text-xs mt-0.5">
                  Created: {new Date(company.created_at).toLocaleDateString()} · Updated:{' '}
                  {new Date(company.updated_at).toLocaleDateString()}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500 font-medium">Internal Notes & Context</dt>
                <dd className="text-slate-700 text-xs mt-0.5 bg-slate-50 p-2.5 rounded border">
                  {company.attributes?.notes || 'No overview notes entered.'}
                </dd>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
