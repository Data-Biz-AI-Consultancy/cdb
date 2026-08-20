'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Link company modal state
  const [showLinkCompany, setShowLinkCompany] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [linkForm, setLinkForm] = useState({
    company_id: '',
    title: '',
    is_current: true,
  });

  const loadPerson = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any>(`/api/v1/persons/${id}`);
      setPerson(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load person');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const res = await apiFetch<any>('/api/v1/companies?page_size=100');
      setCompanies(res.data || []);
      if (res.data?.length > 0) {
        setLinkForm((prev) => ({ ...prev, company_id: res.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPerson();
  }, [id]);

  const handleLinkCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/v1/companies/persons/${id}/companies`, {
        method: 'POST',
        body: JSON.stringify(linkForm),
      });
      setShowLinkCompany(false);
      loadPerson();
    } catch (err: any) {
      alert('Error linking company: ' + err.message);
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading person details...</div>;
  if (error) return <div className="p-6 text-red-600 bg-red-50 rounded border border-red-200">{error}</div>;
  if (!person) return <div className="p-6">Person not found.</div>;

  const fullName = `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unnamed';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 border rounded-lg shadow-sm">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            <Link href="/persons" className="text-blue-600 hover:underline">← Back to Persons</Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
          <p className="text-sm text-slate-600">ID: {person.id}</p>
        </div>
        <button
          onClick={() => {
            setShowLinkCompany(true);
            loadCompanies();
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded"
        >
          + Link Company
        </button>
      </div>

      {showLinkCompany && (
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-3 text-sm">Link Person to Company</h3>
          <form onSubmit={handleLinkCompany} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
              <select
                value={linkForm.company_id}
                onChange={(e) => setLinkForm({ ...linkForm, company_id: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
                required
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.domain || 'no domain'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title / Role</label>
              <input
                placeholder="e.g. CTO, Partner"
                value={linkForm.title}
                onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
                required
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="is_current"
                checked={linkForm.is_current}
                onChange={(e) => setLinkForm({ ...linkForm, is_current: e.target.checked })}
              />
              <label htmlFor="is_current" className="text-xs text-slate-700">Current Role</label>
            </div>
            <div className="md:col-span-3 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowLinkCompany(false)}
                className="px-3 py-1.5 border rounded text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-medium"
              >
                Save Relationship
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <div className="bg-white p-5 border rounded-lg shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-4 border-b pb-2">
            Contact Information
          </h2>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500 font-medium">Primary Email</dt>
              <dd className="text-slate-800">{person.primary_email || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 font-medium">Primary Phone</dt>
              <dd className="text-slate-800">{person.primary_phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 font-medium">LinkedIn</dt>
              <dd className="text-slate-800">
                {person.linkedin_url ? (
                  <a
                    href={`https://${person.linkedin_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {person.linkedin_url}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 font-medium">Location</dt>
              <dd className="text-slate-800">
                {[person.city, person.country].filter(Boolean).join(', ') || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 font-medium">Sources</dt>
              <dd className="flex flex-wrap gap-1 mt-1">
                {(person.sources || []).map((s: string) => (
                  <span
                    key={s}
                    className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded border"
                  >
                    {s}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </div>

        {/* Company Relationships */}
        <div className="bg-white p-5 border rounded-lg shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-4 border-b pb-2">
            Company Relationships & Roles
          </h2>
          {(!person.company_relationships || person.company_relationships.length === 0) ? (
            <p className="text-sm text-slate-500">No linked companies.</p>
          ) : (
            <div className="space-y-3">
              {person.company_relationships.map((rel: any) => (
                <div key={rel.id} className="p-3 border rounded bg-slate-50 flex justify-between items-center text-sm">
                  <div>
                    <div className="font-medium text-slate-900">
                      {rel.title || 'Role'} {rel.is_current && <span className="text-xs text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded ml-1">Current</span>}
                    </div>
                    <div className="text-xs text-slate-500">
                      Company ID: <Link href={`/companies/${rel.company_id}`} className="text-blue-600 hover:underline">{rel.company_id}</Link>
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
