'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiResponse } from '@/lib/api';

export default function ERQueuePage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningER, setRunningER] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ApiResponse<any[]>>('/api/v1/er/queue?page_size=50');
      setQueue(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleRunER = async () => {
    setRunningER(true);
    try {
      const res = await apiFetch<any>('/api/v1/er/run', { method: 'POST' });
      alert(`Entity resolution run completed! Checked: ${res.data?.total_candidates_evaluated || 0}, Matches: ${res.data?.matches_found || 0}`);
      loadQueue();
    } catch (err: any) {
      alert('Error triggering ER run: ' + err.message);
    } finally {
      setRunningER(false);
    }
  };

  const handleResolve = async (candidateId: string, action: 'merge' | 'reject') => {
    try {
      const endpointAction = action === 'merge' ? 'accept' : 'reject';
      await apiFetch(`/api/v1/er/queue/${candidateId}/${endpointAction}`, {
        method: 'POST',
      });
      alert(`Candidate pair successfully marked as: ${action === 'merge' ? 'Merged' : 'Rejected / Kept Separate'}`);
      loadQueue();
    } catch (err: any) {
      alert(`Error resolving candidate: ${err.message}`);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Entity Resolution Review Queue</h1>
          <p className="text-sm text-slate-500">
            Review and resolve potential duplicate contact merges
          </p>
        </div>
        <button
          onClick={handleRunER}
          disabled={runningER}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          {runningER ? 'Running ER Pipeline...' : '⚡ Trigger ER Engine Run'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="p-6 text-center text-slate-500 bg-white border rounded">
            Loading review queue...
          </div>
        ) : queue.length === 0 ? (
          <div className="p-8 text-center bg-white border rounded text-slate-500">
            <p className="font-semibold text-slate-700">Review Queue is Clean</p>
            <p className="text-xs text-slate-400 mt-1">No pending duplicate pairs requiring manual resolution.</p>
          </div>
        ) : (
          queue.map((item) => {
            const pa = item.person_a || {};
            const pb = item.person_b || {};
            const nameA = `${pa.first_name || ''} ${pa.last_name || ''}`.trim() || 'Unknown Name';
            const nameB = `${pb.first_name || ''} ${pb.last_name || ''}`.trim() || 'Unknown Name';
            const score = item.ml_score != null ? `${(Number(item.ml_score) * 100).toFixed(0)}%` : 'Rule Matched';

            return (
              <div key={item.id} className="bg-white p-5 border rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                    Confidence: {score}
                  </span>
                  <div className="text-xs text-slate-400">
                    Rule Trigger: <strong className="text-slate-700">{item.match_signals?.trigger_rule ? `Rule #${item.match_signals.trigger_rule}` : 'Fuzzy Match'}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded border text-sm">
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-xs text-slate-500 uppercase mb-1">Target Person A</h4>
                    <div className="font-bold text-slate-800 text-base">{nameA}</div>
                    <div className="text-xs text-slate-600 mt-1">✉️ {pa.primary_email || 'No email'}</div>
                    <div className="text-xs text-slate-600 mt-0.5">🔗 {pa.linkedin_url || 'No LinkedIn'}</div>
                    {pa.current_company && (
                      <div className="text-xs text-slate-500 mt-1">🏢 {pa.current_title ? `${pa.current_title} at ` : ''}{pa.current_company.name}</div>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-xs text-slate-500 uppercase mb-1">Candidate Person B</h4>
                    <div className="font-bold text-slate-800 text-base">{nameB}</div>
                    <div className="text-xs text-slate-600 mt-1">✉️ {pb.primary_email || 'No email'}</div>
                    <div className="text-xs text-slate-600 mt-0.5">🔗 {pb.linkedin_url || 'No LinkedIn'}</div>
                    {pb.current_company && (
                      <div className="text-xs text-slate-500 mt-1">🏢 {pb.current_title ? `${pb.current_title} at ` : ''}{pb.current_company.name}</div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => handleResolve(item.id, 'reject')}
                    className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium"
                  >
                    Keep Separate (Reject)
                  </button>
                  <button
                    onClick={() => handleResolve(item.id, 'merge')}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium"
                  >
                    Confirm & Merge Records
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
