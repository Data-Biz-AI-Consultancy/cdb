'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';

export default function PersonsPage() {
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    primary_email: '',
    primary_phone: '',
    linkedin_url: '',
    city: '',
    country: '',
  });

  const loadPersons = async () => {
    setLoading(true);
    setError(null);
    try {
      const qParam = search ? `&q=${encodeURIComponent(search)}` : '';
      const res = await apiFetch<ApiResponse<any[]>>(`/api/v1/persons?page=${page}&page_size=20${qParam}`);
      setPersons(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load persons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersons();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPersons();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/persons', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setShowCreate(false);
      setForm({
        first_name: '',
        last_name: '',
        primary_email: '',
        primary_phone: '',
        linkedin_url: '',
        city: '',
        country: '',
      });
      loadPersons();
    } catch (err: any) {
      alert('Error creating person: ' + err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await apiFetch(`/api/v1/persons/${id}`, { method: 'DELETE' });
      loadPersons();
    } catch (err: any) {
      alert('Error deleting person: ' + err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Persons</h1>
          <p className="text-sm text-slate-500">Manage contact golden records ({total} total)</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded text-sm font-medium"
        >
          {showCreate ? 'Close Form' : '+ New Person'}
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <h2 className="text-base font-semibold mb-3 text-slate-800">Create New Person</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">First Name *</label>
              <input
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Last Name</label>
              <input
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                value={form.primary_email}
                onChange={(e) => setForm({ ...form, primary_email: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
              <input
                value={form.primary_phone}
                onChange={(e) => setForm({ ...form, primary_phone: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">LinkedIn URL</label>
              <input
                value={form.linkedin_url}
                onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
                placeholder="linkedin.com/in/..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">City, Country</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded"
                />
                <input
                  placeholder="Country (e.g. US)"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded"
                />
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end space-x-2 mt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 border rounded text-slate-600 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-sm font-medium"
              >
                Save Person
              </button>
            </div>
          </form>
        </div>
      )}

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Search by name, email, or LinkedIn..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
        />
        <button
          type="submit"
          className="bg-slate-800 text-white px-4 py-2 rounded text-sm font-medium"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">LinkedIn</th>
              <th className="p-3">Location</th>
              <th className="p-3">Sources</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Loading persons...
                </td>
              </tr>
            ) : persons.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  No person records found.
                </td>
              </tr>
            ) : (
              persons.map((p) => {
                const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unnamed';
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-900">
                      <Link href={`/persons/${p.id}`} className="text-blue-600 hover:underline">
                        {fullName}
                      </Link>
                    </td>
                    <td className="p-3 text-slate-600">{p.primary_email || '—'}</td>
                    <td className="p-3 text-slate-600">{p.primary_phone || '—'}</td>
                    <td className="p-3 text-slate-600 text-xs">
                      {p.linkedin_url ? (
                        <a
                          href={`https://${p.linkedin_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {p.linkedin_url}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-slate-600">
                      {[p.city, p.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {(p.sources || []).map((s: string) => (
                          <span
                            key={s}
                            className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded border border-slate-200"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <Link
                        href={`/persons/${p.id}`}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id, fullName)}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="mt-4 flex justify-between items-center text-sm text-slate-600">
          <span>Page {page} of {Math.ceil(total / 20)}</span>
          <div className="space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page * 20 >= total}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
