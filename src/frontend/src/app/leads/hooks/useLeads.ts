'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiResponse } from '@/lib/api';
import { Lead } from '../types';

export function useLeads(showSuccess: (msg: string) => void) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('active');
  const [sourceFilter, setSourceFilter] = useState('');
  const [signalFilter, setSignalFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('created_at:desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Bulk selection & resolve modals state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showBulkConvertModal, setShowBulkConvertModal] = useState(false);
  const [showBulkDisqualifyModal, setShowBulkDisqualifyModal] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [bulkForm, setBulkForm] = useState({
    stage: '',
    signal_strength: '',
    source: '',
    intent: '',
    disqualification_reason: '',
    append_notes: '',
  });

  const [bulkConvertForm, setBulkConvertForm] = useState({
    default_value: '10000',
    currency: 'EUR',
    expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    title_suffix: '— Opportunity Deal',
  });

  const [bulkDisqualifyForm, setBulkDisqualifyForm] = useState({
    reason: 'wrong_fit',
    notes: '',
  });

  // Single-item Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLeadForView, setSelectedLeadForView] = useState<Lead | null>(null);
  const [convertModalLead, setConvertModalLead] = useState<Lead | null>(null);
  const [disqualifyModalLead, setDisqualifyModalLead] = useState<Lead | null>(null);
  const [advanceModalLead, setAdvanceModalLead] = useState<Lead | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    person_id: '',
    company_id: '',
    title: '',
    intent: 'business_collaboration',
    signal_strength: 'strong',
    source: 'linkedin_message',
    stage: 'new',
    description: '',
  });

  const [convertForm, setConvertForm] = useState({
    title: '',
    value: '',
    currency: 'EUR',
    expected_close_date: '',
  });

  const [disqualifyForm, setDisqualifyForm] = useState({
    reason: 'wrong_fit',
    notes: '',
  });

  const [advanceForm, setAdvanceForm] = useState({
    notes: '',
  });

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sortField, sortOrder] = sortOption.split(':');
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('page_size', String(pageSize));
      params.append('sort', sortField || 'created_at');
      params.append('order', sortOrder || 'desc');
      if (stageFilter) params.append('stage', stageFilter);
      if (sourceFilter) params.append('source', sourceFilter);
      if (signalFilter) params.append('signal_strength', signalFilter);
      if (searchQuery.trim()) params.append('q', searchQuery.trim());

      const res = await apiFetch<ApiResponse<Lead[]>>(`/api/v1/leads?${params.toString()}`);
      setLeads(res.data || []);
      setTotalCount((res.pagination as any)?.total || res.data?.length || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortOption, stageFilter, sourceFilter, signalFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLeads();
    }, 150);
    return () => clearTimeout(timer);
  }, [loadLeads]);

  const handleStageFilterChange = (val: string) => {
    setStageFilter(val);
    setPage(1);
  };

  const handleSourceFilterChange = (val: string) => {
    setSourceFilter(val);
    setPage(1);
  };

  const handleSignalFilterChange = (val: string) => {
    setSignalFilter(val);
    setPage(1);
  };

  const handleSortChange = (val: string) => {
    setSortOption(val);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handlePageSizeChange = (val: number) => {
    setPageSize(val);
    setPage(1);
  };

  // Bulk Selection Handlers
  const isAllCurrentPageSelected =
    leads.length > 0 && leads.every((l) => selectedIds.includes(l.id));

  const handleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = new Set(leads.map((l) => l.id));
      setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...leads.map((l) => l.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 1. Bulk Update Handler
  const handleBulkUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    try {
      const payload: any = {
        lead_ids: selectedIds,
      };
      if (bulkForm.stage) payload.stage = bulkForm.stage;
      if (bulkForm.signal_strength) payload.signal_strength = bulkForm.signal_strength;
      if (bulkForm.source) payload.source = bulkForm.source;
      if (bulkForm.intent.trim()) payload.intent = bulkForm.intent.trim();
      if (bulkForm.disqualification_reason.trim()) {
        payload.disqualification_reason = bulkForm.disqualification_reason.trim();
      }
      if (bulkForm.append_notes.trim()) payload.append_notes = bulkForm.append_notes.trim();

      const res = await apiFetch<any>('/api/v1/leads/bulk-update', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showSuccess(res.message || `Successfully updated ${selectedIds.length} leads.`);
      setShowBulkEditModal(false);
      setSelectedIds([]);
      loadLeads();
    } catch (err: any) {
      alert('Error during bulk update: ' + err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  // 2. Bulk Convert to Opportunity Handler
  const handleBulkConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    try {
      const payload = {
        lead_ids: selectedIds,
        default_value: bulkConvertForm.default_value ? parseFloat(bulkConvertForm.default_value) : undefined,
        currency: bulkConvertForm.currency,
        expected_close_date: bulkConvertForm.expected_close_date || undefined,
        title_suffix: bulkConvertForm.title_suffix || '— Opportunity Deal',
      };

      const res = await apiFetch<any>('/api/v1/leads/bulk-convert', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showSuccess(res.message || `Successfully converted ${selectedIds.length} leads to opportunities.`);
      setShowBulkConvertModal(false);
      setSelectedIds([]);
      loadLeads();
    } catch (err: any) {
      alert('Error during bulk conversion: ' + err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  // 3. Bulk Disqualify / Reject Handler
  const handleBulkDisqualifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    try {
      const payload = {
        lead_ids: selectedIds,
        reason: bulkDisqualifyForm.reason,
        notes: bulkDisqualifyForm.notes.trim() || undefined,
      };

      const res = await apiFetch<any>('/api/v1/leads/bulk-disqualify', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showSuccess(res.message || `Successfully rejected ${selectedIds.length} leads.`);
      setShowBulkDisqualifyModal(false);
      setSelectedIds([]);
      loadLeads();
    } catch (err: any) {
      alert('Error during bulk disqualification: ' + err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  // 4. Bulk Delete / Remove Handler
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete and remove ${selectedIds.length} selected leads?`)) {
      return;
    }
    try {
      const res = await apiFetch<any>('/api/v1/leads/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ lead_ids: selectedIds }),
      });
      showSuccess(res.message || `Successfully removed ${selectedIds.length} leads.`);
      setSelectedIds([]);
      loadLeads();
    } catch (err: any) {
      alert('Error during bulk delete: ' + err.message);
    }
  };

  // Single Lead Actions
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.person_id.trim()) {
      alert('Person ID is required to create a lead.');
      return;
    }
    try {
      const payload: any = {
        person_id: createForm.person_id.trim(),
        stage: createForm.stage,
        source: createForm.source,
        intent: createForm.intent.trim() || undefined,
        signal_strength: createForm.signal_strength,
        description: createForm.description.trim() || undefined,
        notes: createForm.description.trim() || undefined,
      };
      if (createForm.company_id.trim()) payload.company_id = createForm.company_id.trim();

      await apiFetch('/api/v1/leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowCreateModal(false);
      setCreateForm({
        person_id: '',
        company_id: '',
        title: '',
        intent: 'business_collaboration',
        signal_strength: 'strong',
        source: 'linkedin_message',
        stage: 'new',
        description: '',
      });
      setPage(1);
      loadLeads();
    } catch (err: any) {
      alert('Error creating lead: ' + err.message);
    }
  };

  const openConvertModal = (lead: Lead) => {
    const defaultTitle =
      lead.person_name
        ? `${lead.person_name} — Deal / Engagement`
        : lead.title || 'New Business Engagement';
    setConvertForm({
      title: defaultTitle,
      value: '10000',
      currency: 'EUR',
      expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setConvertModalLead(lead);
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertModalLead) return;
    try {
      await apiFetch(`/api/v1/leads/${convertModalLead.id}/convert`, {
        method: 'POST',
        body: JSON.stringify({
          title: convertForm.title,
          value: convertForm.value ? parseFloat(convertForm.value) : undefined,
          currency: convertForm.currency,
          expected_close_date: convertForm.expected_close_date || undefined,
        }),
      });
      showSuccess('Lead successfully converted to opportunity.');
      setConvertModalLead(null);
      loadLeads();
    } catch (err: any) {
      alert('Error converting lead: ' + err.message);
    }
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceModalLead) return;
    try {
      await apiFetch(`/api/v1/leads/${advanceModalLead.id}/advance`, {
        method: 'POST',
        body: JSON.stringify({
          notes: advanceForm.notes.trim() || undefined,
        }),
      });
      showSuccess('Lead advanced to next pipeline stage.');
      setAdvanceModalLead(null);
      setAdvanceForm({ notes: '' });
      loadLeads();
    } catch (err: any) {
      alert('Error advancing lead: ' + err.message);
    }
  };

  const handleDisqualifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disqualifyModalLead) return;
    try {
      await apiFetch(`/api/v1/leads/${disqualifyModalLead.id}/disqualify`, {
        method: 'POST',
        body: JSON.stringify({
          reason: disqualifyForm.reason,
          notes: disqualifyForm.notes.trim() || undefined,
        }),
      });
      showSuccess('Lead marked as disqualified.');
      setDisqualifyModalLead(null);
      setDisqualifyForm({ reason: 'wrong_fit', notes: '' });
      loadLeads();
    } catch (err: any) {
      alert('Error disqualifying lead: ' + err.message);
    }
  };

  return {
    leads,
    loading,
    error,
    stageFilter,
    sourceFilter,
    signalFilter,
    searchQuery,
    sortOption,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    selectedIds,
    setSelectedIds,
    showBulkEditModal,
    setShowBulkEditModal,
    showBulkConvertModal,
    setShowBulkConvertModal,
    showBulkDisqualifyModal,
    setShowBulkDisqualifyModal,
    bulkProcessing,
    bulkForm,
    setBulkForm,
    bulkConvertForm,
    setBulkConvertForm,
    bulkDisqualifyForm,
    setBulkDisqualifyForm,
    showCreateModal,
    setShowCreateModal,
    selectedLeadForView,
    setSelectedLeadForView,
    convertModalLead,
    setConvertModalLead,
    disqualifyModalLead,
    setDisqualifyModalLead,
    advanceModalLead,
    setAdvanceModalLead,
    createForm,
    setCreateForm,
    convertForm,
    setConvertForm,
    disqualifyForm,
    setDisqualifyForm,
    advanceForm,
    setAdvanceForm,
    handleStageFilterChange,
    handleSourceFilterChange,
    handleSignalFilterChange,
    handleSortChange,
    handleSearchChange,
    handlePageSizeChange,
    isAllCurrentPageSelected,
    handleSelectAll,
    handleToggleSelect,
    handleBulkUpdateSubmit,
    handleBulkConvertSubmit,
    handleBulkDisqualifySubmit,
    handleBulkDelete,
    handleCreate,
    openConvertModal,
    handleConvertSubmit,
    handleAdvanceSubmit,
    handleDisqualifySubmit,
    loadLeads,
  };
}
