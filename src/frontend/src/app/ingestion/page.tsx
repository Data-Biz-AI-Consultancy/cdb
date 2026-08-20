'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function IngestionPage() {
  const [activeTab, setActiveTab] = useState<'linkedin' | 'notion' | 'manual'>('linkedin');
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    let parsedData: any;
    try {
      parsedData = JSON.parse(jsonInput);
    } catch {
      setError('Invalid JSON input. Please ensure payload is valid JSON.');
      setLoading(false);
      return;
    }

    let endpoint = '/api/v1/ingest/linkedin-connections';
    if (activeTab === 'notion') endpoint = '/api/v1/ingest/notion-meeting-notes';
    if (activeTab === 'manual') endpoint = '/api/v1/ingest/linkedin-messages';

    try {
      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(parsedData),
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Ingestion request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Data Ingestion Portal</h1>
        <p className="text-sm text-slate-500">
          Push raw intake payloads from external sources (LinkedIn, Notion, Spreadsheets)
        </p>
      </div>

      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <div className="flex space-x-2 border-b pb-4 mb-4">
          <button
            onClick={() => {
              setActiveTab('linkedin');
              setJsonInput('[\n  {\n    "first_name": "Jane",\n    "last_name": "Doe",\n    "url": "https://www.linkedin.com/in/janedoe",\n    "email_address": "jane@example.com",\n    "company": "Acme Inc",\n    "position": "Director of Product",\n    "connected_on": "12 Jan 2024"\n  }\n]');
            }}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              activeTab === 'linkedin' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            LinkedIn Connections
          </button>
          <button
            onClick={() => {
              setActiveTab('notion');
              setJsonInput('[\n  {\n    "notion_page_id": "notion-12345",\n    "title": "Meeting with Jane",\n    "meeting_date": "2026-08-20T10:00:00Z",\n    "attendees": ["Jane Doe", "admin@cdb.local"],\n    "notes": "Discussed partnership opportunities."\n  }\n]');
            }}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              activeTab === 'notion' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Notion Meeting Notes
          </button>
          <button
            onClick={() => {
              setActiveTab('manual');
              setJsonInput('[\n  {\n    "message_id": "msg-999",\n    "sender_name": "Jane Doe",\n    "content": "Hi there! Let us connect.",\n    "sent_at": "2026-08-20T12:00:00Z"\n  }\n]');
            }}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              activeTab === 'manual' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            LinkedIn Messages
          </button>
        </div>

        <form onSubmit={handleIngest}>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
              JSON Payload Array
            </label>
            <textarea
              rows={10}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full font-mono text-xs p-3 border rounded focus:outline-none focus:ring-1 focus:ring-slate-500 bg-slate-50"
              placeholder="Paste JSON array here..."
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Ingesting...' : 'Submit Ingestion Payload'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded overflow-x-auto">
            <div className="font-bold text-white mb-2">Response:</div>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
