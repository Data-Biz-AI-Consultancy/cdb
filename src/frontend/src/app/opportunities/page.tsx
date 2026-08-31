'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';

export interface OpportunityPerson {
  person_id: string;
  role?: string | null;
  person_name?: string | null;
  person_email?: string | null;
  person_avatar_url?: string | null;
}

export interface OpportunityCompany {
  company_id: string;
  role?: string | null;
  company_name?: string | null;
  company_domain?: string | null;
}

export interface Opportunity {
  id: string;
  title: string;
  stage: 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost' | string;
  value?: number | string | null;
  currency?: string | null;
  probability?: number | null;
  expected_close_date?: string | null;
  source_lead_id?: string | null;
  notes?: string | null;
  description?: string | null;
  attributes?: Record<string, any>;
  persons?: OpportunityPerson[];
  companies?: OpportunityCompany[];
  created_at: string;
  updated_at: string;
}

export interface OpportunityHistoryItem {
  id: string;
  opportunity_id: string;
  action_id: string;
  action?: {
    id: string;
    name: string;
    category: string;
    description?: string;
    icon?: string;
    color?: string;
  } | null;
  field_name?: string | null;
  old_value?: any;
  new_value?: any;
  changes: Record<string, any>;
  summary?: string | null;
  created_at: string;
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

const STAGES = [
  { id: 'prospect', label: 'Prospect', icon: '🎯', color: 'border-slate-300 bg-slate-50', headerBg: 'bg-slate-100 text-slate-700', badge: 'bg-slate-100 text-slate-700' },
  { id: 'qualified', label: 'Qualified', icon: '🔍', color: 'border-blue-300 bg-blue-50/30', headerBg: 'bg-blue-100 text-blue-800', badge: 'bg-blue-100 text-blue-800' },
  { id: 'proposal', label: 'Proposal', icon: '📑', color: 'border-amber-300 bg-amber-50/30', headerBg: 'bg-amber-100 text-amber-800', badge: 'bg-amber-100 text-amber-800' },
  { id: 'negotiation', label: 'Negotiation', icon: '🤝', color: 'border-purple-300 bg-purple-50/30', headerBg: 'bg-purple-100 text-purple-800', badge: 'bg-purple-100 text-purple-800' },
  { id: 'closed_won', label: 'Closed Won', icon: '🏆', color: 'border-emerald-300 bg-emerald-50/30', headerBg: 'bg-emerald-100 text-emerald-800', badge: 'bg-emerald-100 text-emerald-800' },
  { id: 'closed_lost', label: 'Closed Lost', icon: '❌', color: 'border-rose-300 bg-rose-50/30', headerBg: 'bg-rose-100 text-rose-800', badge: 'bg-rose-100 text-rose-800' },
];

export default function OpportunitiesPage() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  // Drag and Drop state
  const [draggedOppId, setDraggedOppId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Available options for attaching
  const [availablePersons, setAvailablePersons] = useState<PersonOption[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<CompanyOption[]>([]);

  // Modals & Drawers state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOppForDetail, setSelectedOppForDetail] = useState<Opportunity | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'contacts' | 'history'>('overview');
  const [historyItems, setHistoryItems] = useState<OpportunityHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [newHistoryNote, setNewHistoryNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Close Confirmation Modal state (for Won / Lost)
  const [closeConfirmData, setCloseConfirmData] = useState<{ oppId: string; outcome: 'closed_won' | 'closed_lost'; notes: string } | null>(null);

  // Forms state
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    notes: '',
    stage: 'prospect',
    value: '',
    currency: 'USD',
    probability: 50,
    expected_close_date: '',
    person_id: '',
    person_role: 'decision_maker',
    company_id: '',
    company_role: 'client',
  });

  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Attach Person & Company forms inside Drawer
  const [attachPersonForm, setAttachPersonForm] = useState({ person_id: '', role: 'decision_maker' });
  const [attachCompanyForm, setAttachCompanyForm] = useState({ company_id: '', role: 'client' });
  const [attachingPerson, setAttachingPerson] = useState(false);
  const [attachingCompany, setAttachingCompany] = useState(false);

  const loadOpps = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ApiResponse<Opportunity[]>>('/api/v1/opportunities?page_size=200');
      setOpps(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  const loadPersonsAndCompanies = async () => {
    try {
      const [personsRes, compRes] = await Promise.allSettled([
        apiFetch<ApiResponse<PersonOption[]>>('/api/v1/persons?page_size=100'),
        apiFetch<ApiResponse<CompanyOption[]>>('/api/v1/companies?page_size=100'),
      ]);
      if (personsRes.status === 'fulfilled') {
        setAvailablePersons(personsRes.value.data || []);
      }
      if (compRes.status === 'fulfilled') {
        setAvailableCompanies(compRes.value.data || []);
      }
    } catch {
      // Non-critical background loading
    }
  };

  useEffect(() => {
    loadOpps();
    loadPersonsAndCompanies();
  }, []);

  const loadHistory = async (oppId: string) => {
    setHistoryLoading(true);
    try {
      const res = await apiFetch<ApiResponse<OpportunityHistoryItem[]>>(`/api/v1/opportunities/${oppId}/history`);
      setHistoryItems(res.data || []);
    } catch (err: any) {
      console.error('Failed to load history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenDetail = (opp: Opportunity) => {
    setSelectedOppForDetail(opp);
    setEditForm({
      title: opp.title,
      description: opp.description || '',
      stage: opp.stage,
      value: opp.value ? String(opp.value) : '',
      currency: opp.currency || 'USD',
      probability: opp.probability !== null && opp.probability !== undefined ? opp.probability : 50,
      expected_close_date: opp.expected_close_date || '',
      notes: opp.notes || '',
    });
    setDetailTab('overview');
    loadHistory(opp.id);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, oppId: string) => {
    e.dataTransfer.setData('text/plain', oppId);
    setDraggedOppId(oppId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageId) {
      setDragOverStage(stageId);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, stageId: string) => {
    if (dragOverStage === stageId) {
      setDragOverStage(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const oppId = e.dataTransfer.getData('text/plain') || draggedOppId;
    setDraggedOppId(null);
    setDragOverStage(null);

    if (!oppId) return;

    const currentOpp = opps.find((o) => o.id === oppId);
    if (!currentOpp || currentOpp.stage === targetStage) return;

    // If dragging to closed_won or closed_lost, open confirmation modal
    if (targetStage === 'closed_won' || targetStage === 'closed_lost') {
      setCloseConfirmData({
        oppId,
        outcome: targetStage,
        notes: '',
      });
      return;
    }

    // Direct stage update with optimistic UI
    await handleDirectStageChange(oppId, targetStage);
  };

  const handleDirectStageChange = async (oppId: string, newStage: string) => {
    // Optimistic local update
    setOpps((prev) =>
      prev.map((o) =>
        o.id === oppId
          ? {
              ...o,
              stage: newStage,
              probability: newStage === 'closed_won' ? 100 : newStage === 'closed_lost' ? 0 : o.probability,
            }
          : o
      )
    );

    try {
      const updated = await apiFetch<Opportunity>(`/api/v1/opportunities/${oppId}`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: newStage }),
      });
      setOpps((prev) => prev.map((o) => (o.id === oppId ? updated : o)));
      if (selectedOppForDetail?.id === oppId) {
        setSelectedOppForDetail(updated);
        loadHistory(oppId);
      }
    } catch (err: any) {
      alert('Error updating stage: ' + err.message);
      loadOpps(); // Rollback
    }
  };

  const handleConfirmClose = async () => {
    if (!closeConfirmData) return;
    const { oppId, outcome, notes } = closeConfirmData;
    try {
      const updated = await apiFetch<Opportunity>(`/api/v1/opportunities/${oppId}/close`, {
        method: 'POST',
        body: JSON.stringify({ outcome, notes }),
      });
      setOpps((prev) => prev.map((o) => (o.id === oppId ? updated : o)));
      if (selectedOppForDetail?.id === oppId) {
        setSelectedOppForDetail(updated);
        loadHistory(oppId);
      }
      setCloseConfirmData(null);
    } catch (err: any) {
      alert('Error closing opportunity: ' + err.message);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        notes: createForm.notes.trim() || undefined,
        stage: createForm.stage,
        currency: createForm.currency,
        probability: Number(createForm.probability),
        expected_close_date: createForm.expected_close_date || undefined,
      };
      if (createForm.value) payload.value = Number(createForm.value);

      if (createForm.person_id) {
        payload.person_ids = [{ person_id: createForm.person_id, role: createForm.person_role || 'decision_maker' }];
      }
      if (createForm.company_id) {
        payload.company_ids = [{ company_id: createForm.company_id, role: createForm.company_role || 'client' }];
      }

      await apiFetch('/api/v1/opportunities', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        notes: '',
        stage: 'prospect',
        value: '',
        currency: 'USD',
        probability: 50,
        expected_close_date: '',
        person_id: '',
        person_role: 'decision_maker',
        company_id: '',
        company_role: 'client',
      });
      loadOpps();
    } catch (err: any) {
      alert('Error creating opportunity: ' + err.message);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppForDetail) return;
    setSavingEdit(true);
    try {
      const payload: any = {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        stage: editForm.stage,
        currency: editForm.currency,
        probability: editForm.probability !== '' ? Number(editForm.probability) : undefined,
        expected_close_date: editForm.expected_close_date || null,
        notes: editForm.notes || null,
      };
      if (editForm.value !== '') {
        payload.value = Number(editForm.value);
      } else {
        payload.value = null;
      }

      const updated = await apiFetch<Opportunity>(`/api/v1/opportunities/${selectedOppForDetail.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setSelectedOppForDetail(updated);
      setOpps((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      loadHistory(updated.id);
      alert('Opportunity updated successfully!');
    } catch (err: any) {
      alert('Error saving changes: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppForDetail || !newHistoryNote.trim()) return;
    setSavingNote(true);
    try {
      await apiFetch(`/api/v1/opportunities/${selectedOppForDetail.id}/history/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: newHistoryNote.trim() }),
      });
      setNewHistoryNote('');
      loadHistory(selectedOppForDetail.id);
    } catch (err: any) {
      alert('Error adding note: ' + err.message);
    } finally {
      setSavingNote(false);
    }
  };

  const handleAttachPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppForDetail || !attachPersonForm.person_id) return;
    setAttachingPerson(true);
    try {
      const updated = await apiFetch<Opportunity>(`/api/v1/opportunities/${selectedOppForDetail.id}/persons`, {
        method: 'POST',
        body: JSON.stringify(attachPersonForm),
      });
      setSelectedOppForDetail(updated);
      setOpps((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setAttachPersonForm({ person_id: '', role: 'decision_maker' });
      loadHistory(updated.id);
    } catch (err: any) {
      alert('Error attaching person: ' + err.message);
    } finally {
      setAttachingPerson(false);
    }
  };

  const handleDetachPerson = async (personId: string) => {
    if (!selectedOppForDetail) return;
    if (!confirm('Unlink this contact from the opportunity?')) return;
    try {
      const updated = await apiFetch<Opportunity>(`/api/v1/opportunities/${selectedOppForDetail.id}/persons/${personId}`, {
        method: 'DELETE',
      });
      setSelectedOppForDetail(updated);
      setOpps((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      loadHistory(updated.id);
    } catch (err: any) {
      alert('Error unlinking person: ' + err.message);
    }
  };

  const handleAttachCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppForDetail || !attachCompanyForm.company_id) return;
    setAttachingCompany(true);
    try {
      const updated = await apiFetch<Opportunity>(`/api/v1/opportunities/${selectedOppForDetail.id}/companies`, {
        method: 'POST',
        body: JSON.stringify(attachCompanyForm),
      });
      setSelectedOppForDetail(updated);
      setOpps((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setAttachCompanyForm({ company_id: '', role: 'client' });
      loadHistory(updated.id);
    } catch (err: any) {
      alert('Error attaching company: ' + err.message);
    } finally {
      setAttachingCompany(false);
    }
  };

  const handleDetachCompany = async (companyId: string) => {
    if (!selectedOppForDetail) return;
    if (!confirm('Unlink this company from the opportunity?')) return;
    try {
      const updated = await apiFetch<Opportunity>(`/api/v1/opportunities/${selectedOppForDetail.id}/companies/${companyId}`, {
        method: 'DELETE',
      });
      setSelectedOppForDetail(updated);
      setOpps((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      loadHistory(updated.id);
    } catch (err: any) {
      alert('Error unlinking company: ' + err.message);
    }
  };

  const handleDeleteOpp = async (oppId: string) => {
    if (!confirm('Are you sure you want to delete this opportunity permanently?')) return;
    try {
      await apiFetch(`/api/v1/opportunities/${oppId}`, { method: 'DELETE' });
      setSelectedOppForDetail(null);
      setOpps((prev) => prev.map((o) => o).filter((o) => o.id !== oppId));
    } catch (err: any) {
      alert('Error deleting opportunity: ' + err.message);
    }
  };

  // Pipeline Metric Calculations
  const activeOpps = opps.filter((o) => !['closed_won', 'closed_lost'].includes(o.stage));
  const totalActiveValue = activeOpps.reduce((sum, o) => sum + (o.value ? Number(o.value) : 0), 0);
  const weightedPipelineValue = activeOpps.reduce(
    (sum, o) => sum + ((o.value ? Number(o.value) : 0) * (o.probability || 0)) / 100,
    0
  );
  const wonOpps = opps.filter((o) => o.stage === 'closed_won');
  const lostOpps = opps.filter((o) => o.stage === 'closed_lost');
  const closedCount = wonOpps.length + lostOpps.length;
  const winRate = closedCount > 0 ? Math.round((wonOpps.length / closedCount) * 100) : 0;

  // Filtered list
  const filteredOpps = opps.filter((opp) => {
    if (stageFilter !== 'all' && opp.stage !== stageFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = opp.title.toLowerCase().includes(q);
      const matchDesc = (opp.description || '').toLowerCase().includes(q);
      const matchPerson = (opp.persons || []).some((p) => (p.person_name || '').toLowerCase().includes(q));
      const matchCompany = (opp.companies || []).some((c) => (c.company_name || '').toLowerCase().includes(q));
      return matchTitle || matchDesc || matchPerson || matchCompany;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💼</span>
            <h1 className="text-2xl font-black tracking-tight text-white">Opportunities Pipeline</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Interactive Kanban
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            Track revenue deals, manage contacts & organizations, and advance stages via drag & drop.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition duration-150"
          >
            <span>✨</span>
            <span>New Opportunity</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Active Pipeline</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            ${totalActiveValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{activeOpps.length} active deals</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-indigo-600 tracking-wider">Weighted Forecast</div>
          <div className="text-xl sm:text-2xl font-bold text-indigo-700 mt-1">
            ${weightedPipelineValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">confidence-adjusted</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-emerald-600 tracking-wider">Won Revenue</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
            ${wonOpps.reduce((sum, o) => sum + (o.value ? Number(o.value) : 0), 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{wonOpps.length} deals won</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Win Rate</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {winRate}%
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{wonOpps.length} won / {closedCount} closed</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search deals, contacts, companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStageFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              stageFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Stages ({opps.length})
          </button>
          {STAGES.map((s) => {
            const count = opps.filter((o) => o.stage === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => setStageFilter(stageFilter === s.id ? 'all' : s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  stageFilter === s.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Interactive Kanban Board */}
      {loading ? (
        <div className="flex justify-center items-center py-24 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mr-3" />
          <span>Loading pipeline opportunities...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {STAGES.filter((s) => stageFilter === 'all' || stageFilter === s.id).map((stage) => {
            const stageOpps = filteredOpps.filter((o) => o.stage === stage.id);
            const stageSubtotal = stageOpps.reduce((sum, o) => sum + (o.value ? Number(o.value) : 0), 0);
            const isHovered = dragOverStage === stage.id;

            return (
              <div
                key={stage.id}
                data-testid={`kanban-column-${stage.id}`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={(e) => handleDragLeave(e, stage.id)}
                onDrop={(e) => handleDrop(e, stage.id)}
                className={`rounded-2xl border transition-all duration-200 flex flex-col min-h-[520px] ${
                  isHovered
                    ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-400/40 shadow-md'
                    : stage.color
                }`}
              >
                {/* Column Header */}
                <div className={`p-3.5 rounded-t-2xl border-b flex items-center justify-between ${stage.headerBg}`}>
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                    <span>{stage.icon}</span>
                    <span>{stage.label}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-white/80 text-slate-800 shadow-xs">
                    {stageOpps.length}
                  </span>
                </div>

                {/* Subtotal */}
                <div className="px-3.5 py-2 text-[11px] font-semibold text-slate-500 border-b bg-white/40 flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-700">
                    ${stageSubtotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="p-2.5 space-y-3 flex-1 overflow-y-auto max-h-[720px]">
                  {stageOpps.map((opp) => {
                    const isDragging = draggedOppId === opp.id;
                    const primaryPerson = opp.persons && opp.persons.length > 0 ? opp.persons[0] : null;
                    const primaryCompany = opp.companies && opp.companies.length > 0 ? opp.companies[0] : null;

                    return (
                      <div
                        key={opp.id}
                        data-testid={`opp-card-${opp.id}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, opp.id)}
                        onClick={() => handleOpenDetail(opp)}
                        className={`bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition cursor-grab active:cursor-grabbing group ${
                          isDragging ? 'opacity-40 scale-95 border-dashed border-indigo-400' : ''
                        }`}
                      >
                        {/* Title & Value */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition leading-snug line-clamp-2">
                            {opp.title}
                          </h4>
                          {opp.value !== null && opp.value !== undefined && (
                            <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              {opp.currency || '$'} {Number(opp.value).toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Description Preview */}
                        {opp.description && (
                          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                            {opp.description}
                          </p>
                        )}

                        {/* Confidence Level meter */}
                        {opp.probability !== null && opp.probability !== undefined && (
                          <div className="mt-3">
                            <div className="flex justify-between text-[10px] text-slate-400 font-medium mb-1">
                              <span>Confidence Level</span>
                              <span className="font-bold text-slate-700">{opp.probability}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  opp.probability >= 70
                                    ? 'bg-emerald-500'
                                    : opp.probability >= 40
                                    ? 'bg-indigo-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${opp.probability}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Attached Contacts & Company */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5 text-xs">
                          {primaryPerson && (
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate">
                              <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                                👤
                              </span>
                              <Link
                                href={`/persons/${primaryPerson.person_id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="truncate hover:text-indigo-600 hover:underline"
                              >
                                {primaryPerson.person_name || 'Attached Contact'}
                              </Link>
                              {primaryPerson.role && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0 capitalize">
                                  {primaryPerson.role.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                          )}

                          {primaryCompany && (
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate">
                              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                                🏢
                              </span>
                              <Link
                                href={`/companies/${primaryCompany.company_id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="truncate hover:text-blue-600 hover:underline"
                              >
                                {primaryCompany.company_name || 'Attached Org'}
                              </Link>
                            </div>
                          )}
                        </div>

                        {/* Card Footer: Close Date & Quick Advance */}
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          {opp.expected_close_date ? (
                            <span className="flex items-center gap-1">
                              <span>📅</span>
                              <span>{opp.expected_close_date}</span>
                            </span>
                          ) : (
                            <span />
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(opp);
                            }}
                            className="text-xs text-indigo-600 font-semibold hover:text-indigo-800"
                          >
                            Details →
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {stageOpps.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs">
                      <span>Drop deals here</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Opportunity Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Create New Opportunity</h3>
                <p className="text-xs text-slate-500">Record a prospective deal in the revenue pipeline</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
                <input
                  required
                  placeholder="e.g. Acme Corp Enterprise Analytics Expansion"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={4}
                  placeholder="Describe scope, objectives, requirements, and strategic goals..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full min-h-[90px] px-3.5 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs leading-relaxed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Internal Notes</label>
                  <span className="text-[11px] text-slate-400">Meeting minutes, context, or discussion transcript</span>
                </div>
                <textarea
                  rows={6}
                  placeholder="Initial discovery notes, context, internal team observations, or call minutes..."
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full min-h-[130px] px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs leading-relaxed bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stage</label>
                  <select
                    value={createForm.stage}
                    onChange={(e) => setCreateForm({ ...createForm, stage: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon} {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deal Value</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 75000"
                    value={createForm.value}
                    onChange={(e) => setCreateForm({ ...createForm, value: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                  <select
                    value={createForm.currency}
                    onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CHF">CHF (CHF)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confidence Level ({createForm.probability}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={createForm.probability}
                    onChange={(e) => setCreateForm({ ...createForm, probability: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={createForm.expected_close_date}
                    onChange={(e) => setCreateForm({ ...createForm, expected_close_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Attach Person & Company */}
              <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Attached Contact</label>
                  <select
                    value={createForm.person_id}
                    onChange={(e) => setCreateForm({ ...createForm, person_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
                  >
                    <option value="">-- None / Select Person --</option>
                    {availablePersons.map((p) => {
                      const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.primary_email || p.id;
                      return (
                        <option key={p.id} value={p.id}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Attached Company</label>
                  <select
                    value={createForm.company_id}
                    onChange={(e) => setCreateForm({ ...createForm, company_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
                  >
                    <option value="">-- None / Select Company --</option>
                    {availableCompanies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.domain ? `(${c.domain})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md"
                >
                  Create Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Outcome Modal */}
      {closeConfirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {closeConfirmData.outcome === 'closed_won' ? '🏆' : '❌'}
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Mark Opportunity as {closeConfirmData.outcome === 'closed_won' ? 'Closed Won' : 'Closed Lost'}
                </h3>
                <p className="text-xs text-slate-500">
                  {closeConfirmData.outcome === 'closed_won'
                    ? 'Congratulations! Confidence level will be set to 100%.'
                    : 'The opportunity will be archived with 0% confidence level.'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Closure Notes / Feedback</label>
              <textarea
                rows={3}
                placeholder="Reason for win/loss, key takeaways, or next steps..."
                value={closeConfirmData.notes}
                onChange={(e) => setCloseConfirmData({ ...closeConfirmData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCloseConfirmData(null)}
                className="px-3 py-1.5 border rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-md ${
                  closeConfirmData.outcome === 'closed_won'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                Confirm {closeConfirmData.outcome === 'closed_won' ? 'Won' : 'Lost'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opportunity Detail Drawer / Modal */}
      {selectedOppForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b bg-slate-50 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                    {selectedOppForDetail.stage.replace('_', ' ')}
                  </span>
                  {selectedOppForDetail.value !== null && selectedOppForDetail.value !== undefined && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {selectedOppForDetail.currency || '$'} {Number(selectedOppForDetail.value).toLocaleString()}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1 leading-snug">
                  {selectedOppForDetail.title}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteOpp(selectedOppForDetail.id)}
                  title="Delete Opportunity"
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 text-sm"
                >
                  🗑️
                </button>
                <button
                  onClick={() => setSelectedOppForDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 text-base"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b px-5 bg-white text-xs font-semibold">
              <button
                onClick={() => setDetailTab('overview')}
                className={`py-3 px-4 border-b-2 transition ${
                  detailTab === 'overview'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                📋 Overview & Edit
              </button>
              <button
                onClick={() => setDetailTab('contacts')}
                className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
                  detailTab === 'contacts'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>👥 Attached People & Orgs</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px]">
                  {(selectedOppForDetail.persons?.length || 0) + (selectedOppForDetail.companies?.length || 0)}
                </span>
              </button>
              <button
                onClick={() => setDetailTab('history')}
                className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
                  detailTab === 'history'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>⏱️ History & Activity</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px]">
                  {historyItems.length}
                </span>
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="p-6 overflow-y-auto flex-1 text-sm">
              {/* Tab 1: Overview & Edit */}
              {detailTab === 'overview' && (
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                    <input
                      required
                      value={editForm.title || ''}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={5}
                      placeholder="Opportunity details, strategic objectives, or scope..."
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full min-h-[120px] px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Stage</label>
                      <select
                        value={editForm.stage || 'prospect'}
                        onChange={(e) => setEditForm({ ...editForm, stage: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        {STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.icon} {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Value</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.value || ''}
                        onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                      <select
                        value={editForm.currency || 'USD'}
                        onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CHF">CHF (CHF)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Confidence Level ({editForm.probability || 0}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={editForm.probability || 0}
                        onChange={(e) => setEditForm({ ...editForm, probability: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Close Date</label>
                      <input
                        type="date"
                        value={editForm.expected_close_date || ''}
                        onChange={(e) => setEditForm({ ...editForm, expected_close_date: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Internal Notes</label>
                      <span className="text-[11px] text-slate-400">Expanded workspace for meeting notes & transcripts</span>
                    </div>
                    <textarea
                      rows={10}
                      placeholder="Detailed deal notes, meeting minutes, negotiation history, key discussion points, or customer quotes..."
                      value={editForm.notes || ''}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="w-full min-h-[220px] px-3.5 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs leading-relaxed bg-slate-50/50 font-mono sm:font-sans"
                    />
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md disabled:opacity-50"
                    >
                      {savingEdit ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 2: Attached People & Companies */}
              {detailTab === 'contacts' && (
                <div className="space-y-6">
                  {/* Attached People */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center justify-between">
                      <span>👤 Attached Contacts</span>
                      <span className="text-xs text-slate-500 font-normal">
                        {selectedOppForDetail.persons?.length || 0} attached
                      </span>
                    </h3>

                    <div className="space-y-2">
                      {(selectedOppForDetail.persons || []).map((p) => (
                        <div
                          key={p.person_id}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                              {p.person_name ? p.person_name.charAt(0).toUpperCase() : 'P'}
                            </div>
                            <div>
                              <Link
                                href={`/persons/${p.person_id}`}
                                className="font-semibold text-slate-900 hover:text-indigo-600 hover:underline"
                              >
                                {p.person_name || 'Contact'}
                              </Link>
                              <div className="text-xs text-slate-400">{p.person_email || 'No email'}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium capitalize">
                              {(p.role || 'contact').replace('_', ' ')}
                            </span>
                            <button
                              onClick={() => handleDetachPerson(p.person_id)}
                              className="text-xs text-slate-400 hover:text-red-600 p-1"
                              title="Unlink contact"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}

                      {(!selectedOppForDetail.persons || selectedOppForDetail.persons.length === 0) && (
                        <div className="text-xs text-slate-400 italic p-3 text-center border border-dashed rounded-xl">
                          No contacts attached to this deal yet.
                        </div>
                      )}
                    </div>

                    {/* Attach Contact Form */}
                    <form onSubmit={handleAttachPerson} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                      <div className="text-xs font-semibold text-slate-800">+ Link Person to Opportunity</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <select
                          required
                          value={attachPersonForm.person_id}
                          onChange={(e) => setAttachPersonForm({ ...attachPersonForm, person_id: e.target.value })}
                          className="px-2.5 py-1.5 border rounded-lg focus:outline-none"
                        >
                          <option value="">-- Choose Person --</option>
                          {availablePersons.map((p) => {
                            const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.primary_email || p.id;
                            return (
                              <option key={p.id} value={p.id}>
                                {name}
                              </option>
                            );
                          })}
                        </select>

                        <select
                          value={attachPersonForm.role}
                          onChange={(e) => setAttachPersonForm({ ...attachPersonForm, role: e.target.value })}
                          className="px-2.5 py-1.5 border rounded-lg focus:outline-none"
                        >
                          <option value="decision_maker">Decision Maker</option>
                          <option value="champion">Champion</option>
                          <option value="influencer">Influencer</option>
                          <option value="stakeholder">Stakeholder</option>
                          <option value="evaluator">Evaluator</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={attachingPerson || !attachPersonForm.person_id}
                        className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                      >
                        {attachingPerson ? 'Linking...' : 'Attach Person'}
                      </button>
                    </form>
                  </div>

                  {/* Attached Companies */}
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center justify-between">
                      <span>🏢 Attached Organizations</span>
                      <span className="text-xs text-slate-500 font-normal">
                        {selectedOppForDetail.companies?.length || 0} attached
                      </span>
                    </h3>

                    <div className="space-y-2">
                      {(selectedOppForDetail.companies || []).map((c) => (
                        <div
                          key={c.company_id}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                              🏢
                            </div>
                            <div>
                              <Link
                                href={`/companies/${c.company_id}`}
                                className="font-semibold text-slate-900 hover:text-blue-600 hover:underline"
                              >
                                {c.company_name || 'Organization'}
                              </Link>
                              <div className="text-xs text-slate-400">{c.company_domain || 'No domain'}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium capitalize">
                              {(c.role || 'client').replace('_', ' ')}
                            </span>
                            <button
                              onClick={() => handleDetachCompany(c.company_id)}
                              className="text-xs text-slate-400 hover:text-red-600 p-1"
                              title="Unlink company"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}

                      {(!selectedOppForDetail.companies || selectedOppForDetail.companies.length === 0) && (
                        <div className="text-xs text-slate-400 italic p-3 text-center border border-dashed rounded-xl">
                          No organizations attached to this deal yet.
                        </div>
                      )}
                    </div>

                    {/* Attach Company Form */}
                    <form onSubmit={handleAttachCompany} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                      <div className="text-xs font-semibold text-slate-800">+ Link Company to Opportunity</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <select
                          required
                          value={attachCompanyForm.company_id}
                          onChange={(e) => setAttachCompanyForm({ ...attachCompanyForm, company_id: e.target.value })}
                          className="px-2.5 py-1.5 border rounded-lg focus:outline-none"
                        >
                          <option value="">-- Choose Company --</option>
                          {availableCompanies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.domain ? `(${c.domain})` : ''}
                            </option>
                          ))}
                        </select>

                        <select
                          value={attachCompanyForm.role}
                          onChange={(e) => setAttachCompanyForm({ ...attachCompanyForm, role: e.target.value })}
                          className="px-2.5 py-1.5 border rounded-lg focus:outline-none"
                        >
                          <option value="client">Client</option>
                          <option value="partner">Partner</option>
                          <option value="vendor">Vendor</option>
                          <option value="prospect">Prospect</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={attachingCompany || !attachCompanyForm.company_id}
                        className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                      >
                        {attachingCompany ? 'Linking...' : 'Attach Company'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Tab 3: History & Activity Timeline */}
              {detailTab === 'history' && (
                <div className="space-y-5">
                  {/* Note Composer */}
                  <form onSubmit={handleAddNote} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-semibold text-slate-800">
                      📝 Log Meeting Note / Activity
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Add an update, call notes, or customer response..."
                      value={newHistoryNote}
                      onChange={(e) => setNewHistoryNote(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingNote || !newHistoryNote.trim()}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                      >
                        {savingNote ? 'Logging...' : 'Log Activity'}
                      </button>
                    </div>
                  </form>

                  {/* History List */}
                  {historyLoading ? (
                    <div className="text-center py-8 text-slate-400 text-xs">Loading activity timeline...</div>
                  ) : (
                    <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
                      {historyItems.map((h) => (
                        <div key={h.id} className="relative pl-6">
                          {/* Dot / Icon */}
                          <div className="absolute -left-2.5 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center text-[10px]">
                            {h.action?.icon || '⏱️'}
                          </div>

                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900">
                                {h.action?.name || h.action_id}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(h.created_at).toLocaleString()}
                              </span>
                            </div>

                            {h.summary && <p className="text-xs text-slate-600">{h.summary}</p>}

                            {/* Diffs display */}
                            {h.changes && Object.keys(h.changes).length > 0 && (
                              <div className="mt-2 text-[11px] bg-slate-50 p-2 rounded border border-slate-100 space-y-1">
                                {Object.entries(h.changes).map(([k, val]: [string, any]) => (
                                  <div key={k} className="flex items-center gap-1">
                                    <span className="font-medium text-slate-500 capitalize">{k}:</span>
                                    {typeof val === 'object' && val !== null && 'old' in val && 'new' in val ? (
                                      <span>
                                        <span className="line-through text-rose-500">{String(val.old)}</span>
                                        {' → '}
                                        <span className="font-semibold text-emerald-600">{String(val.new)}</span>
                                      </span>
                                    ) : (
                                      <span className="font-semibold text-slate-700">{JSON.stringify(val)}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {historyItems.length === 0 && (
                        <div className="text-xs text-slate-400 pl-6 italic">No history records found.</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
