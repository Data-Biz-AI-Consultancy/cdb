'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiResponse } from '@/lib/api';
import {
  AccountAIBriefResponse,
  NextBestActionItem,
} from '@/app/signals/types';

export function useCompanyData(id: string) {
  const [company, setCompany] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [allPersons, setAllPersons] = useState<any[]>([]);
  const [detectedSignals, setDetectedSignals] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // AI Account Brief & Next Best Actions
  const [aiBrief, setAiBrief] = useState<AccountAIBriefResponse | null>(null);
  const [nextBestActions, setNextBestActions] = useState<NextBestActionItem[]>([]);
  const [regeneratingBrief, setRegeneratingBrief] = useState(false);

  const showSuccess = useCallback((msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  }, []);

  const loadAllData = useCallback(async (targetId: string = id) => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const [
        compData,
        empData,
        actData,
        oppData,
        leadData,
        personsData,
        engData,
        sigData,
        briefData,
        nbaData,
      ] = await Promise.all([
        apiFetch<any>(`/api/v1/companies/${targetId}`),
        apiFetch<any[]>(`/api/v1/companies/${targetId}/employees`).catch(() => []),
        apiFetch<ApiResponse<any[]>>(`/api/v1/activities?company_id=${targetId}&page_size=100`).catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>(`/api/v1/opportunities?company_id=${targetId}&page_size=100`).catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>(`/api/v1/leads?company_id=${targetId}&page_size=100&sort=created_at&order=desc`).catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>('/api/v1/persons?page_size=100').catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>(`/api/v1/engagements?company_id=${targetId}&limit=100`).catch(() => ({ data: [] })),
        apiFetch<ApiResponse<any[]>>(`/api/v1/signals/detected?company_id=${targetId}&page_size=100`).catch(() => ({ data: [] })),
        apiFetch<AccountAIBriefResponse>(`/api/v1/companies/${targetId}/ai-brief`).catch(() => null),
        apiFetch<{ data: NextBestActionItem[] }>(`/api/v1/companies/${targetId}/next-best-actions`).catch(() => ({ data: [] })),
      ]);

      setCompany(compData);
      setEmployees(empData || []);
      setActivities(actData.data || []);
      setOpportunities(oppData.data || []);
      setLeads(leadData.data || []);
      setAllPersons(personsData.data || []);
      setEngagements(engData.data || []);
      setDetectedSignals(sigData?.data || []);
      setAiBrief(briefData);
      setNextBestActions(nbaData?.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleRegenerateBrief = useCallback(async () => {
    if (!id) return;
    setRegeneratingBrief(true);
    try {
      const [updatedBrief, updatedNba] = await Promise.all([
        apiFetch<AccountAIBriefResponse>(`/api/v1/companies/${id}/ai-brief/regenerate`, { method: 'POST' }),
        apiFetch<{ data: NextBestActionItem[] }>(`/api/v1/companies/${id}/next-best-actions`),
      ]);
      setAiBrief(updatedBrief);
      setNextBestActions(updatedNba?.data || []);
      showSuccess('AI Account Intelligence Brief regenerated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate AI Account Brief.');
    } finally {
      setRegeneratingBrief(false);
    }
  }, [id, showSuccess]);

  useEffect(() => {
    if (id) {
      loadAllData(id);
    }
  }, [id, loadAllData]);

  return {
    company,
    employees,
    activities,
    opportunities,
    leads,
    engagements,
    allPersons,
    detectedSignals,
    aiBrief,
    nextBestActions,
    loading,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    showSuccess,
    regeneratingBrief,
    loadAllData,
    handleRegenerateBrief,
  };
}
