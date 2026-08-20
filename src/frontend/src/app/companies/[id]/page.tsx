'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [company, setCompany] = useState<any>(null);
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCompany = async () => {
    setLoading(true);
    try {
      const [compData, personsData] = await Promise.all([
        apiFetch<any>(`/api/v1/companies/${id}`),
        apiFetch<any>(`/api/v1/companies/${id}/persons`),
      ]);
      setCompany(compData);
      setPersons(personsData.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load company');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompany();
  }, [id]);

  if (loading) return <div className="p-6 text-slate-500">Loading company details...</div>;
  if (error) return <div className="p-6 text-red-600 bg-red-50 rounded border border-red-200">{error}</div>;
  if (!company) return <div className="p-6">Company not found.</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 border rounded-lg shadow-sm">
        <div className="text-xs text-slate-500 mb-1">
          <Link href="/companies" className="text-blue-600 hover:underline">← Back to Companies</Link>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
        {company.domain && (
          <p className="text-sm font-mono text-slate-600 mt-1">{company.domain}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 border rounded-lg shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-4 border-b pb-2">
            Company Information
          </h2>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500 font-medium">Domain</dt>
              <dd className="text-slate-800 font-mono">{company.domain || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 font-medium">Industry</dt>
              <dd className="text-slate-800">{company.industry || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 font-medium">Size Range</dt>
              <dd className="text-slate-800">{company.size_range || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 font-medium">Location</dt>
              <dd className="text-slate-800">
                {[company.city, company.country].filter(Boolean).join(', ') || '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white p-5 border rounded-lg shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-4 border-b pb-2">
            Associated People ({persons.length})
          </h2>
          {persons.length === 0 ? (
            <p className="text-sm text-slate-500">No linked contacts found for this company.</p>
          ) : (
            <div className="space-y-3">
              {persons.map((p: any) => (
                <div key={p.id} className="p-3 border rounded bg-slate-50 flex justify-between items-center text-sm">
                  <div>
                    <div className="font-medium text-slate-900">
                      <Link href={`/persons/${p.person_id}`} className="text-blue-600 hover:underline">
                        Person ID: {p.person_id}
                      </Link>
                    </div>
                    <div className="text-xs text-slate-500">
                      {p.title || 'No Title'} {p.is_current && <span className="text-xs text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded ml-1">Current</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
