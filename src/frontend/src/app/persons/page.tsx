'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';

export interface PersonItem {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email?: string | null;
  primary_phone?: string | null;
  linkedin_url?: string | null;
  city?: string | null;
  country?: string | null;
  sources?: string[];
  created_at: string;
  updated_at: string;
}

export default function PersonsPage() {
  const [persons, setPersons] = useState<PersonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Bulk selection & edit state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    city: '',
    country: '',
    add_source: '',
    remove_source: '',
  });

  // Create form state
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
      const qParam = search.trim() ? `&q=${encodeURIComponent(search.trim())}` : '';
      const sortParam = `&sort=${encodeURIComponent(sortField)}&order=${encodeURIComponent(sortOrder)}`;
      const res = await apiFetch<ApiResponse<PersonItem[]>>(
        `/api/v1/persons?page=${page}&page_size=${pageSize}${qParam}${sortParam}`
      );
      setPersons(res.data || []);
      setTotal(res.pagination?.total ?? res.meta?.total ?? 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load persons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersons();
  }, [page, pageSize, sortField, sortOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPersons();
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
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
      setSuccessMessage('Person successfully created.');
      setTimeout(() => setSuccessMessage(null), 4000);
      loadPersons();
    } catch (err: any) {
      alert('Error creating person: ' + err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await apiFetch(`/api/v1/persons/${id}`, { method: 'DELETE' });
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      setSuccessMessage(`Person "${name}" deleted.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      loadPersons();
    } catch (err: any) {
      alert('Error deleting person: ' + err.message);
    }
  };

  // Bulk Actions
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allCurrentIds = persons.map((p) => p.id);
      const union = Array.from(new Set([...selectedIds, ...allCurrentIds]));
      setSelectedIds(union);
    } else {
      const currentIdsSet = new Set(persons.map((p) => p.id));
      setSelectedIds(selectedIds.filter((id) => !currentIdsSet.has(id)));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    setBulkUpdating(true);
    try {
      const payload: any = {
        person_ids: selectedIds,
      };
      if (bulkForm.city.trim()) payload.city = bulkForm.city.trim();
      if (bulkForm.country.trim()) payload.country = bulkForm.country.trim().toUpperCase();
      if (bulkForm.add_source.trim()) {
        payload.add_sources = bulkForm.add_source
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (bulkForm.remove_source.trim()) {
        payload.remove_sources = bulkForm.remove_source
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const res = await apiFetch<any>('/api/v1/persons/bulk-update', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowBulkEdit(false);
      setBulkForm({ city: '', country: '', add_source: '', remove_source: '' });
      setSelectedIds([]);
      setSuccessMessage(res.message || `Successfully updated ${res.updated_count || selectedIds.length} person(s).`);
      setTimeout(() => setSuccessMessage(null), 5000);
      loadPersons();
    } catch (err: any) {
      alert('Error during bulk update: ' + err.message);
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected person(s)?`)) return;

    try {
      const res = await apiFetch<any>('/api/v1/persons/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ person_ids: selectedIds, hard: false }),
      });
      setSelectedIds([]);
      setSuccessMessage(res.message || 'Selected person(s) deleted.');
      setTimeout(() => setSuccessMessage(null), 5000);
      loadPersons();
    } catch (err: any) {
      alert('Error during bulk delete: ' + err.message);
    }
  };

  const isAllCurrentPageSelected =
    persons.length > 0 && persons.every((p) => selectedIds.includes(p.id));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  // Date formatting helper
  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Persons</h1>
            <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-medium border border-slate-200">
              {total.toLocaleString()} {total === 1 ? 'Contact' : 'Contacts'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage contact golden records, sort, batch clean dirty records, and view history.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium transition shadow-sm"
        >
          {showCreate ? '✕ Close Form' : '+ New Person'}
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 text-sm rounded-lg border border-emerald-200 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="font-semibold">✓</span>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center justify-between shadow-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Create New Person Drawer / Form */}
      {showCreate && (
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-slate-800">Create New Person</h2>
            <button
              onClick={() => setShowCreate(false)}
              className="text-slate-400 hover:text-slate-600 text-sm"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">First Name *</label>
              <input
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
                placeholder="e.g. Jane"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
              <input
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
                placeholder="e.g. Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Primary Email</label>
              <input
                type="email"
                value={form.primary_email}
                onChange={(e) => setForm({ ...form, primary_email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
                placeholder="e.g. jane.doe@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Primary Phone</label>
              <input
                value={form.primary_phone}
                onChange={(e) => setForm({ ...form, primary_phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
                placeholder="e.g. +1 555 0199"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">LinkedIn Profile URL</label>
              <input
                value={form.linkedin_url}
                onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
                placeholder="linkedin.com/in/..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Location (City, Country)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="City (e.g. New York)"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
                <input
                  placeholder="Country Code (e.g. US, GB)"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-medium"
              >
                Create Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {showBulkEdit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Bulk Edit Dirty Data</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Updating <span className="font-semibold text-slate-800">{selectedIds.length}</span> selected person records
                </p>
              </div>
              <button
                onClick={() => setShowBulkEdit(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkEditSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Set Country (ISO-2)
                </label>
                <input
                  placeholder="e.g. US, GB, DE, FR (leave blank to keep existing)"
                  value={bulkForm.country}
                  onChange={(e) => setBulkForm({ ...bulkForm, country: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Set City
                </label>
                <input
                  placeholder="e.g. London, San Francisco (leave blank to keep existing)"
                  value={bulkForm.city}
                  onChange={(e) => setBulkForm({ ...bulkForm, city: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Add Source Tag(s)
                </label>
                <input
                  placeholder="e.g. manual_cleanup, crm_sync (comma-separated)"
                  value={bulkForm.add_source}
                  onChange={(e) => setBulkForm({ ...bulkForm, add_source: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remove Source Tag(s)
                </label>
                <input
                  placeholder="e.g. dirty_data, test (comma-separated)"
                  value={bulkForm.remove_source}
                  onChange={(e) => setBulkForm({ ...bulkForm, remove_source: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={bulkUpdating}
                  onClick={() => setShowBulkEdit(false)}
                  className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkUpdating}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-medium flex items-center gap-2"
                >
                  {bulkUpdating ? 'Applying...' : 'Apply Bulk Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Control Bar: Search, Quick Sort, Page Size */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-white p-3.5 border border-slate-200 rounded-xl shadow-sm">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by name, email, or LinkedIn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Search
          </button>
        </form>

        {/* Quick Sort & Page Size Controls */}
        <div className="flex items-center gap-2.5 self-end md:self-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span>Sort:</span>
            <select
              value={`${sortField}:${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split(':');
                setSortField(f);
                setSortOrder(o as 'asc' | 'desc');
                setPage(1);
              }}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="created_at:desc">Created At (Newest)</option>
              <option value="created_at:asc">Created At (Oldest)</option>
              <option value="updated_at:desc">Last Edited (Newest)</option>
              <option value="updated_at:asc">Last Edited (Oldest)</option>
              <option value="first_name:asc">Name (A → Z)</option>
              <option value="first_name:desc">Name (Z → A)</option>
              <option value="primary_email:asc">Email (A → Z)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              {selectedIds.length} Selected
            </span>
            <span className="text-sm font-medium text-slate-200">
              Bulk actions for dirty records cleanup
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkEdit(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5"
            >
              ✏️ Bulk Edit
            </button>
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5"
            >
              🗑 Bulk Delete
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 select-none">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                    title="Select all on this page"
                  />
                </th>
                <th
                  onClick={() => handleSort('first_name')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Name</span>
                    {sortField === 'first_name' ? (
                      <span className="text-blue-600">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">↕</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('primary_email')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Email</span>
                    {sortField === 'primary_email' ? (
                      <span className="text-blue-600">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">↕</span>
                    )}
                  </div>
                </th>
                <th className="p-3">Phone</th>
                <th className="p-3">LinkedIn</th>
                <th
                  onClick={() => handleSort('country')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Location</span>
                    {sortField === 'country' || sortField === 'city' ? (
                      <span className="text-blue-600">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">↕</span>
                    )}
                  </div>
                </th>
                <th className="p-3">Sources</th>
                <th
                  onClick={() => handleSort('created_at')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Created At</span>
                    {sortField === 'created_at' ? (
                      <span className="text-blue-600">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">↕</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('updated_at')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Last Edited</span>
                    {sortField === 'updated_at' ? (
                      <span className="text-blue-600">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">↕</span>
                    )}
                  </div>
                </th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading persons...</span>
                    </div>
                  </td>
                </tr>
              ) : persons.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-slate-500">
                    No person records found.
                  </td>
                </tr>
              ) : (
                persons.map((p) => {
                  const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unnamed';
                  const isSelected = selectedIds.includes(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50 transition ${isSelected ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(p.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                        />
                      </td>
                      <td className="p-3 font-medium text-slate-900">
                        <Link href={`/persons/${p.id}`} className="text-blue-600 hover:underline">
                          {fullName}
                        </Link>
                      </td>
                      <td className="p-3 text-slate-600">{p.primary_email || '—'}</td>
                      <td className="p-3 text-slate-600">{p.primary_phone || '—'}</td>
                      <td className="p-3 text-slate-600 text-xs max-w-[180px] truncate">
                        {p.linkedin_url ? (
                          <a
                            href={p.linkedin_url.startsWith('http') ? p.linkedin_url : `https://${p.linkedin_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline truncate block"
                            title={p.linkedin_url}
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
                              className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded border border-slate-200 font-mono"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-slate-500 whitespace-nowrap" title={p.created_at}>
                        {formatTimestamp(p.created_at)}
                      </td>
                      <td className="p-3 text-xs text-slate-500 whitespace-nowrap" title={p.updated_at}>
                        {formatTimestamp(p.updated_at)}
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          href={`/persons/${p.id}`}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded transition"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id, fullName)}
                          className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 rounded transition"
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

        {/* Enhanced Pagination Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-800">{startRecord}</span> to{' '}
            <span className="font-semibold text-slate-800">{endRecord}</span> of{' '}
            <span className="font-semibold text-slate-800">{total}</span> records
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage(1)}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-medium"
              title="First Page"
            >
              «
            </button>
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-medium"
            >
              Previous
            </button>

            <span className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-medium"
            >
              Next
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage(totalPages)}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-medium"
              title="Last Page"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
