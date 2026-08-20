'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    stage: 'new',
    source: 'manual',
    person_id: '',
    company_id: '',
    intent_signals: '',
  });

  const loadLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const stageParam = stageFilter ? `&stage=${stageFilter}` : '';
      const res = await apiFetch<ApiResponse<any[]>>(`/api/v1/leads?page_size=50${stageParam}`);
      setLeads(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [stageFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        title: form.title,
        stage: form.stage,
        source: form.source,
      };
      if (form.person_id.trim()) payload.person_id = form.person_id.trim();
      if (form.company_id.trim()) payload.company_id = form.company_id.trim();

      await apiFetch('/api/v1/leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowCreate(false);
      setForm({
        title: '',
        stage: 'new',
        source: 'manual',
        person_id: '',
        company_id: '',
        intent_signals: '',
      });
      loadLeads();
    } catch (err: any) {
      alert('Error creating lead: ' + err.message);
    }
  };

  const handleConvert = async (leadId: string, leadTitle: string) => {
    const oppTitle = prompt('Enter title for converted opportunity:', leadTitle || 'New Deal');
    if (!oppTitle) return;
    try {
      await apiFetch(`/api/v1/leads/${leadId}/convert`, {
        method: 'POST',
        body: JSON.stringify({
          opportunity_title: oppTitle,
          stage: 'prospect',
        }),
      });
      alert('Lead successfully converted to Opportunity!');
      loadLeads();
    } catch (err: any) {
      alert('Error converting lead: ' + err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Leads</h1>
          <p className="text-sm text-slate-500">Inbound leads and conversion pipeline</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded text-sm font-medium"
        >
          {showCreate ? 'Close Form' : '+ New Lead'}
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <h2 className="text-base font-semibold mb-3 text-slate-800">Create New Lead</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Lead Title *</label>
              <input
                required
                placeholder="e.g. Inbound inquiry from webinar"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Stage</label>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="disqualified">Disqualified</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Person ID (Optional UUID)</label>
              <input
                placeholder="UUID"
                value={form.person_id}
                onChange={(e) => setForm({ ...form, person_id: e.target.value })}
                className="w-full px-3 py-1.5 border rounded font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Company ID (Optional UUID)</label>
              <input
                placeholder="UUID"
                value={form.company_id}
                onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                className="w-full px-3 py-1.5 border rounded font-mono text-xs"
              />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 border rounded text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-medium"
              >
                Save Lead
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 border rounded text-sm bg-white"
        >
          <option value="">All Stages</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="converted">Converted</option>
          <option value="disqualified">Disqualified</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Stage</th>
              <th className="p-3">Source</th>
              <th className="p-3">Person / Company</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  Loading leads...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No leads found.
                </td>
              </tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-900">{l.title || 'Untitled Lead'}</td>
                  <td className="p-3">
                    <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded border uppercase">
                      {l.stage}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{l.source}</td>
                  <td className="p-3 text-xs text-slate-500 font-mono">
                    {l.person_id && <div>Person: {l.person_id}</div>}
                    {l.company_id && <div>Company: {l.company_id}</div>}
                  </td>
                  <td className="p-3 text-right">
                    {l.stage !== 'converted' && (
                      <button
                        onClick={() => handleConvert(l.id, l.title)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded font-medium"
                      >
                        Convert to Opp →
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
