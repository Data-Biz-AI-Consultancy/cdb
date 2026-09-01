'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';
import { COMMON_CURRENCIES, formatMoney, getCurrencySymbol } from '@/lib/currency';
import SearchableCombobox, { ComboboxOption } from '@/components/SearchableCombobox';
import { EngagementItem, EngagementAISummaryItem } from '../page';

interface ActivityItem {
  id: string;
  type: string;
  source: string;
  source_id?: string | null;
  occurred_at: string;
  title?: string | null;
  summary?: string | null;
  raw_content?: string | null;
  person_id?: string | null;
  company_id?: string | null;
  engagement_id?: string | null;
  person?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    primary_email?: string | null;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
}

interface PersonOption {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email?: string | null;
}

export default function EngagementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>('');

  const [engagement, setEngagement] = useState<EngagementItem | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [allPersons, setAllPersons] = useState<PersonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<EngagementAISummaryItem | null>(null);
  const [refreshingAi, setRefreshingAi] = useState(false);

  // Timeline UI State
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'meetings' | 'comms' | 'linkedin' | 'notes'>('all');
  const [timelineSearch, setTimelineSearch] = useState('');
  const [expandedActivityIds, setExpandedActivityIds] = useState<Set<string>>(new Set());

  // Link Existing Activity Modal State
  const [showLinkActivityModal, setShowLinkActivityModal] = useState(false);
  const [unlinkedActivities, setUnlinkedActivities] = useState<ActivityItem[]>([]);
  const [loadingUnlinked, setLoadingUnlinked] = useState(false);
  const [selectedUnlinkedIds, setSelectedUnlinkedIds] = useState<Set<string>>(new Set());
  const [unlinkedSearch, setUnlinkedSearch] = useState('');
  const [unlinkedTypeFilter, setUnlinkedTypeFilter] = useState<'all' | 'linkedin' | 'calls' | 'emails' | 'meetings'>('all');
  const [linkingInProgress, setLinkingInProgress] = useState(false);

  useEffect(() => {
    if (params && typeof (params as any).then === 'function') {
      (params as Promise<{ id: string }>).then((p) => {
        if (p?.id) setId(p.id);
      });
    } else if (params && (params as any).id) {
      setId((params as any).id);
    }
  }, [params]);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAttachContactModal, setShowAttachContactModal] = useState(false);
  const [showLogActivityModal, setShowLogActivityModal] = useState(false);

  // Form State for editing
  const [editTitle, setEditTitle] = useState('');
  const [editStatus, setEditStatus] = useState<any>('active');
  const [editType, setEditType] = useState('consultancy');
  const [editCurrency, setEditCurrency] = useState('EUR');
  const [editRateType, setEditRateType] = useState('daily');
  const [editRateValue, setEditRateValue] = useState('');
  const [editTotalValue, setEditTotalValue] = useState('');
  const [editContractRef, setEditContractRef] = useState('');
  const [editContractStatus, setEditContractStatus] = useState('signed');
  const [editSignedAt, setEditSignedAt] = useState('');
  const [editTerms, setEditTerms] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editExpectedEndDate, setEditExpectedEndDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Attach contact state
  const [attachPersonId, setAttachPersonId] = useState('');
  const [attachRole, setAttachRole] = useState('client_lead');

  // Log activity state
  const [actTitle, setActTitle] = useState('');
  const [actType, setActType] = useState('meeting');
  const [actSource, setActSource] = useState('notion');
  const [actPersonId, setActPersonId] = useState('');
  const [actSummary, setActSummary] = useState('');
  const [actRawContent, setActRawContent] = useState('');
  const [actOccurredAt, setActOccurredAt] = useState(new Date().toISOString().slice(0, 16));

  async function loadData(targetId: string) {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const [engRes, actRes, persRes] = await Promise.allSettled([
        apiFetch<EngagementItem>(`/api/v1/engagements/${targetId}`),
        apiFetch<ActivityItem[]>(`/api/v1/engagements/${targetId}/activities`),
        apiFetch<ApiResponse<PersonOption[]>>('/api/v1/persons?limit=100'),
      ]);

      if (engRes.status === 'fulfilled' && engRes.value) {
        const eng = engRes.value;
        setEngagement(eng);
        setAiSummary(eng.ai_summary || null);

        // Populate edit form
        setEditTitle(eng.title);
        setEditStatus(eng.status);
        setEditType(eng.engagement_type);
        setEditCurrency(eng.currency || 'EUR');
        setEditRateType(eng.rate_type);
        setEditRateValue(eng.rate_value !== null && eng.rate_value !== undefined ? String(eng.rate_value) : '');
        setEditTotalValue(eng.total_value !== null && eng.total_value !== undefined ? String(eng.total_value) : '');
        setEditContractRef(eng.contract_ref || '');
        setEditContractStatus(eng.contract_status || 'signed');
        setEditSignedAt(eng.signed_at || '');
        setEditTerms(eng.terms_and_conditions || '');
        setEditStartDate(eng.start_date || '');
        setEditExpectedEndDate(eng.expected_end_date || '');
        setEditNotes(eng.notes || '');
      } else {
        setError('Engagement not found or failed to load.');
      }

      if (actRes.status === 'fulfilled' && actRes.value) {
        setActivities(actRes.value);
      }
      if (persRes.status === 'fulfilled' && persRes.value?.data) {
        setAllPersons(persRes.value.data);
      }
    } catch (err: any) {
      console.error('Error loading engagement detail:', err);
      setError('Failed to load engagement details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const handleRefreshAiSummary = async () => {
    if (!id || refreshingAi) return;
    setRefreshingAi(true);
    try {
      const res = await apiFetch<EngagementAISummaryItem>(`/api/v1/engagements/${id}/ai-summary/refresh`, {
        method: 'POST',
      });
      if (res) {
        setAiSummary(res);
        setSuccessMessage('AI Summary intelligence updated from latest activities.');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to refresh AI summary.');
    } finally {
      setRefreshingAi(false);
    }
  };

  const handleSearchPersons = async (query: string): Promise<ComboboxOption[]> => {
    try {
      const res = await apiFetch<ApiResponse<PersonOption[]>>(
        `/api/v1/persons?q=${encodeURIComponent(query)}&limit=50&sort=first_name&order=asc`
      );
      return (res.data || []).map((p) => {
        const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.primary_email || p.id;
        return {
          id: p.id,
          label: name,
          subtext: p.primary_email || undefined,
        };
      });
    } catch {
      return [];
    }
  };

  const personComboboxOptions: ComboboxOption[] = useMemo(() => {
    return allPersons.map((p) => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.primary_email || p.id;
      return {
        id: p.id,
        label: name,
        subtext: p.primary_email || undefined,
      };
    });
  }, [allPersons]);

  const handleOpenLinkModal = async () => {
    setShowLinkActivityModal(true);
    setSelectedUnlinkedIds(new Set());
    setUnlinkedSearch('');
    setLoadingUnlinked(true);
    try {
      // Query activities for the client company or general activities to link
      const res = await apiFetch<ApiResponse<ActivityItem[]>>('/api/v1/activities?limit=100');
      if (res?.data) {
        // Filter out activities that are already linked to this engagement
        const existingIds = new Set(activities.map((a) => a.id));
        const candidates = res.data.filter((a) => !existingIds.has(a.id) && a.engagement_id !== id);
        setUnlinkedActivities(candidates);
      }
    } catch (err: any) {
      console.error('Error fetching unlinked activities:', err);
    } finally {
      setLoadingUnlinked(false);
    }
  };

  const handleToggleSelectUnlinked = (actId: string) => {
    setSelectedUnlinkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(actId)) {
        next.delete(actId);
      } else {
        next.add(actId);
      }
      return next;
    });
  };

  const handleSelectAllUnlinked = () => {
    if (selectedUnlinkedIds.size === filteredUnlinkedActivities.length) {
      setSelectedUnlinkedIds(new Set());
    } else {
      setSelectedUnlinkedIds(new Set(filteredUnlinkedActivities.map((a) => a.id)));
    }
  };

  const handleLinkSelectedActivities = async () => {
    if (selectedUnlinkedIds.size === 0 || !id) return;
    setLinkingInProgress(true);
    try {
      const linked = await apiFetch<ActivityItem[]>(`/api/v1/engagements/${id}/activities/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_ids: Array.from(selectedUnlinkedIds) }),
      });

      if (linked) {
        // Add newly linked activities to current activities list
        setActivities((prev) => {
          const currentIds = new Set(prev.map((a) => a.id));
          const toAdd = linked.filter((a) => !currentIds.has(a.id));
          return [...toAdd, ...prev];
        });

        setShowLinkActivityModal(false);
        setSuccessMessage(`Successfully linked ${selectedUnlinkedIds.size} activity/conversation(s) to this engagement.`);
        setTimeout(() => setSuccessMessage(null), 3500);

        // Auto-refresh AI summary
        apiFetch<EngagementAISummaryItem>(`/api/v1/engagements/${id}/ai-summary/refresh`, { method: 'POST' })
          .then((res) => { if (res) setAiSummary(res); })
          .catch(() => {});
      }
    } catch (err: any) {
      alert(err.message || 'Failed to link activities.');
    } finally {
      setLinkingInProgress(false);
    }
  };

  const handleUnlinkActivity = async (actId: string) => {
    if (!id || !confirm('Are you sure you want to unlink this conversation from this engagement?')) return;
    try {
      await apiFetch(`/api/v1/engagements/${id}/activities/${actId}/link`, {
        method: 'DELETE',
      });

      setActivities((prev) => prev.filter((a) => a.id !== actId));
      setSuccessMessage('Activity unlinked from engagement.');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Auto-refresh AI summary
      apiFetch<EngagementAISummaryItem>(`/api/v1/engagements/${id}/ai-summary/refresh`, { method: 'POST' })
        .then((res) => { if (res) setAiSummary(res); })
        .catch(() => {});
    } catch (err: any) {
      alert(err.message || 'Failed to unlink activity.');
    }
  };

  const handleUpdateEngagement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !id) return;

    try {
      const payload = {
        title: editTitle.trim(),
        status: editStatus,
        engagement_type: editType,
        currency: editCurrency,
        rate_type: editRateType,
        rate_value: editRateValue ? parseFloat(editRateValue) : null,
        total_value: editTotalValue ? parseFloat(editTotalValue) : null,
        contract_ref: editContractRef.trim() || null,
        contract_status: editContractStatus,
        signed_at: editSignedAt || null,
        terms_and_conditions: editTerms.trim() || null,
        start_date: editStartDate || null,
        expected_end_date: editExpectedEndDate || null,
        notes: editNotes.trim() || null,
      };

      const updated = await apiFetch<EngagementItem>(`/api/v1/engagements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (updated) {
        setEngagement(updated);
        if (updated.ai_summary) setAiSummary(updated.ai_summary);
        setShowEditModal(false);
        setSuccessMessage('Engagement updated successfully.');
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update engagement.');
    }
  };

  const handleAttachContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachPersonId || !id) return;

    try {
      const updated = await apiFetch<EngagementItem>(`/api/v1/engagements/${id}/persons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: attachPersonId, role: attachRole }),
      });

      if (updated) {
        setEngagement(updated);
        if (updated.ai_summary) setAiSummary(updated.ai_summary);
        setShowAttachContactModal(false);
        setAttachPersonId('');
        setSuccessMessage('Contact person attached.');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to attach contact.');
    }
  };

  const handleDetachContact = async (personId: string) => {
    if (!id || !confirm('Are you sure you want to detach this contact person?')) return;
    try {
      const updated = await apiFetch<EngagementItem>(`/api/v1/engagements/${id}/persons/${personId}`, {
        method: 'DELETE',
      });
      if (updated) {
        setEngagement(updated);
        if (updated.ai_summary) setAiSummary(updated.ai_summary);
        setSuccessMessage('Contact detached.');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to detach contact.');
    }
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim() || !id) return;

    try {
      const payload = {
        title: actTitle.trim(),
        type: actType,
        source: actSource,
        person_id: actPersonId || null,
        summary: actSummary.trim() || null,
        raw_content: actRawContent.trim() || null,
        occurred_at: actOccurredAt ? new Date(actOccurredAt).toISOString() : new Date().toISOString(),
      };

      const newAct = await apiFetch<ActivityItem>(`/api/v1/engagements/${id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (newAct) {
        setActivities((prev) => [newAct, ...prev]);
        setShowLogActivityModal(false);
        setActTitle('');
        setActSummary('');
        setActRawContent('');
        setActPersonId('');
        setSuccessMessage('Activity / meeting note recorded.');
        setTimeout(() => setSuccessMessage(null), 3000);

        // Auto-refresh AI summary in background
        apiFetch<EngagementAISummaryItem>(`/api/v1/engagements/${id}/ai-summary/refresh`, { method: 'POST' })
          .then((res) => { if (res) setAiSummary(res); })
          .catch(() => {});
      }
    } catch (err: any) {
      alert(err.message || 'Failed to log activity.');
    }
  };

  const toggleExpandActivity = (actId: string) => {
    setExpandedActivityIds((prev) => {
      const next = new Set(prev);
      if (next.has(actId)) {
        next.delete(actId);
      } else {
        next.add(actId);
      }
      return next;
    });
  };

  // Filtered timeline activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // Type Filter
      if (timelineFilter === 'meetings') {
        const isMeeting = act.type === 'meeting' || act.type === 'notion_meeting_note' || act.source === 'notion';
        if (!isMeeting) return false;
      } else if (timelineFilter === 'linkedin') {
        const isLinkedIn = act.source === 'linkedin' || act.type === 'linkedin_message' || act.type === 'linkedin';
        if (!isLinkedIn) return false;
      } else if (timelineFilter === 'comms') {
        const isComm = ['call', 'email', 'message', 'whatsapp', 'linkedin', 'linkedin_message'].includes(act.type);
        if (!isComm) return false;
      } else if (timelineFilter === 'notes') {
        const isNote = ['note', 'task', 'status_change', 'milestone'].includes(act.type);
        if (!isNote) return false;
      }

      // Search Query
      if (timelineSearch.trim()) {
        const q = timelineSearch.toLowerCase();
        const matchTitle = act.title?.toLowerCase().includes(q);
        const matchSummary = act.summary?.toLowerCase().includes(q);
        const matchContent = act.raw_content?.toLowerCase().includes(q);
        const matchSource = act.source?.toLowerCase().includes(q);
        if (!matchTitle && !matchSummary && !matchContent && !matchSource) return false;
      }

      return true;
    });
  }, [activities, timelineFilter, timelineSearch]);

  const activityCounts = useMemo(() => {
    const total = activities.length;
    const meetings = activities.filter((a) => a.type === 'meeting' || a.type === 'notion_meeting_note' || a.source === 'notion').length;
    const linkedin = activities.filter((a) => a.source === 'linkedin' || a.type === 'linkedin_message' || a.type === 'linkedin').length;
    const comms = activities.filter((a) => ['call', 'email', 'message', 'whatsapp', 'linkedin', 'linkedin_message'].includes(a.type)).length;
    const notes = activities.filter((a) => ['note', 'task', 'status_change', 'milestone'].includes(a.type)).length;
    return { total, meetings, linkedin, comms, notes };
  }, [activities]);

  // Filtered candidates for link modal
  const filteredUnlinkedActivities = useMemo(() => {
    return unlinkedActivities.filter((act) => {
      if (unlinkedTypeFilter === 'linkedin') {
        if (act.source !== 'linkedin' && act.type !== 'linkedin_message' && act.type !== 'linkedin') return false;
      } else if (unlinkedTypeFilter === 'calls') {
        if (act.type !== 'call') return false;
      } else if (unlinkedTypeFilter === 'emails') {
        if (act.type !== 'email') return false;
      } else if (unlinkedTypeFilter === 'meetings') {
        if (act.type !== 'meeting' && act.source !== 'notion') return false;
      }

      if (unlinkedSearch.trim()) {
        const q = unlinkedSearch.toLowerCase();
        const matchTitle = act.title?.toLowerCase().includes(q);
        const matchSummary = act.summary?.toLowerCase().includes(q);
        const matchContent = act.raw_content?.toLowerCase().includes(q);
        const matchPerson = act.person ? `${act.person.first_name} ${act.person.last_name} ${act.person.primary_email}`.toLowerCase().includes(q) : false;
        const matchCompany = act.company?.name.toLowerCase().includes(q);
        if (!matchTitle && !matchSummary && !matchContent && !matchPerson && !matchCompany) return false;
      }

      return true;
    });
  }, [unlinkedActivities, unlinkedTypeFilter, unlinkedSearch]);

  if (loading) {
    return (
      <div className="text-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-200">
        Loading engagement workspace...
      </div>
    );
  }

  if (error || !engagement) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-rose-200 p-6 space-y-3">
        <p className="text-rose-600 font-bold">{error || 'Engagement not found'}</p>
        <Link href="/engagements" className="text-sm font-semibold text-blue-600 hover:underline">
          ← Back to Engagements
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm">
          <span>✓ {successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">✕</button>
        </div>
      )}

      {/* Breadcrumb & Top Bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-500">
          <Link href="/engagements" className="hover:text-slate-800 font-medium">
            Client Engagements
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-bold truncate max-w-sm">{engagement.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenLinkModal}
            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <span>🔗</span> Link LinkedIn / Conversation
          </button>
          <button
            onClick={() => setShowLogActivityModal(true)}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <span>📝</span> Log Activity / Note
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <span>✏️</span> Edit
          </button>
        </div>
      </div>

      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold capitalize ${
                  engagement.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : engagement.status === 'in_delivery'
                    ? 'bg-blue-100 text-blue-800'
                    : engagement.status === 'planning'
                    ? 'bg-amber-100 text-amber-800'
                    : engagement.status === 'completed'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {engagement.status.replace('_', ' ')}
              </span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                {engagement.engagement_type.replace('_', ' ')}
              </span>
              {engagement.is_overdue && (
                <span className="text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                  ⚠️ Overdue Deadline
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">{engagement.title}</h1>

            <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
              <span>Client Organization:</span>
              {engagement.company ? (
                <Link
                  href={`/companies/${engagement.company_id}`}
                  className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                >
                  <span>🏢</span> {engagement.company.name}
                </Link>
              ) : (
                <span className="font-semibold text-slate-800">Client Org</span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">Total Contract</span>
              <span className="text-xl font-black text-slate-900">
                {engagement.total_value
                  ? formatMoney(engagement.total_value, engagement.currency)
                  : formatMoney(engagement.rate_value, engagement.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-1">Billing Rate</span>
            <span className="text-sm font-bold text-slate-900">
              {engagement.rate_value ? (
                <>
                  {formatMoney(engagement.rate_value, engagement.currency)}{' '}
                  <span className="text-xs font-normal text-slate-500">/{engagement.rate_type}</span>
                </>
              ) : (
                'Not set'
              )}
            </span>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-1">Contract Budget Cap</span>
            <span className="text-sm font-bold text-slate-900">
              {engagement.total_value
                ? formatMoney(engagement.total_value, engagement.currency, { includeCode: true })
                : 'Open / Uncapped'}
            </span>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-1">Delivery Timeline</span>
            <span className="text-sm font-bold text-slate-900">
              {engagement.start_date || 'Start'} → {engagement.expected_end_date || 'Ongoing'}
            </span>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-1">Timeline Health</span>
            <span className="text-sm font-bold text-slate-900">
              {engagement.days_remaining !== null && engagement.days_remaining !== undefined
                ? engagement.days_remaining >= 0
                  ? `${engagement.days_remaining} days left`
                  : `${Math.abs(engagement.days_remaining)} days overdue`
                : 'Open-ended'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Engagement Intelligence Briefing */}
      {aiSummary && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 pb-4 border-b border-indigo-500/20">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 text-lg border border-indigo-400/30">
                ✨
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-wide">
                    AI Engagement Intelligence Briefing
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-300 font-semibold border border-indigo-400/30">
                    Live Synthesis
                  </span>
                </div>
                <p className="text-xs text-indigo-200/70">
                  Synthesized from {aiSummary.activity_count_analyzed} recorded meetings, LinkedIn conversations & touchpoints.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Sentiment Indicator */}
              <div
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                  aiSummary.client_sentiment === 'very_positive' || aiSummary.client_sentiment === 'positive'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : aiSummary.client_sentiment === 'needs_attention' || aiSummary.client_sentiment === 'at_risk'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-700/50 text-slate-300 border-slate-600'
                }`}
              >
                <span>
                  {aiSummary.client_sentiment === 'very_positive' || aiSummary.client_sentiment === 'positive'
                    ? '🟢'
                    : aiSummary.client_sentiment === 'needs_attention' || aiSummary.client_sentiment === 'at_risk'
                    ? '🔴'
                    : '⚪'}
                </span>
                <span className="capitalize">{aiSummary.client_sentiment.replace('_', ' ')} Health</span>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefreshAiSummary}
                disabled={refreshingAi}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 border border-white/10"
              >
                <span className={refreshingAi ? 'animate-spin inline-block' : ''}>⚡</span>
                {refreshingAi ? 'Analyzing...' : 'Refresh AI'}
              </button>
            </div>
          </div>

          {/* Executive Summary Callout */}
          <div className="mt-4 relative z-10 bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-indigo-100 leading-relaxed">
            <span className="font-bold text-indigo-300 block mb-1 uppercase tracking-wider text-[10px]">
              Executive Overview
            </span>
            {aiSummary.executive_summary}
          </div>

          {/* 3-Column Intelligence Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 relative z-10 text-xs">
            {/* Highlights */}
            <div className="p-4 bg-indigo-950/40 rounded-xl border border-indigo-500/20 space-y-2">
              <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <span>🎯</span> Key Highlights & Wins
              </span>
              <ul className="space-y-1.5 text-indigo-100/90 list-disc list-inside">
                {aiSummary.key_highlights.map((h, i) => (
                  <li key={i} className="leading-snug">{h}</li>
                ))}
              </ul>
            </div>

            {/* Blockers & Risks */}
            <div className="p-4 bg-indigo-950/40 rounded-xl border border-indigo-500/20 space-y-2">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <span>⚠️</span> Delivery Risks & Dependencies
              </span>
              <ul className="space-y-1.5 text-indigo-100/90 list-disc list-inside">
                {aiSummary.blockers_and_risks.map((b, i) => (
                  <li key={i} className="leading-snug">{b}</li>
                ))}
              </ul>
            </div>

            {/* Action Items */}
            <div className="p-4 bg-indigo-950/40 rounded-xl border border-indigo-500/20 space-y-2">
              <span className="font-bold text-sky-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <span>📋</span> Prioritized Action Items
              </span>
              <div className="space-y-2">
                {aiSummary.action_items.map((act, i) => (
                  <div key={i} className="p-2 rounded-lg bg-white/5 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span
                        className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                          act.priority === 'high'
                            ? 'bg-rose-500/30 text-rose-300'
                            : act.priority === 'medium'
                            ? 'bg-amber-500/30 text-amber-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {act.priority}
                      </span>
                      {act.suggested_role && (
                        <span className="text-indigo-300/80 truncate">{act.suggested_role}</span>
                      )}
                    </div>
                    <p className="text-white font-medium text-[11px] leading-snug">{act.task}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left column for Contract & Contacts, Right column for Activities & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Contract & Terms Hub */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📜</span> Contract & Legal Terms
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold capitalize">
                ✓ {engagement.contract_status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block mb-1">Contract Ref / Link</span>
                <span className="font-mono font-bold text-slate-900 break-all">
                  {engagement.contract_ref || 'No doc link specified'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block mb-1">Signed Date</span>
                <span className="font-semibold text-slate-900">
                  {engagement.signed_at || 'Not recorded'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Terms & Conditions (T&C)
              </span>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                {engagement.terms_and_conditions || 'No specific terms & conditions logged.'}
              </div>
            </div>

            {engagement.notes && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Internal Notes & Deliverables
                </span>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap">
                  {engagement.notes}
                </div>
              </div>
            )}
          </div>

          {/* Connected Contacts */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>👥</span> Connected Contact Person(s)
                </h2>
                <p className="text-xs text-slate-500">Key stakeholders, sponsors, and delivery leads.</p>
              </div>
              <button
                onClick={() => setShowAttachContactModal(true)}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition"
              >
                + Attach Contact
              </button>
            </div>

            {(!engagement.persons || engagement.persons.length === 0) ? (
              <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No contact persons attached to this engagement yet.
              </div>
            ) : (
              <div className="space-y-2">
                {engagement.persons.map((p) => (
                  <div
                    key={p.person_id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <Link
                        href={`/persons/${p.person_id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 transition block truncate"
                      >
                        👤 {p.person_name || 'Contact'}
                      </Link>
                      <span className="text-slate-500 block truncate">{p.person_email || 'No email'}</span>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-semibold capitalize">
                        {p.role?.replace('_', ' ') || 'Contact'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDetachContact(p.person_id)}
                      title="Detach person"
                      className="text-slate-400 hover:text-rose-600 p-1 text-sm transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Chronological Timeline (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            {/* Timeline Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>🗓️</span> Engagement Activity Timeline
                </h2>
                <p className="text-xs text-slate-500">
                  Chronological history of Notion notes, LinkedIn messages, client syncs & delivery updates.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleOpenLinkModal}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 transition flex items-center gap-1"
                >
                  <span>🔗</span> Link LinkedIn / Comms
                </button>
                <button
                  onClick={() => setShowLogActivityModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1"
                >
                  <span>➕</span> Log Activity
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
                <button
                  onClick={() => setTimelineFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    timelineFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({activityCounts.total})
                </button>
                <button
                  onClick={() => setTimelineFilter('linkedin')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    timelineFilter === 'linkedin'
                      ? 'bg-white text-blue-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  💬 LinkedIn ({activityCounts.linkedin})
                </button>
                <button
                  onClick={() => setTimelineFilter('meetings')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    timelineFilter === 'meetings'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📝 Notion Notes ({activityCounts.meetings})
                </button>
                <button
                  onClick={() => setTimelineFilter('comms')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    timelineFilter === 'comms'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📞 Comms ({activityCounts.comms})
                </button>
                <button
                  onClick={() => setTimelineFilter('notes')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    timelineFilter === 'notes'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  💬 Notes ({activityCounts.notes})
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter timeline..."
                  value={timelineSearch}
                  onChange={(e) => setTimelineSearch(e.target.value)}
                  className="w-full sm:w-44 px-2.5 py-1 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {timelineSearch && (
                  <button
                    onClick={() => setTimelineSearch('')}
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-[10px]"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Timeline Stream */}
            {filteredActivities.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                <span className="text-2xl block">💬</span>
                <p className="font-semibold text-slate-600">No activities found matching filter criteria.</p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={handleOpenLinkModal}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 transition"
                  >
                    🔗 Link Existing LinkedIn Message / Activity
                  </button>
                  <button
                    onClick={() => setShowLogActivityModal(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                  >
                    ➕ Log New Note
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {filteredActivities.map((act) => {
                  const isExpanded = expandedActivityIds.has(act.id);
                  const isLinkedIn = act.source === 'linkedin' || act.type === 'linkedin_message' || act.type === 'linkedin';
                  const isNotion = act.source === 'notion' || act.type === 'notion_meeting_note';
                  const isCall = act.type === 'call';
                  const isEmail = act.type === 'email';
                  const isMeeting = act.type === 'meeting' || isNotion;

                  return (
                    <div key={act.id} className="relative group">
                      {/* Node Bullet Icon */}
                      <div
                        className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] z-10 shadow-sm ${
                          isLinkedIn
                            ? 'bg-sky-100 border-sky-500 text-sky-700'
                            : isNotion || isMeeting
                            ? 'bg-purple-100 border-purple-500 text-purple-700'
                            : isCall
                            ? 'bg-blue-100 border-blue-500 text-blue-700'
                            : isEmail
                            ? 'bg-amber-100 border-amber-500 text-amber-700'
                            : 'bg-emerald-100 border-emerald-500 text-emerald-700'
                        }`}
                      >
                        {isLinkedIn ? '💬' : isNotion ? '📝' : isCall ? '📞' : isEmail ? '✉️' : '💬'}
                      </div>

                      {/* Card Content */}
                      <div className="bg-slate-50 hover:bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 text-xs space-y-2 transition shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">
                              {act.title || 'Untitled Activity'}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                                isLinkedIn
                                  ? 'bg-sky-100 text-sky-800'
                                  : isNotion
                                  ? 'bg-purple-100 text-purple-800'
                                  : isCall
                                  ? 'bg-blue-100 text-blue-800'
                                  : isEmail
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              {act.source}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-slate-400 font-medium">
                              {new Date(act.occurred_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <button
                              onClick={() => handleUnlinkActivity(act.id)}
                              title="Unlink from this engagement"
                              className="text-slate-400 hover:text-rose-600 text-[11px] p-1 transition opacity-0 group-hover:opacity-100"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Summary */}
                        {act.summary && (
                          <p className="text-slate-700 leading-relaxed font-sans">
                            {act.summary}
                          </p>
                        )}

                        {/* Raw Content Collapsible */}
                        {act.raw_content && (
                          <div className="pt-1">
                            <button
                              onClick={() => toggleExpandActivity(act.id)}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <span>{isExpanded ? '▾ Hide details / transcript' : '▸ View details / conversation thread'}</span>
                            </button>

                            {isExpanded && (
                              <div className="mt-2 p-3 bg-white rounded-lg border border-slate-200 text-slate-800 whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-60 overflow-y-auto">
                                {act.raw_content}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Link Existing Conversation / Activity Modal */}
      {showLinkActivityModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8 text-sm">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>🔗</span> Link Activity / LinkedIn Conversation
                </h2>
                <p className="text-xs text-slate-500">
                  Select existing LinkedIn messages, calls, or notes to attach to this engagement timeline.
                </p>
              </div>
              <button onClick={() => setShowLinkActivityModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
                <button
                  type="button"
                  onClick={() => setUnlinkedTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    unlinkedTypeFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({unlinkedActivities.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUnlinkedTypeFilter('linkedin')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    unlinkedTypeFilter === 'linkedin'
                      ? 'bg-white text-sky-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  💬 LinkedIn
                </button>
                <button
                  type="button"
                  onClick={() => setUnlinkedTypeFilter('calls')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    unlinkedTypeFilter === 'calls'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📞 Calls
                </button>
                <button
                  type="button"
                  onClick={() => setUnlinkedTypeFilter('emails')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    unlinkedTypeFilter === 'emails'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✉️ Emails
                </button>
                <button
                  type="button"
                  onClick={() => setUnlinkedTypeFilter('meetings')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    unlinkedTypeFilter === 'meetings'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📝 Notion
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search available activities..."
                  value={unlinkedSearch}
                  onChange={(e) => setUnlinkedSearch(e.target.value)}
                  className="w-full sm:w-56 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {unlinkedSearch && (
                  <button
                    type="button"
                    onClick={() => setUnlinkedSearch('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-[10px]"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* List Selection Area */}
            {loadingUnlinked ? (
              <div className="text-center py-12 text-slate-400 text-xs">Loading unlinked activities...</div>
            ) : filteredUnlinkedActivities.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
                <p className="font-semibold text-slate-600">No unlinked activities found matching criteria.</p>
                <p>All recorded conversations may already be attached to an engagement.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>
                    Showing {filteredUnlinkedActivities.length} available activity/conversations
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllUnlinked}
                    className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                  >
                    {selectedUnlinkedIds.size === filteredUnlinkedActivities.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {filteredUnlinkedActivities.map((act) => {
                  const isChecked = selectedUnlinkedIds.has(act.id);
                  const isLinkedIn = act.source === 'linkedin' || act.type === 'linkedin_message' || act.type === 'linkedin';

                  return (
                    <label
                      key={act.id}
                      onClick={() => handleToggleSelectUnlinked(act.id)}
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition text-xs ${
                        isChecked
                          ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                          : 'bg-slate-50/60 hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                      />

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 truncate">
                              {act.title || 'Untitled Activity'}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                isLinkedIn
                                  ? 'bg-sky-100 text-sky-800'
                                  : act.source === 'notion'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              {act.source}
                            </span>
                          </div>

                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(act.occurred_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        {act.summary && (
                          <p className="text-slate-600 line-clamp-2 leading-relaxed font-sans">
                            {act.summary}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="font-semibold text-slate-600">
                {selectedUnlinkedIds.size} selected
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkActivityModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedUnlinkedIds.size === 0 || linkingInProgress}
                  onClick={handleLinkSelectedActivities}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm disabled:opacity-50 transition"
                >
                  {linkingInProgress ? 'Linking...' : `Link ${selectedUnlinkedIds.size > 0 ? `(${selectedUnlinkedIds.size})` : ''} to Engagement`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8 text-sm">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Edit Client Engagement</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleUpdateEngagement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e: any) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="in_delivery">In Delivery</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                  >
                    <option value="consultancy">Consultancy</option>
                    <option value="retainer">Retainer</option>
                    <option value="fixed_fee">Fixed Fee</option>
                    <option value="time_and_materials">Time & Materials</option>
                    <option value="advisory">Advisory</option>
                    <option value="full_time">Full Time</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase">Rate & Currency</span>
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    className="px-2 py-1 border border-slate-300 rounded-lg bg-white text-xs font-semibold"
                  >
                    {COMMON_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Rate Type</label>
                    <select
                      value={editRateType}
                      onChange={(e: any) => setEditRateType(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    >
                      <option value="daily">Daily</option>
                      <option value="hourly">Hourly</option>
                      <option value="monthly">Monthly</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Rate ({getCurrencySymbol(editCurrency)})
                    </label>
                    <input
                      type="number"
                      value={editRateValue}
                      onChange={(e) => setEditRateValue(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Cap ({getCurrencySymbol(editCurrency)})
                    </label>
                    <input
                      type="number"
                      value={editTotalValue}
                      onChange={(e) => setEditTotalValue(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contract Ref</label>
                  <input
                    type="text"
                    value={editContractRef}
                    onChange={(e) => setEditContractRef(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contract Status</label>
                  <select
                    value={editContractStatus}
                    onChange={(e) => setEditContractStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                  >
                    <option value="signed">Signed</option>
                    <option value="pending_signature">Pending</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Signed Date</label>
                <input
                  type="date"
                  value={editSignedAt}
                  onChange={(e) => setEditSignedAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Terms & Conditions</label>
                <textarea
                  rows={3}
                  value={editTerms}
                  onChange={(e) => setEditTerms(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Expected End Date</label>
                  <input
                    type="date"
                    value={editExpectedEndDate}
                    onChange={(e) => setEditExpectedEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attach Contact Modal */}
      {showAttachContactModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Attach Contact Person</h2>
              <button onClick={() => setShowAttachContactModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAttachContact} className="space-y-4">
              <div>
                <SearchableCombobox
                  label="Contact Person"
                  required
                  placeholder="Search and select contact..."
                  searchPlaceholder="Type name or email..."
                  value={attachPersonId}
                  onChange={(id) => setAttachPersonId(id)}
                  onSearch={handleSearchPersons}
                  options={personComboboxOptions}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Role in Engagement</label>
                <select
                  value={attachRole}
                  onChange={(e) => setAttachRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                >
                  <option value="client_lead">Client Lead / Sponsor</option>
                  <option value="technical_contact">Technical Contact</option>
                  <option value="stakeholder">Stakeholder</option>
                  <option value="delivery_lead">Delivery Lead</option>
                  <option value="consultant">Consultant</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAttachContactModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                >
                  Attach Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Activity / Meeting Note Modal */}
      {showLogActivityModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8 text-sm">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Log Activity / Notion Meeting Note</h2>
                <p className="text-xs text-slate-500">Record a client sync, call summary, or meeting notes.</p>
              </div>
              <button onClick={() => setShowLogActivityModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleLogActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Sprint Progress & Architecture Review"
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Activity Type</label>
                  <select
                    value={actType}
                    onChange={(e) => setActType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                  >
                    <option value="meeting">Meeting / Sync</option>
                    <option value="call">Phone / Video Call</option>
                    <option value="email">Email</option>
                    <option value="note">Internal Note</option>
                    <option value="milestone">Milestone Deliverable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Source</label>
                  <select
                    value={actSource}
                    onChange={(e) => setActSource(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                  >
                    <option value="notion">Notion</option>
                    <option value="google_meet">Google Meet</option>
                    <option value="zoom">Zoom</option>
                    <option value="slack">Slack</option>
                    <option value="manual">Manual Entry</option>
                  </select>
                </div>
              </div>

              <div>
                <SearchableCombobox
                  label="Associated Contact Person (Optional)"
                  placeholder="Link to contact person..."
                  searchPlaceholder="Type name or email..."
                  value={actPersonId}
                  onChange={(id) => setActPersonId(id)}
                  onSearch={handleSearchPersons}
                  options={personComboboxOptions}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Occurred At</label>
                <input
                  type="datetime-local"
                  value={actOccurredAt}
                  onChange={(e) => setActOccurredAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Summary / Key Takeaways</label>
                <textarea
                  rows={2}
                  placeholder="Key decisions made, client feedback, or agreed action items..."
                  value={actSummary}
                  onChange={(e) => setActSummary(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Notes / Meeting Transcript (Optional)</label>
                <textarea
                  rows={4}
                  placeholder="Paste Notion markdown notes, discussion transcript, or detailed specs..."
                  value={actRawContent}
                  onChange={(e) => setActRawContent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLogActivityModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
