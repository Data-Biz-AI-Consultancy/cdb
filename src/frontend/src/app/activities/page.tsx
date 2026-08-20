'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiResponse } from '@/lib/api';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    type: 'meeting',
    summary: '',
    source: 'manual',
    person_id: '',
    company_id: '',
  });

  const loadActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const typeParam = typeFilter ? `&activity_type=${typeFilter}` : '';
      const res = await apiFetch<ApiResponse<any[]>>(`/api/v1/activities?page_size=50${typeParam}`);
      setActivities(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [typeFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        title: form.title,
        type: form.type,
        summary: form.summary,
        source: form.source,
      };
      if (form.person_id.trim()) payload.person_id = form.person_id.trim();
      if (form.company_id.trim()) payload.company_id = form.company_id.trim();

      await apiFetch('/api/v1/activities', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowCreate(false);
      setForm({
        title: '',
        type: 'meeting',
        summary: '',
        source: 'manual',
        person_id: '',
        company_id: '',
      });
      loadActivities();
    } catch (err: any) {
      alert('Error creating activity: ' + err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Activities Feed</h1>
          <p className="text-sm text-slate-500">Chronological interactions log</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded text-sm font-medium"
        >
          {showCreate ? 'Close Form' : '+ Log Activity'}
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <h2 className="text-base font-semibold mb-3 text-slate-800">Log New Activity</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
              <input
                required
                placeholder="e.g. Intro Call with Alice"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              >
                <option value="meeting">Meeting</option>
                <option value="email">Email</option>
                <option value="linkedin_message">LinkedIn Message</option>
                <option value="call">Phone Call</option>
                <option value="note">Note</option>
                <option value="whatsapp">WhatsApp</option>
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
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Summary / Notes</label>
              <textarea
                rows={3}
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
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
                Save Activity
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded text-sm bg-white"
        >
          <option value="">All Activity Types</option>
          <option value="meeting">Meeting</option>
          <option value="email">Email</option>
          <option value="linkedin_message">LinkedIn Message</option>
          <option value="call">Call</option>
          <option value="note">Note</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="p-6 text-center text-slate-500 bg-white border rounded">
            Loading activities...
          </div>
        ) : activities.length === 0 ? (
          <div className="p-6 text-center text-slate-500 bg-white border rounded">
            No activity logs found.
          </div>
        ) : (
          activities.map((a) => (
            <div key={a.id} className="bg-white p-4 border rounded-lg shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-semibold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded mr-2 border">
                    {a.type}
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">{a.title || 'Untitled Activity'}</span>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(a.occurred_at || a.created_at).toLocaleString()}
                </span>
              </div>
              {a.summary && <p className="text-sm text-slate-700 mt-2">{a.summary}</p>}
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span>Source: <strong className="text-slate-700">{a.source}</strong></span>
                {a.person_id && <span>Person: <span className="font-mono">{a.person_id}</span></span>}
                {a.company_id && <span>Company: <span className="font-mono">{a.company_id}</span></span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
