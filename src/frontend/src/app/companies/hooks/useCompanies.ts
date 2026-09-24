'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiResponse } from '@/lib/api';
import { useSuccessMessage } from '@/lib/useSuccessMessage';

export type CompaniesSortBy = 'pipeline' | 'leads' | 'contacts' | 'updated_at' | 'created_at' | 'name';

export interface CompanyFormState {
  name: string;
  domain: string;
  industry: string;
  size_range: string;
  country: string;
  city: string;
  linkedin_url: string;
}

const EMPTY_FORM: CompanyFormState = {
  name: '',
  domain: '',
  industry: '',
  size_range: '',
  country: '',
  city: '',
  linkedin_url: '',
};

export interface GlobalStats {
  totalContacts: number;
  totalLeads: number;
  totalPipelineValue: number;
}

export function useCompanies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [sortBy, setSortBy] = useState<CompaniesSortBy>('pipeline');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalContacts: 0,
    totalLeads: 0,
    totalPipelineValue: 0,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { successMessage, showSuccess, setSuccessMessage } = useSuccessMessage();

  const loadCompanies = useCallback(
    async (searchOverride?: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('page_size', String(pageSize));
        params.set('sort', sortBy);
        params.set('order', sortBy === 'name' ? 'asc' : 'desc');
        const queryToUse = searchOverride !== undefined ? searchOverride : search;
        if (queryToUse.trim()) params.set('q', queryToUse.trim());
        if (industryFilter.trim()) params.set('industry', industryFilter.trim());
        if (countryFilter.trim()) params.set('country', countryFilter.trim().toUpperCase());

        const res = await apiFetch<ApiResponse<any[]>>(`/api/v1/companies?${params.toString()}`);
        const items = res.data || [];
        setCompanies(items);
        const totalCount = res.pagination?.total ?? (res.meta as any)?.total ?? items.length ?? 0;
        setTotal(totalCount);

        const computedContacts =
          (res.pagination as any)?.total_contacts_count ??
          (res.meta as any)?.total_contacts_count ??
          items.reduce((sum: number, c: any) => sum + (c.contacts_count || 0), 0);
        const computedLeads =
          (res.pagination as any)?.total_leads_count ??
          (res.meta as any)?.total_leads_count ??
          items.reduce((sum: number, c: any) => sum + (c.leads_count || 0), 0);
        const computedPipeline =
          (res.pagination as any)?.total_pipeline_value ??
          (res.meta as any)?.total_pipeline_value ??
          items.reduce(
            (sum: number, c: any) => sum + (Number(c.total_opportunities_value) || 0),
            0
          );

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
    },
    [page, pageSize, sortBy, industryFilter, countryFilter, search]
  );

  useEffect(() => {
    let currentSearch = search;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlQ = urlParams.get('q') || urlParams.get('search');
      if (urlQ && !search) {
        currentSearch = urlQ;
        setSearch(urlQ);
      }
    }
    loadCompanies(currentSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sortBy, industryFilter, countryFilter]);

  const handleCreate = async (form: CompanyFormState) => {
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
    showSuccess('Company registered successfully.');
    loadCompanies();
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCompanies();
  };

  const uniqueIndustries = Array.from(
    new Set(companies.map((c) => c.industry).filter(Boolean))
  ).sort() as string[];

  return {
    companies,
    loading,
    error,
    search,
    setSearch,
    industryFilter,
    setIndustryFilter,
    countryFilter,
    setCountryFilter,
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
    loadCompanies,
  };
}
