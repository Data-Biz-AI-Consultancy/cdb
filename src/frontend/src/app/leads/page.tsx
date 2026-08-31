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
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Modals state
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
      params.append('limit', '100');
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
  }, [stageFilter, sourceFilter, signalFilter, sortOption, searchQuery]);

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

  // Stats calculation
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
          <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">New / Uncontacted</div>
          <div className="text-2xl font-bold text-blue-700 mt-1 flex items-center gap-1.5">
            <span>📬</span>
            <span>{newCount}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Awaiting first outreach</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Active In Pipeline</div>
          <div className="text-2xl font-bold text-amber-700 mt-1 flex items-center gap-1.5">
            <span>⚡</span>
            <span>{inPipelineCount}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Contacted or qualified</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Converted Deals</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
            <span>💼</span>
            <span>{convertedCount}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Converted to active opportunities</div>
        </div>
      </div>

      {/* Filters & Sorting Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Search contact, company, intent, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Stage Filter */}
          <div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
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
              onChange={(e) => setSignalFilter(e.target.value)}
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
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800"
            >
              <option value="created_at:desc">🕒 Most Recent Lead First (Default)</option>
              <option value="created_at:asc">🕒 Oldest Lead First</option>
              <option value="updated_at:desc">🔄 Recently Updated</option>
              <option value="signal_strength:desc">🔥 Signal Strength</option>
              <option value="stage:asc">📊 Stage Flow</option>
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
              onClick={() => setStageFilter(pill.value)}
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
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5 pl-4">Contact & Company</th>
                <th className="p-3.5">Intent / Signals</th>
                <th className="p-3.5 min-w-[280px]">Lead Description / Conversation Notes</th>
                <th className="p-3.5">Stage</th>
                <th className="p-3.5 whitespace-nowrap">Created (Most Recent)</th>
                <th className="p-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <div className="inline-block animate-spin mr-2">⏳</div>
                    Loading leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <div className="text-3xl mb-2">🎯</div>
                    <div className="font-semibold text-slate-800">No leads found</div>
                    <div className="text-xs text-slate-400 mt-1">Try adjusting your search terms or filters</div>
                  </td>
                </tr>
              ) : (
                leads.map((l) => {
                  const leadDesc = l.description || l.notes || '';
                  const hasLongDesc = leadDesc.length > 90;

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition">
                      {/* Contact & Company */}
                      <td className="p-3.5 pl-4 align-top">
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
      </div>

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
