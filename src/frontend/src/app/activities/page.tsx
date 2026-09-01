'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';
import SearchableCombobox, { ComboboxOption } from '@/components/SearchableCombobox';

export interface ActivityPersonSummary {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email?: string | null;
  avatar_url?: string | null;
  linkedin_url?: string | null;
}

export interface ActivityCompanySummary {
  id: string;
  name: string;
  domain?: string | null;
  avatar_url?: string | null;
  industry?: string | null;
}

export interface Activity {
  id: string;
  person_id?: string | null;
  company_id?: string | null;
  person?: ActivityPersonSummary | null;
  company?: ActivityCompanySummary | null;
  type: 'meeting' | 'email' | 'linkedin_message' | 'whatsapp' | 'call' | 'note' | string;
  source: 'notion' | 'gmail' | 'linkedin' | 'whatsapp' | 'manual' | string;
  source_id?: string | null;
  occurred_at: string;
  title?: string | null;
  summary?: string | null;
  raw_content?: string | null;
  attributes?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ActivityStats {
  total: number;
  by_type: Record<string, number>;
  by_source: Record<string, number>;
}

interface PersonOption {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email?: string | null;
}

interface CompanyOption {
  id: string;
  name: string;
  domain?: string | null;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: string; bg: string; border: string; text: string; badge: string }
> = {
  meeting: {
    label: 'Meeting',
    icon: '🤝',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  linkedin_message: {
    label: 'LinkedIn',
    icon: '🔗',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-800',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  email: {
    label: 'Email',
    icon: '✉️',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-800',
    badge: 'bg-violet-100 text-violet-800 border-violet-200',
  },
  call: {
    label: 'Phone Call',
    icon: '📞',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-800',
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  note: {
    label: 'Note',
    icon: '📝',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: '💬',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-800',
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
  },
};

const SOURCE_BADGES: Record<string, { label: string; bg: string }> = {
  linkedin: { label: 'LinkedIn', bg: 'bg-sky-100 text-sky-800' },
  notion: { label: 'Notion', bg: 'bg-stone-100 text-stone-800' },
  gmail: { label: 'Gmail', bg: 'bg-red-100 text-red-800' },
  whatsapp: { label: 'WhatsApp', bg: 'bg-emerald-100 text-emerald-800' },
  manual: { label: 'Manual', bg: 'bg-slate-100 text-slate-700' },
};

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getDateBucket(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const actDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (actDate.getTime() === today.getTime()) return 'Today';
    if (actDate.getTime() === yesterday.getTime()) return 'Yesterday';
    if (actDate.getTime() >= sevenDaysAgo.getTime()) return 'This Week';
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return 'Earlier';
  }
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, 7d, 30d

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Available options for Combobox
  const [availablePersons, setAvailablePersons] = useState<PersonOption[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<CompanyOption[]>([]);

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [expandedContentIds, setExpandedContentIds] = useState<Record<string, boolean>>({});

  // Forms
  const [createForm, setCreateForm] = useState({
    title: '',
    type: 'meeting',
    summary: '',
    raw_content: '',
    source: 'manual',
    person_id: '',
    company_id: '',
    occurred_at: new Date().toISOString().slice(0, 16),
  });

  const [editForm, setEditForm] = useState({
    title: '',
    type: 'meeting',
    summary: '',
    raw_content: '',
    source: 'manual',
    occurred_at: '',
  });

  const [saving, setSaving] = useState(false);

  const loadStats = async () => {
    try {
      const res = await apiFetch<ApiResponse<ActivityStats>>('/api/v1/activities/stats');
      if (res && (res as any).data) {
        setStats((res as any).data);
      } else if (res && (res as any).total !== undefined) {
        setStats(res as any);
      }
    } catch {
      // Non-blocking background stats loading
    }
  };

  const loadPersonsAndCompanies = async () => {
    try {
      const [personsRes, compRes] = await Promise.allSettled([
        apiFetch<ApiResponse<PersonOption[]>>('/api/v1/persons?limit=100&sort=first_name&order=asc'),
        apiFetch<ApiResponse<CompanyOption[]>>('/api/v1/companies?limit=100&sort=name&order=asc'),
      ]);
      if (personsRes.status === 'fulfilled') {
        setAvailablePersons((personsRes.value as any).data || []);
      }
      if (compRes.status === 'fulfilled') {
        setAvailableCompanies((compRes.value as any).data || []);
      }
    } catch {
      // Non-critical background loading
    }
  };

  const loadActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('page_size', String(pageSize));

      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (typeFilter) params.append('type', typeFilter);
      if (sourceFilter) params.append('source', sourceFilter);

      if (dateFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        params.append('from', today.toISOString());
      } else if (dateFilter === '7d') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.append('from', d.toISOString());
      } else if (dateFilter === '30d') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.append('from', d.toISOString());
      }

      const res = await apiFetch<ApiResponse<Activity[]>>(`/api/v1/activities?${params.toString()}`);
      setActivities((res as any).data || []);
      if ((res as any).pagination?.total !== undefined) {
        setTotalCount((res as any).pagination.total);
      } else {
        setTotalCount(((res as any).data || []).length);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadPersonsAndCompanies();
  }, []);

  useEffect(() => {
    loadActivities();
  }, [page, pageSize, typeFilter, sourceFilter, dateFilter, searchQuery]);

  const handleSearchCompanies = async (query: string): Promise<ComboboxOption[]> => {
    try {
      const res = await apiFetch<ApiResponse<CompanyOption[]>>(
        `/api/v1/companies?q=${encodeURIComponent(query)}&limit=50&sort=name&order=asc`
      );
      return ((res as any).data || []).map((c: any) => ({
        id: c.id,
        label: c.name,
        subtext: c.domain || undefined,
      }));
    } catch {
      return [];
    }
  };

  const handleSearchPersons = async (query: string): Promise<ComboboxOption[]> => {
    try {
      const res = await apiFetch<ApiResponse<PersonOption[]>>(
        `/api/v1/persons?q=${encodeURIComponent(query)}&limit=50&sort=first_name&order=asc`
      );
      return ((res as any).data || []).map((p: any) => {
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

  const companyComboboxOptions: ComboboxOption[] = availableCompanies.map((c) => ({
    id: c.id,
    label: c.name,
    subtext: c.domain || undefined,
  }));

  const personComboboxOptions: ComboboxOption[] = availablePersons.map((p) => {
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.primary_email || p.id;
    return {
      id: p.id,
      label: name,
      subtext: p.primary_email || undefined,
    };
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.person_id && !createForm.company_id) {
      alert('Please associate at least one Person or Company with this activity.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: createForm.title.trim() || undefined,
        type: createForm.type,
        source: createForm.source,
        summary: createForm.summary.trim() || undefined,
        raw_content: createForm.raw_content.trim() || undefined,
        occurred_at: createForm.occurred_at ? new Date(createForm.occurred_at).toISOString() : undefined,
      };
      if (createForm.person_id) payload.person_id = createForm.person_id;
      if (createForm.company_id) payload.company_id = createForm.company_id;

      await apiFetch('/api/v1/activities', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowCreateModal(false);
      setCreateForm({
        title: '',
        type: 'meeting',
        summary: '',
        raw_content: '',
        source: 'manual',
        person_id: '',
        company_id: '',
        occurred_at: new Date().toISOString().slice(0, 16),
      });
      loadActivities();
      loadStats();
    } catch (err: any) {
      alert('Error creating activity: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (act: Activity) => {
    setEditingActivity(act);
    setEditForm({
      title: act.title || '',
      type: act.type,
      summary: act.summary || '',
      raw_content: act.raw_content || '',
      source: act.source,
      occurred_at: act.occurred_at ? new Date(act.occurred_at).toISOString().slice(0, 16) : '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;
    setSaving(true);
    try {
      const payload: any = {
        title: editForm.title.trim() || null,
        type: editForm.type,
        summary: editForm.summary.trim() || null,
        raw_content: editForm.raw_content.trim() || null,
        occurred_at: editForm.occurred_at ? new Date(editForm.occurred_at).toISOString() : undefined,
      };

      const updated = await apiFetch<Activity>(`/api/v1/activities/${editingActivity.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      if (selectedActivity?.id === updated.id) {
        setSelectedActivity(updated);
      }
      setEditingActivity(null);
      loadStats();
    } catch (err: any) {
      alert('Error updating activity: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (actId: string) => {
    if (!confirm('Are you sure you want to delete this activity log?')) return;
    try {
      await apiFetch(`/api/v1/activities/${actId}`, { method: 'DELETE' });
      setActivities((prev) => prev.filter((a) => a.id !== actId));
      if (selectedActivity?.id === actId) {
        setSelectedActivity(null);
      }
      loadStats();
    } catch (err: any) {
      alert('Error deleting activity: ' + err.message);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedContentIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Group activities chronologically
  const groupedActivities = useMemo(() => {
    const groups: { title: string; items: Activity[] }[] = [];
    activities.forEach((act) => {
      const bucket = getDateBucket(act.occurred_at || act.created_at);
      const existing = groups.find((g) => g.title === bucket);
      if (existing) {
        existing.items.push(act);
      } else {
        groups.push({ title: bucket, items: [act] });
      }
    });
    return groups;
  }, [activities]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <h1 className="text-2xl font-black tracking-tight text-white">Activities Feed</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Chronological Audit Trail
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            Omnichannel customer interactions: meetings, calls, LinkedIn threads, notes, and emails.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            data-testid="log-activity-button"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition duration-150"
          >
            <span>+</span>
            <span>Log Activity</span>
          </button>
        </div>
      </div>

      {/* Aggregated KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* 1. Total Activities */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total Activities</span>
            <span className="text-lg">📊</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2" data-testid="kpi-total-activities">
            {(stats?.total ?? totalCount).toLocaleString('en-US')}
          </div>
          <div className="text-xs text-slate-400 mt-1">All logged interactions</div>
        </div>

        {/* 2. LinkedIn Messages */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-indigo-600 tracking-wider">LinkedIn Msgs</span>
            <span className="text-lg">🔗</span>
          </div>
          <div className="text-2xl font-bold text-indigo-700 mt-2" data-testid="kpi-linkedin-messages">
            {(stats?.by_type?.linkedin_message ?? 0).toLocaleString('en-US')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Inbound & outbound msgs</div>
        </div>

        {/* 3. Emails (Upcoming) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-violet-600 tracking-wider">Emails</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200">
              Upcoming
            </span>
          </div>
          <div className="text-2xl font-bold text-violet-700 mt-2" data-testid="kpi-emails">
            {(stats?.by_type?.email ?? 0).toLocaleString('en-US')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Direct mail sync</div>
        </div>

        {/* 4. Meetings */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-emerald-600 tracking-wider">Meeting Notes</span>
            <span className="text-lg">🤝</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2" data-testid="kpi-meetings">
            {(stats?.by_type?.meeting ?? 0).toLocaleString('en-US')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Notion notes & debriefs</div>
        </div>

        {/* 5. Calls (To be updated) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-sky-600 tracking-wider">Phone Calls</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">
              To be updated
            </span>
          </div>
          <div className="text-2xl font-bold text-sky-700 mt-2" data-testid="kpi-calls">
            {(stats?.by_type?.call ?? 0).toLocaleString('en-US')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Calls & voicemails</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search activities, notes, contacts, companies..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setPage(1);
              }}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Type & Source Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Activity Type Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => {
                setTypeFilter('');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                typeFilter === '' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Types
            </button>
            {Object.entries(TYPE_CONFIG).map(([typeKey, cfg]) => (
              <button
                key={typeKey}
                onClick={() => {
                  setTypeFilter(typeFilter === typeKey ? '' : typeKey);
                  setPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  typeFilter === typeKey
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
              </button>
            ))}
          </div>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Sources</option>
            <option value="linkedin">LinkedIn</option>
            <option value="notion">Notion</option>
            <option value="gmail">Gmail</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="manual">Manual</option>
          </select>

          {/* Date Range Filter */}
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7d">Past 7 Days</option>
            <option value="30d">Past 30 Days</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Chronological Timeline Feed */}
      {loading ? (
        <div className="flex justify-center items-center py-20 bg-white rounded-xl border border-slate-200 text-slate-400">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-600 border-t-transparent mr-3" />
          <span>Loading activity timeline...</span>
        </div>
      ) : activities.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-4xl mb-3">📭</div>
          <h3 className="text-base font-bold text-slate-800">No activities found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {searchQuery || typeFilter || sourceFilter || dateFilter !== 'all'
              ? 'Try resetting your search filters or date range.'
              : 'Start logging interactions, meetings, and notes with your contacts.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
          >
            + Log First Activity
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedActivities.map((group) => (
            <div key={group.title} className="space-y-3">
              {/* Date Group Header */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  {group.title}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">{group.items.length} logged</span>
              </div>

              {/* Items in Date Bucket */}
              <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-4">
                {group.items.map((act) => {
                  const cfg = TYPE_CONFIG[act.type] || {
                    label: act.type,
                    icon: '📌',
                    bg: 'bg-slate-50',
                    border: 'border-slate-200',
                    text: 'text-slate-800',
                    badge: 'bg-slate-100 text-slate-800 border-slate-200',
                  };
                  const sourceCfg = SOURCE_BADGES[act.source] || { label: act.source, bg: 'bg-slate-100 text-slate-700' };
                  const isExpanded = !!expandedContentIds[act.id];
                  const hasRawContent = Boolean(act.raw_content && act.raw_content.trim() !== act.summary?.trim());

                  const personName = act.person
                    ? [act.person.first_name, act.person.last_name].filter(Boolean).join(' ') ||
                      act.person.primary_email ||
                      'Contact'
                    : null;

                  return (
                    <div
                      key={act.id}
                      data-testid={`activity-card-${act.id}`}
                      className="relative bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition duration-150 group"
                    >
                      {/* Timeline Node Icon */}
                      <span className="absolute -left-[35px] top-4 w-7 h-7 rounded-full bg-white border-2 border-indigo-500 shadow-xs flex items-center justify-center text-xs">
                        {cfg.icon}
                      </span>

                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${sourceCfg.bg}`}>
                              {sourceCfg.label}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatRelativeTime(act.occurred_at || act.created_at)}
                            </span>
                          </div>

                          <h4
                            onClick={() => setSelectedActivity(act)}
                            className="text-base font-bold text-slate-900 hover:text-indigo-600 cursor-pointer transition pt-1"
                          >
                            {act.title || 'Untitled Activity'}
                          </h4>
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => setSelectedActivity(act)}
                            className="text-xs text-slate-500 hover:text-indigo-600 font-medium px-2 py-1 rounded hover:bg-slate-50 transition"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleOpenEdit(act)}
                            className="text-xs text-slate-500 hover:text-indigo-600 font-medium px-2 py-1 rounded hover:bg-slate-50 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(act.id)}
                            className="text-xs text-rose-500 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Summary Text */}
                      {act.summary && (
                        <p className="text-sm text-slate-700 mt-2.5 whitespace-pre-line leading-relaxed">
                          {act.summary}
                        </p>
                      )}

                      {/* Raw Content Expandable Toggle */}
                      {hasRawContent && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleExpand(act.id)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            <span>{isExpanded ? '▼ Hide transcript / details' : '▶ View full transcript / details'}</span>
                          </button>
                          {isExpanded && (
                            <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-60 overflow-y-auto">
                              {act.raw_content}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Attached Entity Chips */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {act.person && (
                          <Link
                            href={`/persons?q=${encodeURIComponent(act.person.primary_email || act.person.id)}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-700 font-medium transition"
                          >
                            <span>👤</span>
                            <span>{personName}</span>
                            {act.person.primary_email && (
                              <span className="text-slate-400 font-normal">({act.person.primary_email})</span>
                            )}
                          </Link>
                        )}

                        {act.company && (
                          <Link
                            href={`/companies?q=${encodeURIComponent(act.company.name)}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-700 font-medium transition"
                          >
                            <span>🏢</span>
                            <span>{act.company.name}</span>
                            {act.company.domain && (
                              <span className="text-slate-400 font-normal">({act.company.domain})</span>
                            )}
                          </Link>
                        )}

                        <span className="text-[11px] text-slate-400 ml-auto">
                          {new Date(act.occurred_at || act.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pagination Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 text-sm">
            <div className="text-xs text-slate-500" data-testid="pagination-info">
              Showing{' '}
              <strong className="text-slate-800">
                {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-800">{Math.min(page * pageSize, totalCount)}</strong>{' '}
              of <strong className="text-slate-800">{totalCount}</strong> activities
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 border border-slate-200 rounded bg-white text-slate-700 font-medium text-xs focus:outline-none"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  data-testid="pagination-prev"
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                >
                  ← Previous
                </button>
                <span className="px-2 text-xs font-medium text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  data-testid="pagination-next"
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Activity Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>✨</span>
                <span>Log New Customer Activity</span>
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4 text-sm">
              {/* Activity Type Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Activity Type *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Object.entries(TYPE_CONFIG).map(([typeKey, cfg]) => (
                    <button
                      key={typeKey}
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, type: typeKey })}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                        createForm.type === typeKey
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-lg">{cfg.icon}</span>
                      <span className="text-[11px] leading-tight">{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Occurred Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                  <input
                    placeholder="e.g. Intro discovery call regarding cloud platform"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Occurred At *</label>
                  <input
                    type="datetime-local"
                    required
                    value={createForm.occurred_at}
                    onChange={(e) => setCreateForm({ ...createForm, occurred_at: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Associated Person & Company using SearchableCombobox */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <SearchableCombobox
                  label="Associated Contact / Person"
                  value={createForm.person_id}
                  options={personComboboxOptions}
                  onSearch={handleSearchPersons}
                  onChange={(id) => setCreateForm({ ...createForm, person_id: id })}
                  placeholder="Search contact by name or email..."
                  searchPlaceholder="Type contact name..."
                  data-testid="create-activity-person-combobox"
                />

                <SearchableCombobox
                  label="Associated Company / Org"
                  value={createForm.company_id}
                  options={companyComboboxOptions}
                  onSearch={handleSearchCompanies}
                  onChange={(id) => setCreateForm({ ...createForm, company_id: id })}
                  placeholder="Search company by name or domain..."
                  searchPlaceholder="Type company name..."
                  data-testid="create-activity-company-combobox"
                />

                <div className="sm:col-span-2 text-[11px] text-slate-500">
                  💡 Link to a person, company, or both to correlate activity with contact histories and pipeline deals.
                </div>
              </div>

              {/* Source & Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Source</label>
                  <select
                    value={createForm.source}
                    onChange={(e) => setCreateForm({ ...createForm, source: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="notion">Notion</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="gmail">Gmail</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Summary / Key Takeaways</label>
                  <input
                    placeholder="Brief highlights or action items..."
                    value={createForm.summary}
                    onChange={(e) => setCreateForm({ ...createForm, summary: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Raw Content / Notes Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Notes / Conversation Transcript (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Detailed meeting notes, email body text, or conversation snippet..."
                  value={createForm.raw_content}
                  onChange={(e) => setCreateForm({ ...createForm, raw_content: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {saving ? 'Logging...' : 'Save Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Activity Modal */}
      {editingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Edit Activity Log</h2>
              <button
                onClick={() => setEditingActivity(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="linkedin_message">LinkedIn Message</option>
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                    <option value="note">Note</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Occurred At</label>
                <input
                  type="datetime-local"
                  value={editForm.occurred_at}
                  onChange={(e) => setEditForm({ ...editForm, occurred_at: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Summary</label>
                <textarea
                  rows={2}
                  value={editForm.summary}
                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Raw Transcript / Content</label>
                <textarea
                  rows={4}
                  value={editForm.raw_content}
                  onChange={(e) => setEditForm({ ...editForm, raw_content: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-over Detail Drawer */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
          <div
            data-testid="activity-detail-drawer"
            className="bg-white w-full max-w-lg h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
          >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {TYPE_CONFIG[selectedActivity.type]?.icon || '📌'}
                  </span>
                  <div>
                    <span className="text-xs uppercase font-bold text-indigo-600 tracking-wider">
                      {TYPE_CONFIG[selectedActivity.type]?.label || selectedActivity.type}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 leading-snug">
                      {selectedActivity.title || 'Untitled Activity'}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {/* Timestamp & Source */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Occurred</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(selectedActivity.occurred_at || selectedActivity.created_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Source Channel</span>
                  <span className="font-semibold text-slate-800 uppercase">
                    {selectedActivity.source}
                  </span>
                </div>
              </div>

              {/* Associated Entities */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Associated Entities</h4>
                {selectedActivity.person && (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {selectedActivity.person.first_name?.[0] || '👤'}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {[selectedActivity.person.first_name, selectedActivity.person.last_name].filter(Boolean).join(' ') || 'Contact'}
                        </div>
                        <div className="text-xs text-slate-500">{selectedActivity.person.primary_email}</div>
                      </div>
                    </div>
                    <Link
                      href={`/persons?q=${encodeURIComponent(selectedActivity.person.primary_email || selectedActivity.person.id)}`}
                      className="text-xs text-indigo-600 hover:underline font-semibold"
                    >
                      View Profile →
                    </Link>
                  </div>
                )}

                {selectedActivity.company && (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                        🏢
                      </span>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{selectedActivity.company.name}</div>
                        <div className="text-xs text-slate-500">{selectedActivity.company.domain}</div>
                      </div>
                    </div>
                    <Link
                      href={`/companies?q=${encodeURIComponent(selectedActivity.company.name)}`}
                      className="text-xs text-indigo-600 hover:underline font-semibold"
                    >
                      View Company →
                    </Link>
                  </div>
                )}
              </div>

              {/* Summary */}
              {selectedActivity.summary && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Summary</h4>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                    {selectedActivity.summary}
                  </div>
                </div>
              )}

              {/* Raw Content / Notes */}
              {selectedActivity.raw_content && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Transcript / Content</h4>
                  <div className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
                    {selectedActivity.raw_content}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Actions */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => handleDelete(selectedActivity.id)}
                className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition"
              >
                Delete Log
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleOpenEdit(selectedActivity);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
                >
                  Edit Activity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
