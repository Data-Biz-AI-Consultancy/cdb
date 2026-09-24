'use client';

import Link from 'next/link';
import { useCompanies } from './hooks/useCompanies';
import { CompanyCreateModal } from './components/CompanyCreateModal';

export default function CompaniesPage() {
  const {
    companies,
    loading,
    error,
    search,
    setSearch,
    industryFilter,
    setIndustryFilter,
    sortBy,
    setSortBy,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    globalStats,
    showCreate,
    setShowCreate,
    successMessage,
    setSuccessMessage,
    uniqueIndustries,
    handleCreate,
    handleDelete,
    handleSearch,
  } = useCompanies();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-200 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="font-bold">✓</span>
            <span>{successMessage}</span>
          </div>
          <button
            id="companies-dismiss-toast"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Companies Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Accounts, client organizations, and partner ecosystems ({total} total companies)
          </p>
        </div>
        <button
          id="companies-new-btn"
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>{showCreate ? '✕ Close Form' : '+ New Company'}</span>
        </button>
      </div>

      {/* Aggregate KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Companies
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {companies.length} active in current view
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Connected People
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            👥 {globalStats.totalContacts}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Linked employees &amp; alumni</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Related Leads
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-1">🎯 {globalStats.totalLeads}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Inbound &amp; outbound signals</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Pipeline Value
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            €{globalStats.totalPipelineValue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Across active opportunities</div>
        </div>
      </div>

      {/* Create Company Form */}
      {showCreate && (
        <CompanyCreateModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            id="companies-search-input"
            type="text"
            placeholder="Search company by name or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
          />
          <button
            id="companies-search-btn"
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {uniqueIndustries.length > 0 && (
            <select
              id="companies-industry-filter"
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
              id="companies-sort-select"
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
                <th className="p-3.5">Industry &amp; Size</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5 text-center">Connected People</th>
                <th className="p-3.5 text-center">Related Leads</th>
                <th className="p-3.5 text-right">Opportunities &amp; Value</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                      <span>Loading companies and deal metrics...</span>
                    </div>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 space-y-2">
                    <p className="text-sm font-medium">No company records found.</p>
                    <button
                      id="companies-empty-create-btn"
                      onClick={() => setShowCreate(true)}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg shadow-sm"
                    >
                      + Create Company
                    </button>
                  </td>
                </tr>
              ) : (
                companies.map((c) => {
                  const initials = c.name?.[0]?.toUpperCase() || 'C';
                  const oppVal = Number(c.total_opportunities_value || 0);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition group">
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
                            <div className="text-[10px] text-slate-500 font-medium">
                              👥 {c.size_range}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-600">
                        {c.city || c.country ? (
                          <span className="inline-flex items-center gap-1">
                            <span>📍</span>
                            <span>{[c.city, c.country].filter(Boolean).join(', ')}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

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

                      <td className="p-3.5 text-right">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-emerald-700 text-xs">
                            {oppVal > 0 ? `€${oppVal.toLocaleString()}` : '—'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {c.open_opportunities_count > 0 ? (
                              <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                                {c.open_opportunities_count} open{' '}
                                {c.open_opportunities_count === 1 ? 'deal' : 'deals'}
                              </span>
                            ) : (
                              <span className="text-slate-400">0 deals</span>
                            )}
                          </div>
                        </div>
                      </td>

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
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-600 font-medium">
          <div>
            Showing <span className="font-bold text-slate-800">{total === 0 ? 0 : startRecord}</span>{' '}
            to <span className="font-bold text-slate-800">{endRecord}</span> of{' '}
            <span className="font-bold text-slate-800">{total}</span> companies
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                id="companies-page-size"
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
                id="companies-page-first"
                disabled={page <= 1 || loading}
                onClick={() => setPage(1)}
                className="px-2.5 py-1 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-semibold transition"
                title="First Page"
              >
                «
              </button>
              <button
                id="companies-page-prev"
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
                id="companies-page-next"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-semibold transition"
              >
                Next
              </button>
              <button
                id="companies-page-last"
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
      </div>
    </div>
  );
}
