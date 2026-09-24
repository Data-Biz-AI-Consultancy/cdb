'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiResponse } from '@/lib/api';
import { PersonItem, CreatePersonFormData, BulkEditPersonFormData } from '../types';

export function usePersons(showSuccess: (msg: string) => void) {
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

  // Bulk selection & edit state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkEditPersonFormData>({
    city: '',
    country: '',
    add_source: '',
    remove_source: '',
  });

  // Create form state
  const [form, setForm] = useState<CreatePersonFormData>({
    first_name: '',
    last_name: '',
    primary_email: '',
    primary_phone: '',
    linkedin_url: '',
    city: '',
    country: '',
  });

  const loadPersons = useCallback(
    async (searchOverride?: string) => {
      setLoading(true);
      setError(null);
      try {
        const queryToUse = searchOverride !== undefined ? searchOverride : search;
        const qParam = queryToUse.trim() ? `&q=${encodeURIComponent(queryToUse.trim())}` : '';
        const sortParam = `&sort=${encodeURIComponent(sortField)}&order=${encodeURIComponent(sortOrder)}`;
        const res = await apiFetch<ApiResponse<PersonItem[]>>(
          `/api/v1/persons?page=${page}&page_size=${pageSize}${qParam}${sortParam}`
        );
        setPersons(res.data || []);
        setTotal(res.pagination?.total ?? (res as any).meta?.total ?? 0);
      } catch (err: any) {
        setError(err.message || 'Failed to load persons');
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, sortField, sortOrder, search]
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
    loadPersons(currentSearch);
  }, [loadPersons]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPersons();
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    loadPersons('');
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

  const handleCreate = async (e?: React.FormEvent, customData?: CreatePersonFormData) => {
    if (e) e.preventDefault();
    const dataToSend = customData || form;
    try {
      await apiFetch('/api/v1/persons', {
        method: 'POST',
        body: JSON.stringify(dataToSend),
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
      showSuccess('Person successfully created.');
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
      showSuccess(`Person "${name}" deleted.`);
      loadPersons();
    } catch (err: any) {
      alert('Error deleting person: ' + err.message);
    }
  };

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

  const handleBulkEditSubmit = async (e?: React.FormEvent, customData?: BulkEditPersonFormData) => {
    if (e) e.preventDefault();
    if (selectedIds.length === 0) return;

    const dataToSend = customData || bulkForm;

    setBulkUpdating(true);
    try {
      const payload: any = {
        person_ids: selectedIds,
      };
      if (dataToSend.city.trim()) payload.city = dataToSend.city.trim();
      if (dataToSend.country.trim()) payload.country = dataToSend.country.trim().toUpperCase();
      if (dataToSend.add_source.trim()) {
        payload.add_sources = dataToSend.add_source
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (dataToSend.remove_source.trim()) {
        payload.remove_sources = dataToSend.remove_source
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
      showSuccess(res.message || `Successfully updated ${res.updated_count || selectedIds.length} person(s).`);
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
      showSuccess(res.message || `Successfully deleted ${res.deleted_count || selectedIds.length} person(s).`);
      loadPersons();
    } catch (err: any) {
      alert('Error during bulk delete: ' + err.message);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;
  const isAllCurrentPageSelected =
    persons.length > 0 && persons.every((p) => selectedIds.includes(p.id));

  return {
    persons,
    loading,
    error,
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    isAllCurrentPageSelected,
    sortField,
    sortOrder,
    setSortField,
    setSortOrder,
    showCreate,
    setShowCreate,
    selectedIds,
    setSelectedIds,
    showBulkEdit,
    setShowBulkEdit,
    bulkUpdating,
    bulkForm,
    setBulkForm,
    form,
    setForm,
    handleSearch,
    handleClearSearch,
    handleSort,
    handleCreate,
    handleDelete,
    handleSelectAll,
    handleSelectRow,
    handleBulkEditSubmit,
    handleBulkDelete,
    loadPersons,
  };
}
