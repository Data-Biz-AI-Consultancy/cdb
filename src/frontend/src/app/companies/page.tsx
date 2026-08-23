'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    domain: '',
    industry: '',
    size_range: '',
    country: '',
    city: '',
  });

  const loadCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const qParam = search ? `&q=${encodeURIComponent(search)}` : '';
      const res = await apiFetch<ApiResponse<any[]>>(`/api/v1/companies?page=${page}&page_size=20${qParam}`);
      setCompanies(res.data || []);
      setTotal(res.pagination?.total ?? res.meta?.total ?? 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCompanies();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/companies', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setShowCreate(false);
      setForm({
        name: '',
        domain: '',
        industry: '',
        size_range: '',
        country: '',
        city: '',
      });
      loadCompanies();
    } catch (err: any) {
      alert('Error creating company: ' + err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await apiFetch(`/api/v1/companies/${id}`, { method: 'DELETE' });
      loadCompanies();
    } catch (err: any) {
      alert('Error deleting company: ' + err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Companies</h1>
          <p className="text-sm text-slate-500">Manage client and partner organizations ({total} total)</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded text-sm font-medium"
        >
          {showCreate ? 'Close Form' : '+ New Company'}
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <h2 className="text-base font-semibold mb-3 text-slate-800">Create New Company</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Company Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Domain</label>
              <input
                placeholder="acme.com"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Industry</label>
              <input
                placeholder="Software, Finance, etc."
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Size Range</label>
              <input
                placeholder="10-50, 50-200, etc."
                value={form.size_range}
                onChange={(e) => setForm({ ...form, size_range: e.target.value })}
                className="w-full px-3 py-1.5 border rounded"
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
                Save Company
              </button>
            </div>
          </form>
        </div>
      )}

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Search company by name or domain..."
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
              <th className="p-3">Company Name</th>
              <th className="p-3">Domain</th>
              <th className="p-3">Industry</th>
              <th className="p-3">Size</th>
              <th className="p-3">Location</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  Loading companies...
                </td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  No company records found.
                </td>
              </tr>
            ) : (
              companies.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-900">
                    <Link href={`/companies/${c.id}`} className="text-blue-600 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="p-3 text-slate-600">
                    {c.domain ? (
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                        {c.domain}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-3 text-slate-600">{c.industry || '—'}</td>
                  <td className="p-3 text-slate-600">{c.size_range || '—'}</td>
                  <td className="p-3 text-slate-600">
                    {[c.city, c.country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <Link
                      href={`/companies/${c.id}`}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded"
                    >
                      Delete
                    </button>
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
