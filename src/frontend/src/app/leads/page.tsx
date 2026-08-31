'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';

interface Lead {
  id: string;
  person_id: string;
  company_id?: string | null;
  owner_id?: string | null;
  title?: string | null;
  stage: 'new' | 'contacted' | 'qualified' | 'converted' | 'disqualified';
  source?: string | null;
  source_ref_id?: string | null;
  intent?: string | null;
  signal_strength?: 'strong' | 'medium' | 'weak' | 'high' | 'low' | string | null;
  notes?: string | null;
  description?: string | null;
  disqualification_reason?: string | null;
  converted_at?: string | null;
  converted_opportunity_id?: string | null;
  created_at: string;
  updated_at: string;
  person_name?: string | null;
  person_email?: string | null;
  person_avatar_url?: string | null;
  company_name?: string | null;
  company_domain?: string | null;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [signalFilter, setSignalFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('created_at:desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Bulk selection & resolve modals state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showBulkConvertModal, setShowBulkConvertModal] = useState(false);
  const [showBulkDisqualifyModal, setShowBulkDisqualifyModal] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [bulkForm, setBulkForm] = useState({
    stage: '',
    signal_strength: '',
    source: '',
    intent: '',
    disqualification_reason: '',
    append_notes: '',
  });

  const [bulkConvertForm, setBulkConvertForm] = useState({
    default_value: '10000',
    currency: 'EUR',
    expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    title_suffix: '— Opportunity Deal',
  });

  const [bulkDisqualifyForm, setBulkDisqualifyForm] = useState({
    reason: 'wrong_fit',
    notes: '',
  });

  // Single-item Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLeadForView, setSelectedLeadForView] = useState<Lead | null>(null);
  const [convertModalLead, setConvertModalLead] = useState<Lead | null>(null);
  const [disqualifyModalLead, setDisqualifyModalLead] = useState<Lead | null>(null);
  const [advanceModalLead, setAdvanceModalLead] = useState<Lead | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    person_id: '',
    company_id: '',
    title: '',
    intent: 'business_collaboration',
    signal_strength: 'strong',
    source: 'linkedin_message',
    stage: 'new',
    description: '',
  });

  const [convertForm, setConvertForm] = useState({
    title: '',
    value: '',
    currency: 'EUR',
    expected_close_date: '',
  });

  const [disqualifyForm, setDisqualifyForm] = useState({
    reason: 'wrong_fit',
    notes: '',
  });

  const [advanceForm, setAdvanceForm] = useState({
    notes: '',
  });

  const loadLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sortField, sortOrder] = sortOption.split(':');
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('page_size', String(pageSize));
      params.append('sort', sortField || 'created_at');
      params.append('order', sortOrder || 'desc');
      if (stageFilter) params.append('stage', stageFilter);
      if (sourceFilter) params.append('source', sourceFilter);
      if (signalFilter) params.append('signal_strength', signalFilter);
      if (searchQuery.trim()) params.append('q', searchQuery.trim());

      const res = await apiFetch<ApiResponse<Lead[]>>(`/api/v1/leads?${params.toString()}`);
      setLeads(res.data || []);
      setTotalCount((res.pagination as any)?.total || res.data?.length || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLeads();
    }, 150);
    return () => clearTimeout(timer);
  }, [page, pageSize, stageFilter, sourceFilter, signalFilter, sortOption, searchQuery]);

  const handleStageFilterChange = (val: string) => {
    setStageFilter(val);
    setPage(1);
  };

  const handleSourceFilterChange = (val: string) => {
    setSourceFilter(val);
    setPage(1);
  };

  const handleSignalFilterChange = (val: string) => {
    setSignalFilter(val);
    setPage(1);
  };

  const handleSortChange = (val: string) => {
    setSortOption(val);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handlePageSizeChange = (val: number) => {
    setPageSize(val);
    setPage(1);
  };

  // Bulk Selection Handlers
  const isAllCurrentPageSelected =
    leads.length > 0 && leads.every((l) => selectedIds.includes(l.id));

  const handleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = new Set(leads.map((l) => l.id));
      setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...leads.map((l) => l.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 1. Bulk Update Handler
  const handleBulkUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    try {
      const payload: any = {
        lead_ids: selectedIds,
      };
      if (bulkForm.stage) payload.stage = bulkForm.stage;
      if (bulkForm.signal_strength) payload.signal_strength = bulkForm.signal_strength;
      if (bulkForm.source) payload.source = bulkForm.source;
      if (bulkForm.intent.trim()) payload.intent = bulkForm.intent.trim();
      if (bulkForm.disqualification_reason.trim()) {
        payload.disqualification_reason = bulkForm.disqualification_reason.trim();
      }
      if (bulkForm.append_notes.trim()) payload.append_notes = bulkForm.append_notes.trim();

      const res = await apiFetch<any>('/api/v1/leads/bulk-update', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccessMessage(res.message || `Successfully updated ${selectedIds.length} leads.`);
      setShowBulkEditModal(false);
      setSelectedIds([]);
      loadLeads();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Error during bulk update: ' + err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  // 2. Bulk Convert to Opportunity Handler
  const handleBulkConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    try {
      const payload = {
        lead_ids: selectedIds,
        default_value: bulkConvertForm.default_value ? parseFloat(bulkConvertForm.default_value) : undefined,
        currency: bulkConvertForm.currency,
        expected_close_date: bulkConvertForm.expected_close_date || undefined,
        title_suffix: bulkConvertForm.title_suffix || '— Opportunity Deal',
      };

      const res = await apiFetch<any>('/api/v1/leads/bulk-convert', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccessMessage(res.message || `Successfully converted ${selectedIds.length} leads to opportunities.`);
      setShowBulkConvertModal(false);
      setSelectedIds([]);
      loadLeads();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Error during bulk conversion: ' + err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  // 3. Bulk Disqualify / Reject Handler
  const handleBulkDisqualifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    try {
      const payload = {
        lead_ids: selectedIds,
        reason: bulkDisqualifyForm.reason,
        notes: bulkDisqualifyForm.notes.trim() || undefined,
      };

      const res = await apiFetch<any>('/api/v1/leads/bulk-disqualify', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccessMessage(res.message || `Successfully rejected ${selectedIds.length} leads.`);
      setShowBulkDisqualifyModal(false);
      setSelectedIds([]);
      loadLeads();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Error during bulk disqualification: ' + err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  // 4. Bulk Delete / Remove Handler
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete and remove ${selectedIds.length} selected leads?`)) {
      return;
    }
    try {
      const res = await apiFetch<any>('/api/v1/leads/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ lead_ids: selectedIds }),
      });
      setSuccessMessage(res.message || `Successfully removed ${selectedIds.length} leads.`);
      setSelectedIds([]);
      loadLeads();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Error during bulk delete: ' + err.message);
    }
  };

  // Single Lead Actions
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.person_id.trim()) {
      alert('Person ID is required to create a lead.');
      return;
    }
    try {
      const payload: any = {
        person_id: createForm.person_id.trim(),
        stage: createForm.stage,
        source: createForm.source,
        intent: createForm.intent.trim() || undefined,
        signal_strength: createForm.signal_strength,
        description: createForm.description.trim() || undefined,
        notes: createForm.description.trim() || undefined,
      };
      if (createForm.company_id.trim()) payload.company_id = createForm.company_id.trim();

      await apiFetch('/api/v1/leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowCreateModal(false);
      setCreateForm({
        person_id: '',
        company_id: '',
        title: '',
        intent: 'business_collaboration',
        signal_strength: 'strong',
        source: 'linkedin_message',
        stage: 'new',
        description: '',
      });
      setPage(1);
      loadLeads();
    } catch (err: any) {
      alert('Error creating lead: ' + err.message);
    }
  };

  const openConvertModal = (lead: Lead) => {
    const defaultTitle =
      lead.person_name
        ? `${lead.person_name} — Deal / Engagement`
        : lead.title || 'New Business Engagement';
    setConvertForm({
      title: defaultTitle,
      value: '10000',
      currency: 'EUR',
      expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setConvertModalLead(lead);
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertModalLead) return;
    try {
      await apiFetch(`/api/v1/leads/${convertModalLead.id}/convert`, {
        method: 'POST',
        body: JSON.stringify({
          title: convertForm.title,
          value: convertForm.value ? parseFloat(convertForm.value) : undefined,
          currency: convertForm.currency,
          expected_close_date: convertForm.expected_close_date || undefined,
        }),
      });
      setConvertModalLead(null);
      loadLeads();
    } catch (err: any) {
      alert('Error converting lead: ' + err.message);
    }
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceModalLead) return;
    try {
      await apiFetch(`/api/v1/leads/${advanceModalLead.id}/advance`, {
        method: 'POST',
        body: JSON.stringify({
          notes: advanceForm.notes.trim() || undefined,
        }),
      });
      setAdvanceModalLead(null);
      setAdvanceForm({ notes: '' });
      loadLeads();
    } catch (err: any) {
      alert('Error advancing lead: ' + err.message);
    }
  };

  const handleDisqualifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disqualifyModalLead) return;
    try {
      await apiFetch(`/api/v1/leads/${disqualifyModalLead.id}/disqualify`, {
        method: 'POST',
        body: JSON.stringify({
          reason: disqualifyForm.reason,
          notes: disqualifyForm.notes.trim() || undefined,
        }),
      });
      setDisqualifyModalLead(null);
      setDisqualifyForm({ reason: 'wrong_fit', notes: '' });
      loadLeads();
    } catch (err: any) {
      alert('Error disqualifying lead: ' + err.message);
    }
  };

  // Helper formatting functions
  const getInitials = (name?: string | null) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'new':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'contacted':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'qualified':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'converted':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'disqualified':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getSignalBadge = (sig?: string | null) => {
    const s = (sig || '').toLowerCase();
    if (s === 'strong' || s === 'high') {
      return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-semibold">🔥 Strong</span>;
    }
    if (s === 'medium') {
      return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-semibold">⚡ Medium</span>;
    }
    return <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium">🌱 Low</span>;
  };

  // Stats and pagination calculations
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRecord = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(totalCount, page * pageSize);

  const newCount = leads.filter((l) => l.stage === 'new').length;
  const inPipelineCount = leads.filter((l) => l.stage === 'contacted' || l.stage === 'qualified').length;
  const convertedCount = leads.filter((l) => l.stage === 'converted').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leads & Inbound Signals</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Distilled from LinkedIn messages and inbound conversations — sorted by most recent first
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
          >
            <span>+</span>
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2 font-medium">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Leads</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-1.5">
            <span>🎯</span>
            <span>{totalCount || leads.length}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Inbound conversation pipeline</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">New (This Page)</div>
          <div className="text-2xl font-bold text-blue-700 mt-1 flex items-center gap-1.5">
            <span>📬</span>
            <span>{newCount}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Awaiting first outreach</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">In Pipeline (This Page)</div>
          <div className="text-2xl font-bold text-amber-700 mt-1 flex items-center gap-1.5">
            <span>⚡</span>
            <span>{inPipelineCount}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Contacted or qualified</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Converted (This Page)</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
            <span>💼</span>
            <span>{convertedCount}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Converted to opportunities</div>
        </div>
      </div>

      {/* Sticky / Floating Bulk Resolve Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-fade-in border border-slate-800">
          <div className="flex items-center gap-3">
            <span className="bg-amber-400 text-slate-950 text-xs font-bold px-2.5 py-1 rounded-full shadow-xs">
              {selectedIds.length} Selected
            </span>
            <span className="text-sm font-semibold text-slate-200">
              Bulk Resolve & Action Pipeline:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Bulk Convert */}
            <button
              onClick={() => setShowBulkConvertModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm"
              title="Convert selected leads to active deals"
            >
              <span>💼</span>
              <span>Bulk Convert to Opp</span>
            </button>

            {/* 2. Bulk Reject / Disqualify */}
            <button
              onClick={() => setShowBulkDisqualifyModal(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm"
              title="Reject or disqualify selected leads"
            >
              <span>🚫</span>
              <span>Bulk Reject / Disqualify</span>
            </button>

            {/* 3. Bulk Edit Attributes */}
            <button
              onClick={() => setShowBulkEditModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 border border-slate-700"
            >
              <span>✏️</span>
              <span>Edit Attributes</span>
            </button>

            {/* 4. Bulk Delete / Remove */}
            <button
              onClick={handleBulkDelete}
              className="bg-red-700 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm"
              title="Permanently remove selected leads"
            >
              <span>🗑</span>
              <span>Remove</span>
            </button>

            {/* Clear Selection */}
            <button
              onClick={() => setSelectedIds([])}
              className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Filters & Sorting Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Search contact, company, intent, description..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Stage Filter */}
          <div>
            <select
              value={stageFilter}
              onChange={(e) => handleStageFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All Stages</option>
              <option value="new">New (Uncontacted)</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="disqualified">Disqualified</option>
            </select>
          </div>

          {/* Signal Strength Filter */}
          <div>
            <select
              value={signalFilter}
              onChange={(e) => handleSignalFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All Signal Strengths</option>
              <option value="strong">🔥 Strong Signal</option>
              <option value="medium">⚡ Medium Signal</option>
              <option value="weak">🌱 Low Signal</option>
            </select>
          </div>

          {/* Sorting Dropdown */}
          <div>
            <select
              value={sortOption}
              onChange={(e) => handleSortChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800"
            >
              <option value="created_at:desc">🕒 Most Recent (Default)</option>
              <option value="created_at:asc">🕒 Oldest First</option>
              <option value="updated_at:desc">🔄 Recently Updated</option>
              <option value="signal_strength:desc">🔥 Signal Strength</option>
              <option value="stage:asc">📊 Stage Flow</option>
            </select>
          </div>

          {/* Page Size Dropdown */}
          <div>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>

        {/* Quick Stage Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium mr-1">Filter by Stage:</span>
          {[
            { label: 'All', value: '' },
            { label: 'New', value: 'new' },
            { label: 'Contacted', value: 'contacted' },
            { label: 'Qualified', value: 'qualified' },
            { label: 'Converted', value: 'converted' },
            { label: 'Disqualified', value: 'disqualified' },
          ].map((pill) => (
            <button
              key={pill.value}
              onClick={() => handleStageFilterChange(pill.value)}
              className={`px-2.5 py-1 rounded-md transition font-medium ${
                stageFilter === pill.value
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 shadow-sm">
          {error}
        </div>
      )}

      {/* Main Leads Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 select-none">
              <tr>
                <th className="p-3.5 pl-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                    title="Select all on this page"
                  />
                </th>
                <th className="p-3.5">Contact & Company</th>
                <th className="p-3.5">Intent / Signals</th>
                <th className="p-3.5 min-w-[260px]">Lead Description / Conversation Notes</th>
                <th className="p-3.5">Stage</th>
                <th className="p-3.5 whitespace-nowrap">Created (Most Recent)</th>
                <th className="p-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <div className="inline-block animate-spin mr-2">⏳</div>
                    Loading leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <div className="text-3xl mb-2">🎯</div>
                    <div className="font-semibold text-slate-800">No leads found</div>
                    <div className="text-xs text-slate-400 mt-1">Try adjusting your search terms or filters</div>
                  </td>
                </tr>
              ) : (
                leads.map((l) => {
                  const leadDesc = l.description || l.notes || '';
                  const hasLongDesc = leadDesc.length > 90;
                  const isSelected = selectedIds.includes(l.id);

                  return (
                    <tr
                      key={l.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isSelected ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="p-3.5 pl-4 align-top text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(l.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4 mt-1"
                        />
                      </td>

                      {/* Contact & Company */}
                      <td className="p-3.5 align-top">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-linear-to-tr from-slate-700 to-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {getInitials(l.person_name)}
                          </div>
                          <div>
                            {l.person_id ? (
                              <Link
                                href={`/persons/${l.person_id}`}
                                className="font-semibold text-slate-900 hover:text-blue-600 hover:underline transition block"
                              >
                                {l.person_name || 'Contact Person'}
                              </Link>
                            ) : (
                              <span className="font-semibold text-slate-900">
                                {l.person_name || 'Unknown Person'}
                              </span>
                            )}
                            {l.company_name && (
                              <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                                <span>🏢</span>
                                {l.company_id ? (
                                  <Link
                                    href={`/companies/${l.company_id}`}
                                    className="hover:underline hover:text-slate-900"
                                  >
                                    {l.company_name}
                                  </Link>
                                ) : (
                                  <span>{l.company_name}</span>
                                )}
                              </div>
                            )}
                            {l.person_email && !l.company_name && (
                              <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">
                                {l.person_email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Intent & Signal */}
                      <td className="p-3.5 align-top">
                        <div className="space-y-1">
                          <div className="font-medium text-slate-800 text-xs">
                            {(l.intent || 'Networking / Consulting').replace(/_/g, ' ').toUpperCase()}
                          </div>
                          <div>{getSignalBadge(l.signal_strength)}</div>
                          <div className="text-[11px] text-slate-400 capitalize">
                            Source: {(l.source || 'inbound').replace(/_/g, ' ')}
                          </div>
                        </div>
                      </td>

                      {/* Description / Notes */}
                      <td className="p-3.5 align-top">
                        {leadDesc ? (
                          <div className="space-y-1">
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed whitespace-pre-line bg-slate-50 p-2 rounded-md border border-slate-100">
                              {leadDesc}
                            </p>
                            {hasLongDesc && (
                              <button
                                onClick={() => setSelectedLeadForView(l)}
                                className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-1"
                              >
                                <span>👁️</span>
                                <span>View Full Description / Transcript</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No notes provided</span>
                        )}
                      </td>

                      {/* Stage */}
                      <td className="p-3.5 align-top whitespace-nowrap">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider ${getStageBadge(
                            l.stage
                          )}`}
                        >
                          {l.stage}
                        </span>
                        {l.disqualification_reason && (
                          <div className="text-[10px] text-slate-500 mt-1 max-w-[120px] truncate">
                            Reason: {l.disqualification_reason}
                          </div>
                        )}
                      </td>

                      {/* Created At (Recency) */}
                      <td className="p-3.5 align-top text-xs text-slate-500 whitespace-nowrap">
                        <div className="font-medium text-slate-700">{formatDate(l.created_at)}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Updated: {formatDate(l.updated_at)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-4 align-top text-right whitespace-nowrap space-y-1">
                        <div className="flex items-center justify-end gap-1.5">
                          {l.stage !== 'converted' && l.stage !== 'disqualified' && (
                            <>
                              <button
                                onClick={() => {
                                  setAdvanceModalLead(l);
                                  setAdvanceForm({ notes: '' });
                                }}
                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium px-2.5 py-1 rounded transition"
                                title="Advance Stage"
                              >
                                Advance →
                              </button>
                              <button
                                onClick={() => openConvertModal(l)}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2.5 py-1 rounded shadow-2xs transition"
                              >
                                Convert to Opp
                              </button>
                            </>
                          )}
                          {l.stage === 'converted' && (
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              ✓ Converted
                            </span>
                          )}
                          {l.stage !== 'converted' && l.stage !== 'disqualified' && (
                            <button
                              onClick={() => {
                                setDisqualifyModalLead(l);
                                setDisqualifyForm({ reason: 'wrong_fit', notes: '' });
                              }}
                              className="text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition"
                              title="Disqualify Lead"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Enhanced Pagination Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-800">{startRecord}</span> to{' '}
            <span className="font-semibold text-slate-800">{endRecord}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalCount}</span> leads
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage(1)}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-medium"
              title="First Page"
            >
              «
            </button>
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-medium"
            >
              Previous
            </button>

            <span className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-medium"
            >
              Next
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage(totalPages)}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-medium"
              title="Last Page"
            >
              »
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 0A: Bulk Convert to Opportunity */}
      {showBulkConvertModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Bulk Convert to Opportunity ({selectedIds.length} leads)
                </h3>
                <p className="text-xs text-slate-500">
                  Convert all selected leads into active opportunity deals simultaneously
                </p>
              </div>
              <button
                onClick={() => setShowBulkConvertModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkConvertSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Default Deal Value (€)</label>
                  <input
                    type="number"
                    value={bulkConvertForm.default_value}
                    onChange={(e) => setBulkConvertForm({ ...bulkConvertForm, default_value: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Currency</label>
                  <select
                    value={bulkConvertForm.currency}
                    onChange={(e) => setBulkConvertForm({ ...bulkConvertForm, currency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={bulkConvertForm.expected_close_date}
                    onChange={(e) => setBulkConvertForm({ ...bulkConvertForm, expected_close_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Opportunity Title Suffix</label>
                  <input
                    value={bulkConvertForm.title_suffix}
                    onChange={(e) => setBulkConvertForm({ ...bulkConvertForm, title_suffix: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    placeholder="— Opportunity Deal"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
                ⚡ Each selected lead will generate an active Opportunity linked to its decision-maker person & company record, with stage marked as <strong>converted</strong>.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkConvertModal(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkProcessing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-xs disabled:opacity-50"
                >
                  {bulkProcessing ? 'Converting Deals...' : `Convert ${selectedIds.length} Leads to Opps`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 0B: Bulk Disqualify / Reject */}
      {showBulkDisqualifyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Bulk Reject / Disqualify ({selectedIds.length} leads)
                </h3>
                <p className="text-xs text-slate-500">
                  Disqualify all selected leads and record the rejection reason
                </p>
              </div>
              <button
                onClick={() => setShowBulkDisqualifyModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkDisqualifySubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Disqualification Reason *</label>
                <select
                  value={bulkDisqualifyForm.reason}
                  onChange={(e) => setBulkDisqualifyForm({ ...bulkDisqualifyForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-white font-medium"
                >
                  <option value="wrong_fit">Wrong Fit / Scope</option>
                  <option value="no_budget">No Budget / Price Constraint</option>
                  <option value="no_response">No Response / Stalled Outreach</option>
                  <option value="wrong_timing">Wrong Timing / Deferred</option>
                  <option value="competitor_chosen">Competitor Chosen</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rejection Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={bulkDisqualifyForm.notes}
                  onChange={(e) => setBulkDisqualifyForm({ ...bulkDisqualifyForm, notes: e.target.value })}
                  placeholder="e.g. Lead does not meet qualified pipeline criteria during batch review."
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkDisqualifyModal(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkProcessing}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs shadow-xs disabled:opacity-50"
                >
                  {bulkProcessing ? 'Disqualifying...' : `Reject & Disqualify ${selectedIds.length} Leads`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 0C: Bulk Edit Attributes */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Bulk Edit Lead Attributes ({selectedIds.length} selected)
                </h3>
                <p className="text-xs text-slate-500">Apply batch attribute changes to all selected leads</p>
              </div>
              <button
                onClick={() => setShowBulkEditModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkUpdateSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Update Stage</label>
                  <select
                    value={bulkForm.stage}
                    onChange={(e) => setBulkForm({ ...bulkForm, stage: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                  >
                    <option value="">(Keep Existing Stage)</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="disqualified">Disqualified</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Update Signal Strength</label>
                  <select
                    value={bulkForm.signal_strength}
                    onChange={(e) => setBulkForm({ ...bulkForm, signal_strength: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                  >
                    <option value="">(Keep Existing Signal)</option>
                    <option value="strong">🔥 Strong</option>
                    <option value="medium">⚡ Medium</option>
                    <option value="weak">🌱 Weak</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Update Source</label>
                  <select
                    value={bulkForm.source}
                    onChange={(e) => setBulkForm({ ...bulkForm, source: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                  >
                    <option value="">(Keep Existing Source)</option>
                    <option value="linkedin_message">LinkedIn Message</option>
                    <option value="inbound">Inbound</option>
                    <option value="referral">Referral</option>
                    <option value="event">Event</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Update Intent</label>
                  <input
                    placeholder="e.g. consulting_opportunity"
                    value={bulkForm.intent}
                    onChange={(e) => setBulkForm({ ...bulkForm, intent: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Append Note / Description
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Batch outreach completed during marketing sprint..."
                  value={bulkForm.append_notes}
                  onChange={(e) => setBulkForm({ ...bulkForm, append_notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This note will be appended to the notes history of each selected lead without overwriting past history.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkEditModal(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkProcessing}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-xs disabled:opacity-50"
                >
                  {bulkProcessing ? 'Applying Batch Changes...' : `Update ${selectedIds.length} Leads`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: View Full Description & Transcript */}
      {selectedLeadForView && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Lead Description & Conversation Transcript
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Contact: {selectedLeadForView.person_name || 'Unknown Contact'}
                  {selectedLeadForView.company_name ? ` (${selectedLeadForView.company_name})` : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedLeadForView(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Stage:</span>
                <span className="font-semibold uppercase text-slate-800">{selectedLeadForView.stage}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Intent:</span>
                <span className="font-semibold text-slate-800">{selectedLeadForView.intent || 'General'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Signal:</span>
                <span className="font-semibold text-slate-800 capitalize">{selectedLeadForView.signal_strength || 'Normal'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Created:</span>
                <span className="font-semibold text-slate-800">{formatDate(selectedLeadForView.created_at)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Description & Transcript:
              </label>
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[350px] overflow-y-auto border border-slate-800">
                {selectedLeadForView.description || selectedLeadForView.notes || 'No description notes.'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLeadForView(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Create New Lead */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create New Lead</h3>
                <p className="text-xs text-slate-500">Add an inbound inquiry or business opportunity signal</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Person ID (UUID) *</label>
                  <input
                    required
                    placeholder="e.g. 73a2fa80-..."
                    value={createForm.person_id}
                    onChange={(e) => setCreateForm({ ...createForm, person_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Company ID (UUID Optional)</label>
                  <input
                    placeholder="e.g. 81bb59de-..."
                    value={createForm.company_id}
                    onChange={(e) => setCreateForm({ ...createForm, company_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Stage</label>
                  <select
                    value={createForm.stage}
                    onChange={(e) => setCreateForm({ ...createForm, stage: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Source</label>
                  <select
                    value={createForm.source}
                    onChange={(e) => setCreateForm({ ...createForm, source: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                  >
                    <option value="linkedin_message">LinkedIn Message</option>
                    <option value="inbound">Inbound</option>
                    <option value="referral">Referral</option>
                    <option value="event">Event</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Signal Strength</label>
                  <select
                    value={createForm.signal_strength}
                    onChange={(e) => setCreateForm({ ...createForm, signal_strength: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                  >
                    <option value="strong">🔥 Strong</option>
                    <option value="medium">⚡ Medium</option>
                    <option value="weak">🌱 Weak</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Intent / Category</label>
                <input
                  placeholder="e.g. business_collaboration, consulting_request"
                  value={createForm.intent}
                  onChange={(e) => setCreateForm({ ...createForm, intent: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description & Conversation Transcript
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter details of the conversation, key requirements, or conversation transcript..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Convert to Opportunity */}
      {convertModalLead && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Convert Lead to Opportunity</h3>
                <p className="text-xs text-slate-500">
                  Creating an active deal for {convertModalLead.person_name || 'Contact'}
                </p>
              </div>
              <button
                onClick={() => setConvertModalLead(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Opportunity Title *</label>
                <input
                  required
                  value={convertForm.title}
                  onChange={(e) => setConvertForm({ ...convertForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Estimated Value (€)</label>
                  <input
                    type="number"
                    value={convertForm.value}
                    onChange={(e) => setConvertForm({ ...convertForm, value: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={convertForm.expected_close_date}
                    onChange={(e) => setConvertForm({ ...convertForm, expected_close_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConvertModalLead(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Create Opportunity Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Advance Stage */}
      {advanceModalLead && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Advance Lead Stage ({advanceModalLead.stage} → Next)
            </h3>
            <form onSubmit={handleAdvanceSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes / Progress Update</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Had discovery call; client requested pricing."
                  value={advanceForm.notes}
                  onChange={(e) => setAdvanceForm({ notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdvanceModalLead(null)}
                  className="px-3 py-1.5 border rounded-lg text-xs font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                >
                  Confirm Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Disqualify Lead */}
      {disqualifyModalLead && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Disqualify Lead</h3>
            <form onSubmit={handleDisqualifySubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Reason</label>
                <select
                  value={disqualifyForm.reason}
                  onChange={(e) => setDisqualifyForm({ ...disqualifyForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                >
                  <option value="wrong_fit">Wrong Fit / Scope</option>
                  <option value="no_budget">No Budget</option>
                  <option value="no_response">No Response / Stalled</option>
                  <option value="wrong_timing">Wrong Timing</option>
                  <option value="competitor_chosen">Competitor Chosen</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={disqualifyForm.notes}
                  onChange={(e) => setDisqualifyForm({ ...disqualifyForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDisqualifyModalLead(null)}
                  className="px-3 py-1.5 border rounded-lg text-xs font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
                >
                  Disqualify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
