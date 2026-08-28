'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiResponse } from '@/lib/api';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'pipeline' | 'leads' | 'contacts' | 'updated_at' | 'created_at' | 'name'>('pipeline');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [globalStats, setGlobalStats] = useState({
    totalContacts: 0,
    totalLeads: 0,
    totalPipelineValue: 0,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    domain: '',
    industry: '',
    size_range: '',
    country: '',
    city: '',
    linkedin_url: '',
  });

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const loadCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      params.set('sort', sortBy);
      params.set('order', sortBy === 'name' ? 'asc' : 'desc');
      if (search.trim()) params.set('q', search.trim());
      if (industryFilter.trim()) params.set('industry', industryFilter.trim());
      if (countryFilter.trim()) params.set('country', countryFilter.trim().toUpperCase());

      const res = await apiFetch<ApiResponse<any[]>>(`/api/v1/companies?${params.toString()}`);
      const items = res.data || [];
      setCompanies(items);
      const totalCount = res.pagination?.total ?? res.meta?.total ?? items.length ?? 0;
      setTotal(totalCount);

      const computedContacts = (res.pagination as any)?.total_contacts_count ?? (res.meta as any)?.total_contacts_count ?? items.reduce((sum: number, c: any) => sum + (c.contacts_count || 0), 0);
      const computedLeads = (res.pagination as any)?.total_leads_count ?? (res.meta as any)?.total_leads_count ?? items.reduce((sum: number, c: any) => sum + (c.leads_count || 0), 0);
      const computedPipeline = (res.pagination as any)?.total_pipeline_value ?? (res.meta as any)?.total_pipeline_value ?? items.reduce((sum: number, c: any) => sum + (Number(c.total_opportunities_value) || 0), 0);

      setGlobalStats({
        totalContacts: computedContacts,
        totalLeads: computedLeads,
        totalPipelineValue: computedPipeline,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [page, pageSize, sortBy, industryFilter, countryFilter]);

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
        body: JSON.stringify({
          name: form.name.trim(),
          domain: form.domain.trim() || undefined,
          industry: form.industry.trim() || undefined,
          size_range: form.size_range.trim() || undefined,
          city: form.city.trim() || undefined,
          country: form.country.trim().toUpperCase() || undefined,
          linkedin_url: form.linkedin_url.trim() || undefined,
        }),
      });
      setShowCreate(false);
      setForm({
        name: '',
        domain: '',
        industry: '',
        size_range: '',
        country: '',
        city: '',
        linkedin_url: '',
      });
      showSuccess('Company registered successfully.');
      loadCompanies();
    } catch (err: any) {
      alert('Error creating company: ' + err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await apiFetch(`/api/v1/companies/${id}`, { method: 'DELETE' });
      showSuccess(`Company "${name}" deleted.`);
      loadCompanies();
    } catch (err: any) {
      alert('Error deleting company: ' + err.message);
    }
  };

  // Companies are sorted server-side in SQL before pagination
  const sortedCompanies = companies;

  // Calculate aggregates across loaded companies
  const totalContacts = companies.reduce((sum, c) => sum + (c.contacts_count || 0), 0);
  const totalLeads = companies.reduce((sum, c) => sum + (c.leads_count || 0), 0);
  const totalOpps = companies.reduce((sum, c) => sum + (c.open_opportunities_count || 0), 0);
  const totalPipelineValue = companies.reduce((sum, c) => sum + (Number(c.total_opportunities_value) || 0), 0);

  // Extract unique industries for filter dropdown
  const uniqueIndustries = Array.from(new Set(companies.map((c) => c.industry).filter(Boolean))).sort();

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-200 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="font-bold">✓</span>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Companies Directory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Accounts, client organizations, and partner ecosystems ({total} total companies)
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>{showCreate ? '✕ Close Form' : '+ New Company'}</span>
        </button>
      </div>

      {/* Aggregate KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Companies</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{companies.length} active in current view</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Connected People</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">👥 {globalStats.totalContacts}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Linked employees & alumni</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Related Leads</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">🎯 {globalStats.totalLeads}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Inbound & outbound signals</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pipeline Value</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">€{globalStats.totalPipelineValue.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Across active opportunities</div>
        </div>
      </div>

      {/* Create Company Form Drawer */}
      {showCreate && (
        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4 animate-fade-in">
          <h2 className="text-base font-bold text-slate-900">Register New Company</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
              <input
                required
                placeholder="e.g. Acme AI Corp"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Domain</label>
              <input
                placeholder="acme.ai"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Industry</label>
              <input
                placeholder="Artificial Intelligence, Software, Finance..."
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Size Range</label>
              <input
                placeholder="1-10, 11-50, 51-200, 201-500..."
                value={form.size_range}
                onChange={(e) => setForm({ ...form, size_range: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City</label>
              <input
                placeholder="Berlin, London, New York..."
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Country Code (ISO 2)</label>
              <input
                maxLength={2}
                placeholder="DE, GB, US..."
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">LinkedIn URL</label>
              <input
                placeholder="linkedin.com/company/acme"
                value={form.linkedin_url}
                onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2 md:col-span-3 flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold shadow-sm"
              >
                Save Company
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Search company by name or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {uniqueIndustries.length > 0 && (
            <select
              aria-label="Filter by industry"
              value={industryFilter}
              onChange={(e) => {
                setIndustryFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-700 font-medium"
            >
              <option value="">All Industries</option>
              {uniqueIndustries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Sort:</span>
            <select
              aria-label="Sort companies"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setPage(1);
              }}
              className="px-2.5 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-semibold"
            >
              <option value="pipeline">💼 Highest Deal Value</option>
              <option value="leads">🎯 Most Related Leads</option>
              <option value="contacts">👥 Most Connected People</option>
              <option value="updated_at">🕒 Recently Updated</option>
              <option value="created_at">✨ Recently Added</option>
              <option value="name">🔤 Company Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 shadow-sm">
          {error}
        </div>
      )}

      {/* Companies Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Company</th>
                <th className="p-3.5">Industry & Size</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5 text-center">Connected People</th>
                <th className="p-3.5 text-center">Related Leads</th>
                <th className="p-3.5 text-right">Opportunities & Value</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
                      <span>Loading companies and deal metrics...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 space-y-2">
                    <p className="text-sm font-medium">No company records found.</p>
                    <button
                      onClick={() => setShowCreate(true)}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg shadow-sm"
                    >
                      + Create Company
                    </button>
                  </td>
                </tr>
              ) : (
                sortedCompanies.map((c) => {
                  const initials = c.name?.[0]?.toUpperCase() || 'C';
                  const oppVal = Number(c.total_opportunities_value || 0);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition group">
                      {/* Company Name & Domain */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 border border-slate-700">
                            {initials}
                          </div>
                          <div>
                            <Link
                              href={`/companies/${c.id}`}
                              className="font-bold text-slate-900 hover:text-blue-600 transition text-sm flex items-center gap-1.5"
                            >
                              <span>{c.name}</span>
                            </Link>
                            {c.domain && (
                              <a
                                href={`https://${c.domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-mono text-slate-500 hover:text-blue-600 inline-flex items-center gap-1 mt-0.5"
                              >
                                <span>🌐 {c.domain}</span>
                                <span className="text-[9px]">↗</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Industry & Size */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          {c.industry ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200 inline-block">
                              {c.industry}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                          {c.size_range && (
                            <div className="text-[10px] text-slate-500 font-medium">👥 {c.size_range}</div>
                          )}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="p-3.5 text-slate-600">
                        {(c.city || c.country) ? (
                          <span className="inline-flex items-center gap-1">
                            <span>📍</span>
                            <span>{[c.city, c.country].filter(Boolean).join(', ')}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Connected People */}
                      <td className="p-3.5 text-center">
                        <Link
                          href={`/companies/${c.id}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs transition ${
                            c.contacts_count > 0
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <span>👥</span>
                          <span>{c.contacts_count || 0}</span>
                        </Link>
                      </td>

                      {/* Related Leads */}
                      <td className="p-3.5 text-center">
                        <Link
                          href={`/companies/${c.id}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs transition ${
                            c.leads_count > 0
                              ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <span>🎯</span>
                          <span>{c.leads_count || 0}</span>
                        </Link>
                      </td>

                      {/* Opportunities & Deal Value */}
                      <td className="p-3.5 text-right">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-emerald-700 text-xs">
                            {oppVal > 0 ? `€${oppVal.toLocaleString()}` : '—'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {c.open_opportunities_count > 0 ? (
                              <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                                {c.open_opportunities_count} open {c.open_opportunities_count === 1 ? 'deal' : 'deals'}
                              </span>
                            ) : (
                              <span className="text-slate-400">0 deals</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right space-x-1.5">
                        <Link
                          href={`/companies/${c.id}`}
                          className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg transition inline-block"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          className="text-[11px] font-semibold bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1.5 rounded-lg transition"
                          title="Delete company"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {(() => {
          const totalPages = Math.max(1, Math.ceil(total / pageSize));
          const startRecord = (page - 1) * pageSize + 1;
          const endRecord = Math.min(page * pageSize, total);

          return (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-600 font-medium">
              <div>
                Showing <span className="font-bold text-slate-800">{total === 0 ? 0 : startRecord}</span> to{' '}
                <span className="font-bold text-slate-800">{endRecord}</span> of{' '}
                <span className="font-bold text-slate-800">{total}</span> companies
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span>Per page:</span>
                  <select
                    aria-label="Per page"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1 || loading}
                    onClick={() => setPage(1)}
                    className="px-2.5 py-1 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-semibold transition"
                    title="First Page"
                  >
                    «
                  </button>
                  <button
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-semibold transition"
                  >
                    Previous
                  </button>

                  <span className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-xs">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-semibold transition"
                  >
                    Next
                  </button>
                  <button
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage(totalPages)}
                    className="px-2.5 py-1 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-semibold transition"
                    title="Last Page"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
