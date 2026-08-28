'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';

// Human-friendly mapping for segments
const SEGMENT_META: Record<string, { label: string; bg: string; text: string; border: string; desc: string }> = {
  clients_and_prospects: {
    label: 'Clients & Prospects',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    desc: 'Active/past clients and warm prospective consulting deals',
  },
  hiring_decision_makers: {
    label: 'Hiring Decision-Makers',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    desc: 'Founders, CTOs, VPs of Data/Engineering, and Heads',
  },
  recruiters_and_talent: {
    label: 'Recruiters & Talent Acquisition',
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'text-purple-700',
    border: 'border-purple-200',
    desc: 'Internal/agency recruiters, talent partners, and headhunters',
  },
  former_colleagues_alumni: {
    label: 'Alumni & Former Colleagues',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
    border: 'border-amber-200',
    desc: 'Alumni from target tech & consulting networks',
  },
  peer_collaborators: {
    label: 'Peer Collaborators & Agencies',
    bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    desc: 'Fellow consultants, partner agencies, and tooling partners',
  },
  general_network: {
    label: 'General Network',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    text: 'text-slate-700',
    border: 'border-slate-200',
    desc: 'General network contacts and connections',
  },
};

const TEMPERATURE_META: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  hot: { label: 'Hot', icon: '🔥', bg: 'bg-red-100 border-red-200', text: 'text-red-700' },
  warm: { label: 'Warm', icon: '☀️', bg: 'bg-amber-100 border-amber-200', text: 'text-amber-700' },
  dormant: { label: 'Dormant', icon: '⏳', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600' },
  cold: { label: 'Cold', icon: '❄️', bg: 'bg-blue-100 border-blue-200', text: 'text-blue-700' },
};

const ACTIVITY_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  linkedin_message: { label: 'LinkedIn Message', icon: '💼', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  meeting: { label: 'Meeting / Notion Notes', icon: '📝', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  email: { label: 'Email', icon: '✉️', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  call: { label: 'Phone Call', icon: '📞', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  whatsapp: { label: 'WhatsApp', icon: '💬', color: 'bg-green-100 text-green-800 border-green-200' },
  note: { label: 'Note', icon: '📌', color: 'bg-slate-100 text-slate-800 border-slate-200' },
};

const STAGES = [
  { id: 'prospect', label: 'Prospect' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'closed_won', label: 'Closed Won' },
  { id: 'closed_lost', label: 'Closed Lost' },
];

export default function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>('');

  const [person, setPerson] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active Tab: 'timeline' | 'notes' | 'employment' | 'opportunities' | 'leads' | 'changelog' | 'profile'
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'employment' | 'opportunities' | 'leads' | 'changelog' | 'profile'>('timeline');

  // Filter for activities timeline
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');
  // Filter for history changelog
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<string>('all');

  // Modals state
  const [showLinkCompany, setShowLinkCompany] = useState(false);
  const [showLogActivity, setShowLogActivity] = useState(false);
  const [showAddOpp, setShowAddOpp] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);

  // Quick note form state
  const [noteForm, setNoteForm] = useState({
    title: '',
    summary: '',
  });

  // Link company form state
  const [linkForm, setLinkForm] = useState({
    company_id: '',
    title: '',
    is_current: true,
    started_at: '',
    ended_at: '',
  });

  // Log activity form state
  const [activityForm, setActivityForm] = useState({
    title: '',
    type: 'linkedin_message',
    source: 'linkedin',
    summary: '',
  });

  // Add opportunity form state
  const [oppForm, setOppForm] = useState({
    title: '',
    stage: 'prospect',
    value: '',
    currency: 'EUR',
    probability: 50,
    expected_close_date: '',
    notes: '',
  });

  // Add lead form state
  const [leadForm, setLeadForm] = useState({
    title: '',
    stage: 'new',
    source: 'linkedin_message',
    intent: 'Consulting Inquiry',
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

  const loadAllData = async (targetId: string) => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const [personData, activitiesData, oppsData, leadsData, historyData, companiesData] = await Promise.all([
        apiFetch<any>(`/api/v1/persons/${targetId}`),
        apiFetch<ApiResponse<any[]>>(`/api/v1/activities?person_id=${targetId}&page_size=100`).catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>(`/api/v1/opportunities?person_id=${targetId}&page_size=100`).catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>(`/api/v1/leads?person_id=${targetId}&page_size=100`).catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>(`/api/v1/persons/${targetId}/history?page_size=100`).catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>('/api/v1/companies?page_size=100').catch(() => ({ data: [] })),
      ]);

      setPerson(personData);
      setActivities(activitiesData.data || []);
      setOpportunities(oppsData.data || []);
      setLeads(leadsData.data || []);
      setHistory(historyData.data || []);
      setCompanies(companiesData.data || []);

      if (companiesData.data?.length > 0) {
        setLinkForm((prev) => ({ ...prev, company_id: prev.company_id || companiesData.data[0].id }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load person full history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadAllData(id);
    }
  }, [id]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Handlers for creating relationships, activities, opps, leads
  const handleLinkCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      const payload: any = {
        company_id: linkForm.company_id,
        title: linkForm.title.trim(),
        is_current: linkForm.is_current,
      };
      if (linkForm.started_at) payload.started_at = linkForm.started_at;
      if (linkForm.ended_at && !linkForm.is_current) payload.ended_at = linkForm.ended_at;

      await apiFetch(`/api/v1/companies/persons/${id}/companies`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowLinkCompany(false);
      setLinkForm({ company_id: companies[0]?.id || '', title: '', is_current: true, started_at: '', ended_at: '' });
      showSuccess('Employment history relationship saved.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error linking company: ' + err.message);
    }
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await apiFetch('/api/v1/activities', {
        method: 'POST',
        body: JSON.stringify({
          person_id: id,
          title: activityForm.title.trim(),
          type: activityForm.type,
          source: activityForm.source,
          summary: activityForm.summary.trim() || undefined,
        }),
      });
      setShowLogActivity(false);
      setActivityForm({ title: '', type: 'linkedin_message', source: 'linkedin', summary: '' });
      showSuccess('Activity logged in person history.');
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
          person_id: id,
          type: 'note',
          source: 'manual',
          title: noteForm.title.trim() || 'Internal Note',
          summary: noteForm.summary.trim(),
          occurred_at: new Date().toISOString(),
        }),
      });
      setShowAddNote(false);
      setNoteForm({ title: '', summary: '' });
      showSuccess('Note added to person record.');
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
        person_ids: [{ person_id: id, role: 'decision_maker' }],
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
      showSuccess('Opportunity attached to person.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error creating opportunity: ' + err.message);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await apiFetch('/api/v1/leads', {
        method: 'POST',
        body: JSON.stringify({
          person_id: id,
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
        title: '',
        stage: 'new',
        source: 'linkedin_message',
        intent: 'Consulting Inquiry',
        signal_strength: 'strong',
        notes: '',
      });
      showSuccess('Lead attached to person.');
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
        <p className="text-sm font-medium">Loading person profile, employment history & activities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 shadow-sm space-y-3">
        <h2 className="font-bold text-base">Error Loading Person</h2>
        <p className="text-sm">{error}</p>
        <Link href="/persons" className="inline-block text-xs font-semibold text-red-800 underline">
          ← Return to Persons List
        </Link>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-slate-600">Person record not found.</p>
        <Link href="/persons" className="text-blue-600 hover:underline text-sm">
          ← Back to Persons
        </Link>
      </div>
    );
  }

  const fullName = `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unnamed Contact';
  const initials = `${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase() || 'P';

  // Segment & Temperature info
  const rawSegment = person.attributes?.segment || 'general_network';
  const segmentInfo = SEGMENT_META[rawSegment] || {
    label: rawSegment.replace(/_/g, ' '),
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    text: 'text-slate-700',
    border: 'border-slate-200',
    desc: 'Assigned segment tag',
  };

  const rawTemperature = person.attributes?.temperature || person.attributes?.engagement_temperature;
  const tempInfo = rawTemperature ? TEMPERATURE_META[rawTemperature.toLowerCase()] : null;

  // Custom tags from attributes
  const customTags: string[] = Array.isArray(person.attributes?.tags) ? person.attributes.tags : [];

  // Career items
  const careerItems: any[] = person.career || [];
  const currentRole = careerItems.find((c) => c.is_current);

  // Filtered activities
  const filteredActivities = activities.filter((act) => {
    if (activityTypeFilter === 'all') return true;
    return act.type === activityTypeFilter;
  });

  // Calculate total pipeline value
  const totalOppValue = opportunities.reduce((sum, o) => sum + (Number(o.value) || 0), 0);

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

      {/* Top Breadcrumb & Quick Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/persons"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <span>←</span>
          <span>Back to Persons Directory</span>
        </Link>
        <span className="text-xs text-slate-400 font-mono">ID: {person.id}</span>
      </div>

      {/* Hero Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left Avatar & Name */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center text-xl font-bold tracking-tight shadow-md shrink-0 border-2 border-slate-700">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{fullName}</h1>
                {/* Segment Badge */}
                <span
                  title={segmentInfo.desc}
                  className={`text-xs px-3 py-1 rounded-full font-semibold border ${segmentInfo.bg} shadow-sm inline-flex items-center gap-1`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  {segmentInfo.label}
                </span>

                {/* Engagement Temperature Badge */}
                {tempInfo && (
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${tempInfo.bg} ${tempInfo.text} inline-flex items-center gap-1`}
                  >
                    <span>{tempInfo.icon}</span>
                    <span>{tempInfo.label}</span>
                  </span>
                )}
              </div>

              {/* Current Role & Company */}
              <div className="text-sm text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                {currentRole ? (
                  <>
                    <span className="font-medium text-slate-800">{currentRole.title || 'Role'}</span>
                    <span className="text-slate-400">at</span>
                    <Link
                      href={`/companies/${currentRole.company?.id}`}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      {currentRole.company?.name || 'Company'}
                    </Link>
                  </>
                ) : (
                  <span className="text-slate-400 italic">No current company specified</span>
                )}

                {(person.city || person.country) && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-medium">
                      📍 {[person.city, person.country].filter(Boolean).join(', ')}
                    </span>
                  </>
                )}
              </div>

              {/* Tags & Labels Row */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
                  Tags & Sources:
                </span>
                {(person.sources || []).map((s: string) => (
                  <span
                    key={s}
                    className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-mono"
                  >
                    src:{s}
                  </span>
                ))}
                {customTags.map((tag: string) => (
                  <span
                    key={tag}
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-medium"
                  >
                    🏷️ {tag}
                  </span>
                ))}
                {customTags.length === 0 && (person.sources || []).length === 0 && (
                  <span className="text-xs text-slate-400 italic">None</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddNote(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <span>📝</span>
              <span>+ Add Note</span>
            </button>
            <button
              onClick={() => setShowLogActivity(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <span>+</span>
              <span>Log Activity</span>
            </button>
            <button
              onClick={() => setShowAddOpp(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <span>+</span>
              <span>Add Opportunity</span>
            </button>
            <button
              onClick={() => setShowAddLead(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <span>+</span>
              <span>Add Lead</span>
            </button>
            <button
              onClick={() => setShowLinkCompany(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition"
            >
              <span>💼</span>
              <span>Link Employment</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('employment')}
          className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 cursor-pointer transition"
        >
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Employment History</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{careerItems.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {currentRole ? '1 Current Role' : 'No Active Role'}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('timeline')}
          className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 cursor-pointer transition"
        >
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Touchpoints & Activities</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{activities.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {activities.length > 0 ? `Latest: ${new Date(activities[0].occurred_at || activities[0].created_at).toLocaleDateString()}` : 'No activities yet'}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('opportunities')}
          className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 cursor-pointer transition"
        >
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Opportunities Attached</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{opportunities.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Total Value: €{totalOppValue.toLocaleString()}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('leads')}
          className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 cursor-pointer transition"
        >
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Leads Attached</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{leads.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {leads.filter((l) => l.stage === 'new' || l.stage === 'contacted').length} Open Leads
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1 bg-white px-4 pt-2 rounded-t-xl shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'timeline'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🕒</span>
          <span>Timeline ({activities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'notes'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📝</span>
          <span>Notes ({activities.filter((a) => a.type === 'note').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('employment')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'employment'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>💼</span>
          <span>Employment ({careerItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('opportunities')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'opportunities'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>💰</span>
          <span>Opportunities ({opportunities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'leads'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🎯</span>
          <span>Leads ({leads.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('changelog')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'changelog'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📜</span>
          <span>Changelog & Audit ({history.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📋</span>
          <span>Contact & Intelligence Info</span>
        </button>
      </div>

      {/* Tab 1: Activities & Messages Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-slate-500">Filter Type:</span>
              <select
                value={activityTypeFilter}
                onChange={(e) => setActivityTypeFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
              >
                <option value="all">All Activities & Interactions ({activities.length})</option>
                <option value="linkedin_message">LinkedIn Messages</option>
                <option value="meeting">Notion Meeting Notes</option>
                <option value="email">Emails</option>
                <option value="call">Phone Calls</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="note">Internal Notes</option>
              </select>
            </div>

            <button
              onClick={() => setShowLogActivity(true)}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm"
            >
              + Log Interaction
            </button>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="bg-white p-12 border border-slate-200 rounded-xl text-center shadow-sm space-y-3">
              <div className="text-3xl">📭</div>
              <h3 className="font-semibold text-slate-800 text-sm">No activity logs recorded</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No recent LinkedIn messages, Notion meeting notes, or emails found for {fullName}.
              </p>
              <button
                onClick={() => setShowLogActivity(true)}
                className="text-xs bg-slate-900 text-white px-3.5 py-2 rounded-lg font-medium shadow-sm hover:bg-slate-800"
              >
                Log First Activity
              </button>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 sm:ml-6 space-y-6 py-2">
              {filteredActivities.map((act) => {
                const meta = ACTIVITY_TYPE_META[act.type] || {
                  label: act.type,
                  icon: '📌',
                  color: 'bg-slate-100 text-slate-800 border-slate-200',
                };
                const dateStr = new Date(act.occurred_at || act.created_at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={act.id} className="relative pl-6 sm:pl-8 group">
                    {/* Circle timeline dot */}
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-slate-600 group-hover:border-slate-900 transition shadow-sm flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${meta.color} flex items-center gap-1`}
                          >
                            <span>{meta.icon}</span>
                            <span>{meta.label}</span>
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                            {act.title || 'Untitled Interaction'}
                          </h4>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{dateStr}</span>
                      </div>

                      {act.summary && (
                        <p className="text-sm text-slate-700 mt-2.5 whitespace-pre-line bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                          {act.summary}
                        </p>
                      )}

                      {act.raw_content && (
                        <details className="mt-2 text-xs text-slate-500">
                          <summary className="cursor-pointer hover:text-slate-800 font-medium">
                            View Full Message Content
                          </summary>
                          <pre className="mt-1.5 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                            {act.raw_content}
                          </pre>
                        </details>
                      )}

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                        <div className="flex items-center gap-3">
                          <span>
                            Source: <strong className="text-slate-700 font-mono">{act.source}</strong>
                          </span>
                          {act.source_id && (
                            <span className="text-slate-400 truncate max-w-[200px]" title={act.source_id}>
                              Ref: {act.source_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Notes & Scratchpad */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* Quick Note Composer Card */}
          <div className="bg-white border border-amber-200/80 rounded-xl p-5 shadow-sm space-y-3 bg-gradient-to-br from-amber-50/30 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">📝</span>
                <h3 className="text-sm font-bold text-slate-900">Add Quick Note for {fullName}</h3>
              </div>
              <span className="text-xs text-amber-700 bg-amber-100/70 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                Internal CRM Scratchpad
              </span>
            </div>

            <form onSubmit={handleAddNote} className="space-y-3">
              <input
                placeholder="Note Title or Subject (optional, e.g. Sync notes, Personality traits, Preferences)"
                value={noteForm.title}
                onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />

              <textarea
                required
                rows={3}
                placeholder="Write observations, meeting follow-ups, decision-making notes, or key details..."
                value={noteForm.summary}
                onChange={(e) => setNoteForm({ ...noteForm, summary: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition resize-y"
              />

              <div className="flex justify-between items-center pt-1">
                <span className="text-[11px] text-slate-400">
                  Notes are saved immediately and recorded in the audit changelog.
                </span>
                <button
                  type="submit"
                  disabled={!noteForm.summary.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                >
                  <span>+</span>
                  <span>Post Note</span>
                </button>
              </div>
            </form>
          </div>

          {/* Notes List */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Notes History ({activities.filter((a) => a.type === 'note').length})
                </h3>
                <p className="text-xs text-slate-500">
                  All internal notes and memos recorded for this person
                </p>
              </div>
              <button
                onClick={() => setShowAddNote(true)}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium shadow-sm transition"
              >
                + Add Note
              </button>
            </div>

            {activities.filter((a) => a.type === 'note').length === 0 ? (
              <div className="p-10 text-center text-slate-500 space-y-2">
                <div className="text-3xl">📝</div>
                <p className="text-sm font-medium text-slate-700">No notes written yet</p>
                <p className="text-xs text-slate-500">
                  Use the quick composer above or click "+ Add Note" to log your first note.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities
                  .filter((a) => a.type === 'note')
                  .map((note) => {
                    const dateStr = new Date(note.occurred_at || note.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={note.id}
                        className="p-4 bg-amber-50/20 border border-amber-200/60 rounded-xl shadow-sm hover:border-amber-300 transition space-y-2"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">📝</span>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {note.title || 'Internal Note'}
                            </h4>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">{dateStr}</span>
                        </div>

                        <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-white/80 p-3 rounded-lg border border-amber-100">
                          {note.summary}
                        </p>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Employment & Career History */}
      {activeTab === 'employment' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Career & Employment History</h2>
              <p className="text-xs text-slate-500">Verified company affiliations, current & past roles</p>
            </div>
            <button
              onClick={() => setShowLinkCompany(true)}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3.5 py-2 rounded-lg shadow-sm"
            >
              + Add Employment Record
            </button>
          </div>

          {careerItems.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-2">
              <p className="text-sm">No linked employment history found for this person.</p>
              <button
                onClick={() => setShowLinkCompany(true)}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                + Link to a Company now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {careerItems.map((item: any) => (
                <div
                  key={item.relationship_id}
                  className={`p-4 rounded-xl border transition shadow-sm ${
                    item.is_current
                      ? 'bg-emerald-50/30 border-emerald-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        <Link
                          href={`/companies/${item.company.id}`}
                          className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          <span>{item.company.name}</span>
                          <span className="text-xs">↗</span>
                        </Link>
                      </h3>
                      <div className="text-sm font-semibold text-slate-700 mt-0.5">
                        {item.title || 'Role not specified'}
                      </div>
                    </div>
                    {item.is_current ? (
                      <span className="text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-full">
                        Current Role
                      </span>
                    ) : (
                      <span className="text-[11px] bg-slate-100 text-slate-600 border border-slate-200 font-medium px-2 py-0.5 rounded-full">
                        Past Role
                      </span>
                    )}
                  </div>

                  <dl className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                    <div>
                      <dt className="text-slate-400 font-medium">Domain / Industry</dt>
                      <dd className="font-mono text-slate-800 truncate">
                        {item.company.domain || item.company.industry || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Tenure</dt>
                      <dd className="text-slate-800 font-medium">
                        {item.started_at ? new Date(item.started_at).toLocaleDateString() : 'Start date unknown'}{' '}
                        →{' '}
                        {item.is_current
                          ? 'Present'
                          : item.ended_at
                          ? new Date(item.ended_at).toLocaleDateString()
                          : 'End date unknown'}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Opportunities Attached */}
      {activeTab === 'opportunities' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Opportunities Attached ({opportunities.length})</h2>
              <p className="text-xs text-slate-500">Sales pipeline and consulting deals involving {fullName}</p>
            </div>
            <button
              onClick={() => setShowAddOpp(true)}
              className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-3.5 py-2 rounded-lg shadow-sm"
            >
              + New Opportunity
            </button>
          </div>

          {opportunities.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-2">
              <p className="text-sm">No sales deals or opportunities currently attached to this person.</p>
              <button
                onClick={() => setShowAddOpp(true)}
                className="text-xs text-emerald-700 hover:underline font-semibold"
              >
                + Create new opportunity for {fullName}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Deal Title</th>
                    <th className="p-3">Stage</th>
                    <th className="p-3">Value</th>
                    <th className="p-3">Probability</th>
                    <th className="p-3">Expected Close</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {opportunities.map((opp) => (
                    <tr key={opp.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{opp.title}</div>
                        {opp.notes && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{opp.notes}</div>}
                      </td>
                      <td className="p-3">
                        <span className="text-xs uppercase font-bold bg-slate-100 text-slate-800 border px-2 py-0.5 rounded">
                          {opp.stage.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-emerald-700">
                        {opp.value ? `${opp.currency || '€'} ${Number(opp.value).toLocaleString()}` : '—'}
                      </td>
                      <td className="p-3 text-slate-700">{opp.probability ? `${opp.probability}%` : '—'}</td>
                      <td className="p-3 text-xs text-slate-500">
                        {opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {opp.stage !== 'closed_won' && opp.stage !== 'closed_lost' && (
                          <button
                            onClick={() => handleAdvanceOpportunity(opp.id)}
                            className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium px-2.5 py-1 rounded"
                          >
                            Advance Stage →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Leads Attached */}
      {activeTab === 'leads' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Leads Attached ({leads.length})</h2>
              <p className="text-xs text-slate-500">Inbound signals and leads linked to {fullName}</p>
            </div>
            <button
              onClick={() => setShowAddLead(true)}
              className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3.5 py-2 rounded-lg shadow-sm"
            >
              + New Lead
            </button>
          </div>

          {leads.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-2">
              <p className="text-sm">No leads currently attached to this person.</p>
              <button
                onClick={() => setShowAddLead(true)}
                className="text-xs text-amber-700 hover:underline font-semibold"
              >
                + Add inbound lead for {fullName}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Lead Title</th>
                    <th className="p-3">Stage</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Intent / Signals</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{l.title || 'Untitled Lead'}</div>
                        {l.notes && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{l.notes}</div>}
                      </td>
                      <td className="p-3">
                        <span className="text-xs uppercase font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                          {l.stage}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-mono text-xs">{l.source}</td>
                      <td className="p-3 text-xs text-slate-700">
                        {l.intent && <div className="font-medium">{l.intent}</div>}
                        {l.signal_strength && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase">
                            Signal: {l.signal_strength}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {l.stage !== 'converted' ? (
                          <button
                            onClick={() => handleConvertLead(l.id, l.title)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded font-semibold transition"
                          >
                            Convert to Opp →
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-700 font-semibold">✓ Converted</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Changelog & Audit History (person_history) */}
      {activeTab === 'changelog' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Audit History & Changelog ({history.length})</h2>
              <p className="text-xs text-slate-500">
                Immutable event trail of all status changes, profile edits, segmentations, and merge operations
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-slate-500">Category:</span>
              <select
                value={historyCategoryFilter}
                onChange={(e) => setHistoryCategoryFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
              >
                <option value="all">All Categories ({history.length})</option>
                <option value="profile">Profile Updates</option>
                <option value="segmentation">Segmentation & Temperature</option>
                <option value="career">Career Affiliations</option>
                <option value="entity_resolution">Entity Resolution Merges</option>
                <option value="pipeline">Pipeline & Deals</option>
                <option value="bulk_ops">Bulk Operations</option>
              </select>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-2">
              <p className="text-sm">No audit history recorded yet for this person record.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 sm:ml-6 space-y-6 py-2">
              {history
                .filter((h) => {
                  if (historyCategoryFilter === 'all') return true;
                  return h.action?.category === historyCategoryFilter;
                })
                .map((h) => {
                  const dateStr = new Date(h.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div key={h.id} className="relative pl-6 sm:pl-8 group">
                      {/* Circle dot */}
                      <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-slate-600 group-hover:border-slate-900 transition shadow-sm flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{h.action?.icon || '📌'}</span>
                            <span className="font-bold text-slate-900 text-sm">
                              {h.action?.name || h.action_id}
                            </span>
                            {h.action?.category && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border">
                                {h.action.category}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 font-mono">{dateStr}</span>
                        </div>

                        {h.summary && (
                          <p className="text-xs text-slate-700 mt-2 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            {h.summary}
                          </p>
                        )}

                        {/* Structured Field Changes Diff */}
                        {h.changes && Object.keys(h.changes).length > 0 && (
                          <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1.5">
                            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              Field-Level Changes:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {Object.entries(h.changes).map(([field, diff]: [string, any]) => {
                                if (diff && typeof diff === 'object' && ('old' in diff || 'new' in diff)) {
                                  return (
                                    <div key={field} className="p-2 bg-slate-50/80 rounded border text-xs">
                                      <span className="font-semibold text-slate-700 font-mono">{field}:</span>{' '}
                                      <span className="text-red-600 line-through mr-1">
                                        {diff.old !== null && diff.old !== undefined ? String(diff.old) : 'null'}
                                      </span>{' '}
                                      <span className="text-emerald-700 font-medium">
                                        → {diff.new !== null && diff.new !== undefined ? String(diff.new) : 'null'}
                                      </span>
                                    </div>
                                  );
                                }
                                return (
                                  <div key={field} className="p-2 bg-slate-50/80 rounded border text-xs font-mono">
                                    <span className="font-semibold text-slate-700">{field}:</span>{' '}
                                    <span className="text-slate-800">{JSON.stringify(diff)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Contact & Intelligence Details */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Direct Contact Info */}
          <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b pb-2">Contact Channels</h3>
            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Primary Email</dt>
                <dd className="text-slate-800 font-medium mt-0.5">{person.primary_email || '—'}</dd>
              </div>

              {person.secondary_emails?.length > 0 && (
                <div>
                  <dt className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Secondary Emails</dt>
                  <dd className="text-slate-700 font-mono text-xs mt-0.5">
                    {person.secondary_emails.join(', ')}
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Primary Phone</dt>
                <dd className="text-slate-800 font-mono mt-0.5">{person.primary_phone || '—'}</dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500 font-semibold uppercase tracking-wider">LinkedIn Profile</dt>
                <dd className="mt-0.5">
                  {person.linkedin_url ? (
                    <a
                      href={person.linkedin_url.startsWith('http') ? person.linkedin_url : `https://${person.linkedin_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline text-xs break-all"
                    >
                      {person.linkedin_url}
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Location</dt>
                <dd className="text-slate-800 mt-0.5">
                  {[person.city, person.country].filter(Boolean).join(', ') || '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Intelligence & Segmentation Metadata */}
          <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b pb-2">Intelligence & Attributes</h3>
            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Assigned Segment</dt>
                <dd className="mt-1">
                  <span className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${segmentInfo.bg}`}>
                    {segmentInfo.label}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">{segmentInfo.desc}</p>
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Engagement Temperature</dt>
                <dd className="mt-1">
                  {tempInfo ? (
                    <span className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${tempInfo.bg} ${tempInfo.text}`}>
                      {tempInfo.icon} {tempInfo.label}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">Not evaluated</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Raw Attributes</dt>
                <dd className="mt-1">
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto max-h-44">
                    {JSON.stringify(person.attributes || {}, null, 2)}
                  </pre>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Modal: Link Employment / Company */}
      {showLinkCompany && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Link Employment / Role</h3>
              <button onClick={() => setShowLinkCompany(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleLinkCompany} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company *</label>
                <select
                  value={linkForm.company_id}
                  onChange={(e) => setLinkForm({ ...linkForm, company_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.domain ? `(${c.domain})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title / Role *</label>
                <input
                  required
                  placeholder="e.g. VP of Data Engineering, Founder, CTO"
                  value={linkForm.title}
                  onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_curr"
                  checked={linkForm.is_current}
                  onChange={(e) => setLinkForm({ ...linkForm, is_current: e.target.checked })}
                  className="rounded border-slate-300 h-4 w-4"
                />
                <label htmlFor="is_curr" className="text-xs font-medium text-slate-700">
                  This is the current active role
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={linkForm.started_at}
                    onChange={(e) => setLinkForm({ ...linkForm, started_at: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    disabled={linkForm.is_current}
                    value={linkForm.ended_at}
                    onChange={(e) => setLinkForm({ ...linkForm, ended_at: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowLinkCompany(false)}
                  className="px-4 py-2 border rounded-lg text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                >
                  Save Relationship
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Quick Note */}
      {showAddNote && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📝</span>
                <h3 className="text-lg font-bold text-slate-900">Add Note for {fullName}</h3>
              </div>
              <button
                onClick={() => setShowAddNote(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddNote} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Note Title (optional)
                </label>
                <input
                  placeholder="e.g. Sync follow-up, Project scope note, Preferred contact hours"
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Note Content *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Write your note or observations here..."
                  value={noteForm.summary}
                  onChange={(e) => setNoteForm({ ...noteForm, summary: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs resize-y"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddNote(false)}
                  className="px-4 py-2 border rounded-lg text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!noteForm.summary.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Activity */}
      {showLogActivity && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Log Interaction for {fullName}</h3>
              <button onClick={() => setShowLogActivity(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleLogActivity} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
                <input
                  required
                  placeholder="e.g. Discussed AI Strategy & Q4 Pipeline"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Activity Type</label>
                  <select
                    value={activityForm.type}
                    onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  >
                    <option value="linkedin_message">LinkedIn Message</option>
                    <option value="meeting">Meeting / Notion Notes</option>
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
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  >
                    <option value="linkedin">LinkedIn</option>
                    <option value="notion">Notion</option>
                    <option value="gmail">Gmail</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="manual">Manual Log</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Summary / Key Notes</label>
                <textarea
                  rows={4}
                  placeholder="Bullet points or summary of the conversation..."
                  value={activityForm.summary}
                  onChange={(e) => setActivityForm({ ...activityForm, summary: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowLogActivity(false)}
                  className="px-4 py-2 border rounded-lg text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Opportunity */}
      {showAddOpp && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Attach New Opportunity</h3>
              <button onClick={() => setShowAddOpp(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddOpportunity} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deal Title *</label>
                <input
                  required
                  placeholder="e.g. Cloud Data Mesh Architecture Project"
                  value={oppForm.title}
                  onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stage</label>
                  <select
                    value={oppForm.stage}
                    onChange={(e) => setOppForm({ ...oppForm, stage: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Value (€)</label>
                  <input
                    type="number"
                    placeholder="e.g. 75000"
                    value={oppForm.value}
                    onChange={(e) => setOppForm({ ...oppForm, value: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
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
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={oppForm.expected_close_date}
                    onChange={(e) => setOppForm({ ...oppForm, expected_close_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Deal scope, milestones, or requirements..."
                  value={oppForm.notes}
                  onChange={(e) => setOppForm({ ...oppForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddOpp(false)}
                  className="px-4 py-2 border rounded-lg text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                >
                  Create Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Lead */}
      {showAddLead && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Attach New Inbound Lead</h3>
              <button onClick={() => setShowAddLead(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddLead} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Title *</label>
                <input
                  required
                  placeholder="e.g. Inbound message via LinkedIn regarding hiring"
                  value={leadForm.title}
                  onChange={(e) => setLeadForm({ ...leadForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stage</label>
                  <select
                    value={leadForm.stage}
                    onChange={(e) => setLeadForm({ ...leadForm, stage: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Signal Strength</label>
                  <select
                    value={leadForm.signal_strength}
                    onChange={(e) => setLeadForm({ ...leadForm, signal_strength: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  >
                    <option value="strong">Strong 🔥</option>
                    <option value="medium">Medium ☀️</option>
                    <option value="weak">Weak ❄️</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Intent</label>
                <input
                  placeholder="e.g. Consulting Inquiry, Job Opportunity, Advisory"
                  value={leadForm.intent}
                  onChange={(e) => setLeadForm({ ...leadForm, intent: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Context, details or next steps..."
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddLead(false)}
                  className="px-4 py-2 border rounded-lg text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
