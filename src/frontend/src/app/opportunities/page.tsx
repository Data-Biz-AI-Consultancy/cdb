'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiResponse } from '@/lib/api';

const STAGES = [
  { id: 'prospect', label: 'Prospect' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'closed_won', label: 'Closed Won' },
  { id: 'closed_lost', label: 'Closed Lost' },
];

export default function OpportunitiesPage() {
  const [opps, setOpps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    stage: 'prospect',
    value: '',
    currency: 'USD',
    probability: 50,
  });

  const loadOpps = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ApiResponse<any[]>>('/api/v1/opportunities?page_size=100');
      setOpps(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpps();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        title: form.title,
        stage: form.stage,
        currency: form.currency,
        probability: Number(form.probability),
      };
      if (form.value) payload.value = Number(form.value);

      await apiFetch('/api/v1/opportunities', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowCreate(false);
      setForm({
        title: '',
        stage: 'prospect',
        value: '',
        currency: 'USD',
        probability: 50,
      });
      loadOpps();
    } catch (err: any) {
      alert('Error creating opportunity: ' + err.message);
    }
  };

  const handleStageChange = async (id: string, newStage: string) => {
    try {
      await apiFetch(`/api/v1/opportunities/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: newStage }),
      });
      loadOpps();
    } catch (err: any) {
      alert('Error updating stage: ' + err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Opportunities Pipeline</h1>
          <p className="text-sm text-slate-500">Track and advance deals across sales stages</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded text-sm font-medium"
        >
          {showCreate ? 'Close Form' : '+ New Opportunity'}
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <h2 className="text-base font-semibold mb-3 text-slate-800">Create New Opportunity</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
              <input
                required
                placeholder="e.g. Enterprise License Deal"
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
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Deal Value ({form.currency})</label>
              <input
                type="number"
                placeholder="e.g. 50000"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              />
            </div>
            <div className="md:col-span-3 flex justify-end space-x-2">
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
                Save Opportunity
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
          {error}
        </div>
      )}

      {/* Stage Columns / Pipeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto">
        {STAGES.map((stage) => {
          const stageOpps = opps.filter((o) => o.stage === stage.id);
          return (
            <div key={stage.id} className="bg-slate-100 p-3 rounded-lg border flex flex-col min-w-[200px]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-xs uppercase tracking-wide text-slate-700">
                  {stage.label}
                </h3>
                <span className="text-xs bg-slate-200 px-1.5 py-0.5 rounded font-bold text-slate-600">
                  {stageOpps.length}
                </span>
              </div>

              <div className="space-y-2 flex-1">
                {stageOpps.map((opp) => (
                  <div key={opp.id} className="bg-white p-3 rounded border shadow-sm text-sm">
                    <div className="font-medium text-slate-900">{opp.title}</div>
                    {opp.value && (
                      <div className="text-xs font-semibold text-emerald-600 mt-1">
                        {opp.currency || '$'} {Number(opp.value).toLocaleString()}
                      </div>
                    )}
                    <div className="mt-3 pt-2 border-t flex justify-between items-center">
                      <select
                        value={opp.stage}
                        onChange={(e) => handleStageChange(opp.id, e.target.value)}
                        className="text-xs border rounded p-1 bg-slate-50 text-slate-700"
                      >
                        {STAGES.map((s) => (
                          <option key={s.id} value={s.id}>→ {s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                {stageOpps.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No deals
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
