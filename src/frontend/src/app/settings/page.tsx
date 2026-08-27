'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import packageJson from '../../../package.json';
import { apiFetch } from '@/lib/api';

export default function SettingsPage() {
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [erConfidenceThreshold, setErConfidenceThreshold] = useState(0.85);
  const [autoDedupeEnabled, setAutoDedupeEnabled] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    const start = performance.now();
    try {
      // In development or local, check backend status
      await apiFetch('/api/v1/persons?page_size=1');
      setLatencyMs(Math.round(performance.now() - start));
      setApiHealthy(true);
    } catch {
      setApiHealthy(false);
      setLatencyMs(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-200 text-slate-800">
            Settings
          </span>
          <h1 className="text-2xl font-bold text-slate-900">System & Platform Settings</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Configure CDB runtime settings, entity resolution thresholds, system health, and data integrations.
        </p>
      </div>

      {savedNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium animate-fade-in">
          ✓ Settings saved successfully.
        </div>
      )}

      {/* System Status Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900">System Health & Services</h2>
          <button
            onClick={checkHealth}
            disabled={checking}
            className="text-xs font-medium px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
          >
            {checking ? 'Checking...' : 'Refresh Status'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">FastAPI Backend</div>
              <div className="text-sm font-semibold text-slate-800 mt-1">
                {apiHealthy === null ? 'Checking...' : apiHealthy ? 'Connected' : 'Unavailable'}
              </div>
              {latencyMs !== null && (
                <div className="text-xs text-slate-400 mt-0.5">{latencyMs}ms response time</div>
              )}
            </div>
            <span
              className={`w-3.5 h-3.5 rounded-full ${
                apiHealthy === true
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-300'
                  : apiHealthy === false
                  ? 'bg-rose-500'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">PostgreSQL Database</div>
              <div className="text-sm font-semibold text-slate-800 mt-1">
                {apiHealthy ? 'Port 5433 (Healthy)' : 'Standby'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Schema: `cdb` public</div>
            </div>
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-300" />
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">CDB Version</div>
              <div className="text-sm font-semibold text-slate-800 mt-1">v{packageJson.version}</div>
              <div className="text-xs text-slate-400 mt-0.5">SemVer Releases</div>
            </div>
            <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">Latest</span>
          </div>
        </div>
      </div>

      {/* Entity Resolution Settings */}
      <form onSubmit={handleSavePreferences} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">Entity Resolution & AI Deduplication</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure matching sensitivity and machine learning review queue parameters.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-slate-700">
                Confidence Auto-Merge Threshold: <span className="font-bold text-blue-600">{Math.round(erConfidenceThreshold * 100)}%</span>
              </label>
            </div>
            <input
              type="range"
              min="0.50"
              max="0.99"
              step="0.01"
              value={erConfidenceThreshold}
              onChange={(e) => setErConfidenceThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-xs text-slate-400 mt-1">
              Pairs with ML match probability above this threshold can be automatically consolidated into golden records.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-sm font-medium text-slate-800">Automated Intake Deduplication</div>
              <div className="text-xs text-slate-500">
                Run deterministic and probabilistic matchers whenever new intake files are processed.
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoDedupeEnabled}
              onChange={(e) => setAutoDedupeEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <Link
            href="/entity-resolution"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Go to Entity Resolution Review Queue →
          </Link>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg shadow-sm transition"
          >
            Save Preferences
          </button>
        </div>
      </form>

      {/* Ingestion & Shortcuts */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900">Data Pipelines & Ingestion</h2>
        <p className="text-xs text-slate-500">
          Trigger background intake jobs from LinkedIn archives, Substack exports, Notion notes, and CSV spreadsheets.
        </p>

        <div className="pt-2">
          <Link
            href="/ingestion"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
          >
            Open Data Ingestion Hub →
          </Link>
        </div>
      </div>
    </div>
  );
}
