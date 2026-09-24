'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiResponse } from '@/lib/api';
import { Activity, ActivityStats } from '@/lib/activityTypes';
import { PersonOption, CompanyOption } from '@/lib/entityTypes';
import { ComboboxOption } from '@/components/SearchableCombobox';

export interface CreateActivityFormData {
  title: string;
  type: string;
  summary: string;
  raw_content: string;
  source: string;
  person_id: string;
  company_id: string;
  occurred_at: string;
}

export interface EditActivityFormData {
  title: string;
  type: string;
  summary: string;
  raw_content: string;
  source: string;
  occurred_at: string;
}

export function useActivities(showSuccess: (msg: string) => void) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, 7d, 30d

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Available options for Combobox
  const [availablePersons, setAvailablePersons] = useState<PersonOption[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<CompanyOption[]>([]);

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [expandedContentIds, setExpandedContentIds] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState<CreateActivityFormData>({
    title: '',
    type: 'meeting',
    summary: '',
    raw_content: '',
    source: 'manual',
    person_id: '',
    company_id: '',
    occurred_at: new Date().toISOString().slice(0, 16),
  });

  const [editForm, setEditForm] = useState<EditActivityFormData>({
    title: '',
    type: 'meeting',
    summary: '',
    raw_content: '',
    source: 'manual',
    occurred_at: '',
  });

  const loadStats = useCallback(async () => {
    try {
      const res = await apiFetch<ApiResponse<ActivityStats>>('/api/v1/activities/stats');
      if (res && (res as any).data) {
        setStats((res as any).data);
      } else if (res && (res as any).total !== undefined) {
        setStats(res as any);
      }
    } catch {
      // Non-blocking background stats loading
    }
  }, []);

  const loadPersonsAndCompanies = useCallback(async () => {
    try {
      const [personsRes, compRes] = await Promise.allSettled([
        apiFetch<ApiResponse<PersonOption[]>>('/api/v1/persons?limit=100&sort=first_name&order=asc'),
        apiFetch<ApiResponse<CompanyOption[]>>('/api/v1/companies?limit=100&sort=name&order=asc'),
      ]);
      if (personsRes.status === 'fulfilled') {
        setAvailablePersons((personsRes.value as any).data || []);
      }
      if (compRes.status === 'fulfilled') {
        setAvailableCompanies((compRes.value as any).data || []);
      }
    } catch {
      // Non-critical background loading
    }
  }, []);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('page_size', String(pageSize));

      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (typeFilter) params.append('type', typeFilter);
      if (sourceFilter) params.append('source', sourceFilter);

      if (dateFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        params.append('from', today.toISOString());
      } else if (dateFilter === '7d') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.append('from', d.toISOString());
      } else if (dateFilter === '30d') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.append('from', d.toISOString());
      }

      const res = await apiFetch<ApiResponse<Activity[]>>(`/api/v1/activities?${params.toString()}`);
      setActivities((res as any).data || []);
      if ((res as any).pagination?.total !== undefined) {
        setTotalCount((res as any).pagination.total);
      } else {
        setTotalCount(((res as any).data || []).length);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, typeFilter, sourceFilter, dateFilter]);

  useEffect(() => {
    loadStats();
    loadPersonsAndCompanies();
  }, [loadStats, loadPersonsAndCompanies]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleSearchCompanies = async (query: string): Promise<ComboboxOption[]> => {
    try {
      const res = await apiFetch<ApiResponse<CompanyOption[]>>(
        `/api/v1/companies?q=${encodeURIComponent(query)}&limit=50&sort=name&order=asc`
      );
      return ((res as any).data || []).map((c: any) => ({
        id: c.id,
        label: c.name,
        subtext: c.domain || undefined,
      }));
    } catch {
      return [];
    }
  };

  const handleSearchPersons = async (query: string): Promise<ComboboxOption[]> => {
    try {
      const res = await apiFetch<ApiResponse<PersonOption[]>>(
        `/api/v1/persons?q=${encodeURIComponent(query)}&limit=50&sort=first_name&order=asc`
      );
      return ((res as any).data || []).map((p: any) => {
        const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.primary_email || p.id;
        return {
          id: p.id,
          label: name,
          subtext: p.primary_email || undefined,
        };
      });
    } catch {
      return [];
    }
  };

  const handleOpenEdit = (act: Activity) => {
    setEditingActivity(act);
    setEditForm({
      title: act.title || '',
      type: act.type,
      summary: act.summary || '',
      raw_content: act.raw_content || '',
      source: act.source || 'manual',
      occurred_at: act.occurred_at ? new Date(act.occurred_at).toISOString().slice(0, 16) : '',
    });
    setSelectedActivity(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity log?')) return;
    try {
      await apiFetch(`/api/v1/activities/${id}`, { method: 'DELETE' });
      showSuccess('Activity deleted successfully.');
      if (selectedActivity?.id === id) setSelectedActivity(null);
      loadActivities();
      loadStats();
    } catch (err: any) {
      alert(err.message || 'Failed to delete activity');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.person_id && !createForm.company_id) {
      alert('Please associate at least one Person or Company with this activity.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: createForm.title.trim() || undefined,
        type: createForm.type,
        source: createForm.source,
        summary: createForm.summary.trim() || undefined,
        raw_content: createForm.raw_content.trim() || undefined,
        person_id: createForm.person_id || undefined,
        company_id: createForm.company_id || undefined,
        occurred_at: createForm.occurred_at ? new Date(createForm.occurred_at).toISOString() : new Date().toISOString(),
      };

      await apiFetch('/api/v1/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      showSuccess('Activity logged successfully!');
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        type: 'meeting',
        summary: '',
        raw_content: '',
        source: 'manual',
        person_id: '',
        company_id: '',
        occurred_at: new Date().toISOString().slice(0, 16),
      });
      loadActivities();
      loadStats();
    } catch (err: any) {
      alert(err.message || 'Failed to create activity');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;
    setSaving(true);
    try {
      const payload: any = {
        title: editForm.title.trim() || undefined,
        type: editForm.type,
        source: editForm.source,
        summary: editForm.summary.trim() || undefined,
        raw_content: editForm.raw_content.trim() || undefined,
        occurred_at: editForm.occurred_at ? new Date(editForm.occurred_at).toISOString() : undefined,
      };

      const updated = await apiFetch<Activity>(`/api/v1/activities/${editingActivity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      showSuccess('Activity updated successfully.');
      setEditingActivity(null);
      if (selectedActivity?.id === editingActivity.id && updated) {
        setSelectedActivity(updated);
      }
      loadActivities();
      loadStats();
    } catch (err: any) {
      alert(err.message || 'Failed to update activity');
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedContentIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return {
    activities,
    stats,
    loading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    sourceFilter,
    setSourceFilter,
    dateFilter,
    setDateFilter,
    availablePersons,
    availableCompanies,
    showCreateModal,
    setShowCreateModal,
    selectedActivity,
    setSelectedActivity,
    editingActivity,
    setEditingActivity,
    expandedContentIds,
    toggleExpand,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    saving,
    handleSearchCompanies,
    handleSearchPersons,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleOpenEdit,
    loadActivities,
  };
}
