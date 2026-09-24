'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch, ApiResponse } from '@/lib/api';
import { PersonOption, CompanyOption } from '@/lib/entityTypes';
import { EngagementItem, CreateEngagementFormData } from '../types';

export function useEngagements() {
  const [engagements, setEngagements] = useState<EngagementItem[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [persons, setPersons] = useState<PersonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [engRes, compRes, persRes] = await Promise.allSettled([
        apiFetch<ApiResponse<EngagementItem[]>>('/api/v1/engagements?limit=100'),
        apiFetch<ApiResponse<CompanyOption[]>>('/api/v1/companies?limit=100'),
        apiFetch<ApiResponse<PersonOption[]>>('/api/v1/persons?limit=100'),
      ]);

      if (engRes.status === 'fulfilled' && engRes.value?.data) {
        setEngagements(engRes.value.data);
      }
      if (compRes.status === 'fulfilled' && compRes.value?.data) {
        setCompanies(compRes.value.data);
      }
      if (persRes.status === 'fulfilled' && persRes.value?.data) {
        setPersons(persRes.value.data);
      }
    } catch (err: any) {
      console.error('Failed loading engagements data:', err);
      setError('Unable to load engagements. Please check network connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateEngagement = async (formData: CreateEngagementFormData) => {
    const compId = formData.company_id || (companies.length > 0 ? companies[0].id : '');
    if (!formData.title.trim() || !compId) return;
    setSubmitting(true);
    try {
      const payload: any = {
        title: formData.title.trim(),
        company_id: compId,
        status: formData.status,
        engagement_type: formData.engagement_type,
        rate_type: formData.rate_type,
        rate_value: formData.rate_value ? parseFloat(formData.rate_value) : null,
        currency: formData.currency,
        total_value: formData.total_value ? parseFloat(formData.total_value) : null,
        contract_ref: formData.contract_ref.trim() || null,
        contract_status: formData.contract_status,
        signed_at: formData.signed_at || null,
        terms_and_conditions: formData.terms_and_conditions.trim() || null,
        start_date: formData.start_date || null,
        expected_end_date: formData.expected_end_date || null,
        notes: formData.notes.trim() || null,
        person_ids: formData.person_id
          ? [{ person_id: formData.person_id, role: formData.person_role || 'client_lead' }]
          : [],
      };

      const res = await apiFetch<EngagementItem>('/api/v1/engagements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res) {
        setEngagements((prev) => [res, ...prev]);
        setShowAddModal(false);
      }
    } catch (err: any) {
      console.error('Failed creating engagement:', err);
      alert(err.message || 'Failed to create engagement.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return engagements.filter((item) => {
      if (
        filterType !== 'all' &&
        item.engagement_type.toLowerCase() !== filterType.toLowerCase()
      )
        return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(q);
        const compMatch = item.company?.name.toLowerCase().includes(q);
        const contractMatch = item.contract_ref?.toLowerCase().includes(q);
        const termsMatch = item.terms_and_conditions?.toLowerCase().includes(q);
        if (!titleMatch && !compMatch && !contractMatch && !termsMatch) return false;
      }
      return true;
    });
  }, [engagements, filterType, filterStatus, searchQuery]);

  const activeCount = engagements.filter(
    (i) => i.status === 'active' || i.status === 'in_delivery'
  ).length;
  const totalValue = engagements.reduce(
    (sum, item) =>
      sum +
      (item.status !== 'completed' && item.status !== 'cancelled'
        ? Number(item.total_value || 0)
        : 0),
    0
  );
  const completedCount = engagements.filter((i) => i.status === 'completed').length;
  const onTrackCount = engagements.filter(
    (i) => !i.is_overdue && (i.status === 'active' || i.status === 'in_delivery')
  ).length;

  return {
    engagements,
    filtered,
    companies,
    persons,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    showAddModal,
    setShowAddModal,
    submitting,
    handleCreateEngagement,
    activeCount,
    totalValue,
    completedCount,
    onTrackCount,
    loadData,
  };
}
