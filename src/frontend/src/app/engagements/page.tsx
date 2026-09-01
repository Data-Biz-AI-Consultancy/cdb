'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';
import { COMMON_CURRENCIES, formatMoney, getCurrencySymbol } from '@/lib/currency';
import SearchableCombobox, { ComboboxOption } from '@/components/SearchableCombobox';

export interface EngagementPersonItem {
  person_id: string;
  role?: string | null;
  person_name?: string | null;
  person_email?: string | null;
  person_avatar_url?: string | null;
}

export interface EngagementCompanyItem {
  id: string;
  name: string;
  domain?: string | null;
}

export interface EngagementAISummaryActionItem {
  task: string;
  priority: 'high' | 'medium' | 'low';
  suggested_role?: string | null;
}

export interface EngagementAISummaryItem {
  executive_summary: string;
  client_sentiment: 'very_positive' | 'positive' | 'neutral' | 'needs_attention' | 'at_risk';
  sentiment_reasoning: string;
  key_highlights: string[];
  blockers_and_risks: string[];
  action_items: EngagementAISummaryActionItem[];
  activity_count_analyzed: number;
  generated_at: string;
}

export interface EngagementItem {
  id: string;
  title: string;
  company_id: string;
  opportunity_id?: string | null;
  owner_id?: string | null;
  status: 'planning' | 'active' | 'in_delivery' | 'on_hold' | 'completed' | 'cancelled';
  engagement_type: string;
  rate_type: 'hourly' | 'daily' | 'monthly' | 'fixed';
  rate_value?: number | null;
  currency: string;
  total_value?: number | null;
  contract_ref?: string | null;
  contract_status: string;
  signed_at?: string | null;
  terms_and_conditions?: string | null;
  start_date?: string | null;
  expected_end_date?: string | null;
  actual_end_date?: string | null;
  notes?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
  company?: EngagementCompanyItem | null;
  persons?: EngagementPersonItem[];
  is_overdue?: boolean;
  days_remaining?: number | null;
  days_elapsed?: number | null;
  recent_activity?: string | null;
  ai_summary?: EngagementAISummaryItem | null;
}

interface CompanyOption {
  id: string;
  name: string;
}

interface PersonOption {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email?: string | null;
}

export default function EngagementsPage() {
  const [engagements, setEngagements] = useState<EngagementItem[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [persons, setPersons] = useState<PersonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCompanyId, setFormCompanyId] = useState('');
  const [formPersonId, setFormPersonId] = useState('');
  const [formPersonRole, setFormPersonRole] = useState('client_lead');
  const [formType, setFormType] = useState('consultancy');
  const [formStatus, setFormStatus] = useState<'planning' | 'active' | 'in_delivery' | 'on_hold' | 'completed' | 'cancelled'>('active');
  const [formRateType, setFormRateType] = useState<'hourly' | 'daily' | 'monthly' | 'fixed'>('daily');
  const [formRateValue, setFormRateValue] = useState('1500');
  const [formCurrency, setFormCurrency] = useState('EUR');
  const [formTotalValue, setFormTotalValue] = useState('45000');
  const [formContractRef, setFormContractRef] = useState('');
  const [formContractStatus, setFormContractStatus] = useState('signed');
  const [formSignedAt, setFormSignedAt] = useState(new Date().toISOString().split('T')[0]);
  const [formTerms, setFormTerms] = useState('Net 30 days payment. 40 hours/week delivery cap. IP assigned on receipt of payment.');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formExpectedEndDate, setFormExpectedEndDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [engRes, compRes, persRes] = await Promise.allSettled([
        apiFetch<ApiResponse<EngagementItem[]>>('/api/v1/engagements?limit=100'),
        apiFetch<ApiResponse<CompanyOption[]>>('/api/v1/companies?limit=100'),
        apiFetch<ApiResponse<PersonOption[]>>('/api/v1/persons?limit=100'),
      ]);

      if (engRes.status === 'fulfilled' && engRes.value?.data) {
        setEngagements(engRes.value.data);
      }
      if (compRes.status === 'fulfilled' && compRes.value?.data) {
        setCompanies(compRes.value.data);
        if (compRes.value.data.length > 0 && !formCompanyId) {
          setFormCompanyId(compRes.value.data[0].id);
        }
      }
      if (persRes.status === 'fulfilled' && persRes.value?.data) {
        setPersons(persRes.value.data);
      }
    } catch (err: any) {
      console.error('Failed loading engagements data:', err);
      setError('Unable to load engagements. Please check network connection.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchCompanies = async (query: string): Promise<ComboboxOption[]> => {
    try {
      const res = await apiFetch<ApiResponse<CompanyOption[]>>(
        `/api/v1/companies?q=${encodeURIComponent(query)}&limit=50&sort=name&order=asc`
      );
      return (res.data || []).map((c) => ({
        id: c.id,
        label: c.name,
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

  const companyComboboxOptions: ComboboxOption[] = useMemo(() => {
    return companies.map((c) => ({
      id: c.id,
      label: c.name,
    }));
  }, [companies]);

  const personComboboxOptions: ComboboxOption[] = useMemo(() => {
    return persons.map((p) => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.primary_email || p.id;
      return {
        id: p.id,
        label: name,
        subtext: p.primary_email || undefined,
      };
    });
  }, [persons]);

  const handleCreateEngagement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formCompanyId) return;

    setSubmitting(true);
    try {
      const payload: any = {
        title: formTitle.trim(),
        company_id: formCompanyId,
        status: formStatus,
        engagement_type: formType,
        rate_type: formRateType,
        rate_value: formRateValue ? parseFloat(formRateValue) : null,
        currency: formCurrency,
        total_value: formTotalValue ? parseFloat(formTotalValue) : null,
        contract_ref: formContractRef.trim() || null,
        contract_status: formContractStatus,
        signed_at: formSignedAt || null,
        terms_and_conditions: formTerms.trim() || null,
        start_date: formStartDate || null,
        expected_end_date: formExpectedEndDate || null,
        notes: formNotes.trim() || null,
        person_ids: formPersonId ? [{ person_id: formPersonId, role: formPersonRole }] : [],
      };

      const res = await apiFetch<EngagementItem>('/api/v1/engagements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res) {
        setEngagements((prev) => [res, ...prev]);
        setShowAddModal(false);
        // Reset Form
        setFormTitle('');
        setFormContractRef('');
        setFormNotes('');
        setFormExpectedEndDate('');
      }
    } catch (err: any) {
      console.error('Failed creating engagement:', err);
      alert(err.message || 'Failed to create engagement.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return engagements.filter((item) => {
      if (filterType !== 'all' && item.engagement_type.toLowerCase() !== filterType.toLowerCase()) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(q);
        const compMatch = item.company?.name.toLowerCase().includes(q);
        const contractMatch = item.contract_ref?.toLowerCase().includes(q);
        const termsMatch = item.terms_and_conditions?.toLowerCase().includes(q);
        if (!titleMatch && !compMatch && !contractMatch && !termsMatch) return false;
      }
      return true;
    });
  }, [engagements, filterType, filterStatus, searchQuery]);

  const activeCount = engagements.filter((i) => i.status === 'active' || i.status === 'in_delivery').length;
  const totalValue = engagements.reduce((sum, item) => sum + (item.status !== 'completed' && item.status !== 'cancelled' ? Number(item.total_value || 0) : 0), 0);
  const completedCount = engagements.filter((i) => i.status === 'completed').length;
  const onTrackCount = engagements.filter((i) => !i.is_overdue && (i.status === 'active' || i.status === 'in_delivery')).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-100 text-blue-800">
              Active Client Delivery
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Client Engagements</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Active jobs with existing clients, signed contracts, rates, terms & conditions, and meeting notes.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
        >
          <span>+</span> New Engagement
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Engagements</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{activeCount}</span>
            <span className="text-xs text-emerald-600 font-medium font-mono">In delivery</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Contract Value</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">${totalValue.toLocaleString()}</span>
            <span className="text-xs text-slate-500 font-medium">Total Active</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Delivery Health</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{onTrackCount}</span>
            <span className="text-xs text-slate-500">On Track</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Completed Work</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-700">{completedCount}</span>
            <span className="text-xs text-slate-400">Delivered</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div className="relative min-w-[220px] max-w-xs">
            <input
              type="text"
              placeholder="Search engagements, clients, T&Cs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="in_delivery">In Delivery</option>
            <option value="planning">Planning</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="consultancy">Consultancy</option>
            <option value="retainer">Retainer</option>
            <option value="fixed_fee">Fixed Fee</option>
            <option value="time_and_materials">Time & Materials</option>
            <option value="advisory">Advisory</option>
            <option value="full_time">Full Time</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {engagements.length} engagements
        </div>
      </div>

      {/* Engagements List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
          Loading client engagements...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-600 font-medium">No client engagements match your filter criteria.</p>
          <p className="text-xs text-slate-400 mt-1">Add an ongoing client engagement above to track contracts, rates, and meeting notes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((eng) => (
            <div
              key={eng.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 p-5 shadow-sm transition space-y-4"
            >
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      eng.status === 'active'
                        ? 'bg-emerald-500'
                        : eng.status === 'in_delivery'
                        ? 'bg-blue-500'
                        : eng.status === 'planning'
                        ? 'bg-amber-500'
                        : eng.status === 'completed'
                        ? 'bg-purple-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <div>
                    <Link
                      href={`/engagements/${eng.id}`}
                      className="text-base font-bold text-slate-900 hover:text-blue-600 transition"
                    >
                      {eng.title}
                    </Link>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                    {eng.engagement_type.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Rate & Total Value */}
                  <div className="text-right">
                    {eng.rate_value ? (
                      <div className="text-sm font-bold text-slate-900">
                        {formatMoney(eng.rate_value, eng.currency)} <span className="text-xs font-medium text-slate-500">/{eng.rate_type}</span>
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-slate-900">
                        {formatMoney(eng.total_value, eng.currency, { includeCode: true })}
                      </div>
                    )}
                    {eng.total_value && eng.rate_value && (
                      <div className="text-xs text-slate-500">
                        Cap: {formatMoney(eng.total_value, eng.currency, { includeCode: true })}
                      </div>
                    )}
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                      eng.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : eng.status === 'in_delivery'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : eng.status === 'planning'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : eng.status === 'completed'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {eng.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Connections Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block mb-0.5">Client Organization:</span>
                  {eng.company ? (
                    <Link
                      href={`/companies/${eng.company_id}`}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      🏢 {eng.company.name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-slate-700">Client Org</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Connected Person(s):</span>
                  {eng.persons && eng.persons.length > 0 ? (
                    <div className="flex flex-wrap gap-1 items-center">
                      {eng.persons.map((p) => (
                        <Link
                          key={p.person_id}
                          href={`/persons/${p.person_id}`}
                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-700 px-2 py-0.5 rounded text-xs font-medium transition"
                        >
                          <span>👤 {p.person_name || p.person_email}</span>
                          {p.role && <span className="text-slate-400">({p.role.replace('_', ' ')})</span>}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No contacts attached</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Timeline & Deadline:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">
                      {eng.start_date || 'Ongoing'} → {eng.expected_end_date || 'Open-ended'}
                    </span>
                    {eng.is_overdue && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">
                        Overdue
                      </span>
                    )}
                    {eng.days_remaining !== null && eng.days_remaining !== undefined && eng.days_remaining >= 0 && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        ({eng.days_remaining}d left)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contract & T&C Snippet */}
              {(eng.contract_ref || eng.terms_and_conditions) && (
                <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-150">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-slate-800 shrink-0">📜 Contract:</span>
                    {eng.contract_ref ? (
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-900">
                        {eng.contract_ref}
                      </span>
                    ) : (
                      <span className="text-slate-500">Signed Terms</span>
                    )}
                    {eng.terms_and_conditions && (
                      <span className="text-slate-500 truncate italic">
                        — {eng.terms_and_conditions}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium capitalize">
                      ✓ {eng.contract_status}
                    </span>
                    {eng.signed_at && (
                      <span className="text-[11px] text-slate-500">Signed: {eng.signed_at}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Latest Activity / Notion Notes Banner */}
              <div className="bg-blue-50/50 rounded-lg p-3 text-xs flex items-center justify-between gap-2 border border-blue-100">
                <div className="flex items-center gap-2 text-slate-700 truncate">
                  <span className="font-bold text-blue-900 shrink-0">📝 Recent Touchpoint:</span>
                  <span className="truncate">{eng.recent_activity || 'Touchpoint or Notion meeting note logged'}</span>
                </div>
                <Link
                  href={`/engagements/${eng.id}`}
                  className="text-blue-600 hover:text-blue-800 font-semibold shrink-0"
                >
                  View Workspace & Notes →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create Client Engagement</h2>
                <p className="text-xs text-slate-500">Connect client company, signed contract, rates, terms & contacts.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEngagement} className="space-y-4 text-sm">
              {/* Title & Client Company */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Engagement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Data Platform & Cloud Migration Delivery"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SearchableCombobox
                    label="Client Organization"
                    required
                    placeholder="Search and select client company..."
                    searchPlaceholder="Type company name (e.g. Synthetix)..."
                    value={formCompanyId}
                    onChange={(id) => setFormCompanyId(id)}
                    onSearch={handleSearchCompanies}
                    options={companyComboboxOptions}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Engagement Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
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

              {/* Rates & Financials */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Rate & Billing Structure</span>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600">Currency:</label>
                    <select
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value)}
                      className="px-2 py-1 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {COMMON_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Rate Type</label>
                    <select
                      value={formRateType}
                      onChange={(e: any) => setFormRateType(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="daily">Daily Rate</option>
                      <option value="hourly">Hourly Rate</option>
                      <option value="monthly">Monthly Retainer</option>
                      <option value="fixed">Fixed Price</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Rate Amount ({getCurrencySymbol(formCurrency)})
                    </label>
                    <input
                      type="number"
                      placeholder="1500"
                      value={formRateValue}
                      onChange={(e) => setFormRateValue(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Total Cap ({getCurrencySymbol(formCurrency)})
                    </label>
                    <input
                      type="number"
                      placeholder="45000"
                      value={formTotalValue}
                      onChange={(e) => setFormTotalValue(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Signed Contract & Terms & Conditions */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Contract & Terms</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Contract ID / Link / Doc Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. MSA-2026-088 or https://notion.so/..."
                      value={formContractRef}
                      onChange={(e) => setFormContractRef(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Contract Status</label>
                    <select
                      value={formContractStatus}
                      onChange={(e) => setFormContractStatus(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="signed">Signed</option>
                      <option value="pending_signature">Pending Signature</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Signed Date</label>
                  <input
                    type="date"
                    value={formSignedAt}
                    onChange={(e) => setFormSignedAt(e.target.value)}
                    className="w-full sm:w-1/2 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Terms & Conditions (T&C)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Net 30 days payment. 40 hours/week delivery cap. IP assigned on receipt of payment."
                    value={formTerms}
                    onChange={(e) => setFormTerms(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Contact Person & Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SearchableCombobox
                    label="Primary Contact Person"
                    placeholder="Search client contact..."
                    searchPlaceholder="Type contact name or email..."
                    value={formPersonId}
                    onChange={(id) => setFormPersonId(id)}
                    onSearch={handleSearchPersons}
                    options={personComboboxOptions}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Contact Role
                  </label>
                  <select
                    value={formPersonRole}
                    onChange={(e) => setFormPersonRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                  >
                    <option value="client_lead">Client Lead / Sponsor</option>
                    <option value="technical_contact">Technical Contact</option>
                    <option value="stakeholder">Stakeholder</option>
                    <option value="delivery_lead">Delivery Lead</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Expected End Date
                  </label>
                  <input
                    type="date"
                    value={formExpectedEndDate}
                    onChange={(e) => setFormExpectedEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Engagement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
