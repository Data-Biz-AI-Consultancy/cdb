'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';
import { COMMON_CURRENCIES, formatMoney, getCurrencySymbol } from '@/lib/currency';
import SearchableCombobox, { ComboboxOption } from '@/components/SearchableCombobox';
import { EngagementItem } from '../page';

interface ActivityItem {
  id: string;
  type: string;
  source: string;
  source_id?: string | null;
  occurred_at: string;
  title?: string | null;
  summary?: string | null;
  raw_content?: string | null;
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
  const [actSummary, setActSummary] = useState('');
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
        // Populate edit form
        setEditTitle(eng.title);
        setEditStatus(eng.status);
        setEditType(eng.engagement_type);
        setEditCurrency(eng.currency || 'USD');
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
        summary: actSummary.trim() || null,
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
        setSuccessMessage('Activity / meeting note recorded.');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to log activity.');
    }
  };

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
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>✓ {successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">✕</button>
        </div>
      )}

      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/engagements" className="hover:text-slate-800">
          Client Engagements
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-medium truncate max-w-sm">{engagement.title}</span>
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

            <h1 className="text-2xl font-bold text-slate-900 mt-2">{engagement.title}</h1>

            <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
              <span>Client:</span>
              {engagement.company ? (
                <Link
                  href={`/companies/${engagement.company_id}`}
                  className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  🏢 {engagement.company.name}
                </Link>
              ) : (
                <span className="font-semibold text-slate-800">Client Org</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLogActivityModal(true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition"
            >
              📝 Log Meeting / Touchpoint
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
            >
              ✏️ Edit Engagement
            </button>
          </div>
        </div>

        {/* Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
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

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block mb-1">Total Contract Budget</span>
            <span className="text-sm font-bold text-slate-900">
              {engagement.total_value
                ? formatMoney(engagement.total_value, engagement.currency, { includeCode: true })
                : 'Fixed / Open'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block mb-1">Delivery Timeline</span>
            <span className="text-sm font-bold text-slate-900">
              {engagement.start_date || 'Start'} → {engagement.expected_end_date || 'Ongoing'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block mb-1">Time Remaining</span>
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

      {/* Main Grid: Left column for Contract & Contacts, Right column for Activities & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols wide on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract & Terms Hub */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📜</span> Signed Contract & Terms & Conditions
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold capitalize">
                ✓ {engagement.contract_status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block mb-1">Contract Reference / Link</span>
                <span className="font-mono font-bold text-slate-900 break-all">
                  {engagement.contract_ref || 'No contract reference specified'}
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
                <p className="text-xs text-slate-500">Key stakeholders, sponsors, and delivery leads for this engagement.</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        {/* Right Column: Activity Feed / Notion Meeting Notes */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>📝</span> Activity Timeline
                </h2>
                <p className="text-xs text-slate-500">Notion notes, meetings & updates.</p>
              </div>
              <button
                onClick={() => setShowLogActivityModal(true)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition"
              >
                + Log
              </button>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No activity logs or Notion meeting notes recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 truncate">
                        {act.title || 'Untitled Touchpoint'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold uppercase shrink-0">
                        {act.source}
                      </span>
                    </div>

                    {act.summary && (
                      <p className="text-slate-600 leading-relaxed line-clamp-3">
                        {act.summary}
                      </p>
                    )}

                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="capitalize">{act.type}</span>
                      <span>{new Date(act.occurred_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Rate & Billing Structure</span>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600">Currency:</label>
                    <select
                      value={editCurrency}
                      onChange={(e) => setEditCurrency(e.target.value)}
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

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Rate Type</label>
                    <select
                      value={editRateType}
                      onChange={(e) => setEditRateType(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    >
                      <option value="daily">Daily</option>
                      <option value="hourly">Hourly</option>
                      <option value="monthly">Monthly</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Rate Value ({getCurrencySymbol(editCurrency)})
                    </label>
                    <input
                      type="number"
                      value={editRateValue}
                      onChange={(e) => setEditRateValue(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Total Cap ({getCurrencySymbol(editCurrency)})
                    </label>
                    <input
                      type="number"
                      value={editTotalValue}
                      onChange={(e) => setEditTotalValue(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contract Ref</label>
                  <input
                    type="text"
                    value={editContractRef}
                    onChange={(e) => setEditContractRef(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
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

      {/* Log Activity Modal */}
      {showLogActivityModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Log Engagement Activity / Note</h2>
              <button onClick={() => setShowLogActivityModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleLogActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Notion Sprint Review & Milestone 1 Demo"
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Type</label>
                  <select
                    value={actType}
                    onChange={(e) => setActType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                  >
                    <option value="meeting">Meeting / Notion</option>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="note">Internal Note</option>
                    <option value="whatsapp">WhatsApp</option>
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
                    <option value="manual">Manual</option>
                    <option value="gmail">Gmail</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Summary / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Discussion points, deliverables agreed upon, next steps..."
                  value={actSummary}
                  onChange={(e) => setActSummary(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={actOccurredAt}
                  onChange={(e) => setActOccurredAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
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
                  Log Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
