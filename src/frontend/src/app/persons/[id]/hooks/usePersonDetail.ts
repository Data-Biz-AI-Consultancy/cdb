'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiResponse } from '@/lib/api';
import {
  PersonDetail,
  NoteFormData,
  LinkCompanyFormData,
  ActivityFormData,
  OpportunityFormData,
  LeadFormData,
} from '../types';

export function usePersonDetail(
  id: string,
  showSuccess: (msg: string) => void
) {
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllData = useCallback(async (targetId: string) => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const [personData, activitiesData, oppsData, leadsData, historyData, companiesData] =
        await Promise.all([
          apiFetch<any>(`/api/v1/persons/${targetId}`),
          apiFetch<ApiResponse<any[]>>(`/api/v1/activities?person_id=${targetId}&page_size=100`).catch(
            () => ({ data: [] })
          ),
          apiFetch<ApiResponse<any[]>>(
            `/api/v1/opportunities?person_id=${targetId}&page_size=100`
          ).catch(() => ({ data: [] })),
          apiFetch<ApiResponse<any[]>>(
            `/api/v1/leads?person_id=${targetId}&page_size=100&sort=created_at&order=desc`
          ).catch(() => ({ data: [] })),
          apiFetch<ApiResponse<any[]>>(`/api/v1/persons/${targetId}/history?page_size=100`).catch(
            () => ({ data: [] })
          ),
          apiFetch<ApiResponse<any[]>>('/api/v1/companies?page_size=100').catch(() => ({
            data: [],
          })),
        ]);

      setPerson(personData);
      setActivities(activitiesData.data || []);
      setOpportunities(oppsData.data || []);
      setLeads(leadsData.data || []);
      setHistory(historyData.data || []);
      setCompanies(companiesData.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load person full history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      loadAllData(id);
    }
  }, [id, loadAllData]);

  const handleLinkCompany = async (formData: LinkCompanyFormData) => {
    if (!id) return;
    try {
      const payload: any = {
        company_id: formData.company_id,
        title: formData.title.trim(),
        is_current: formData.is_current,
      };
      if (formData.started_at) payload.started_at = formData.started_at;
      if (formData.ended_at && !formData.is_current) payload.ended_at = formData.ended_at;

      await apiFetch(`/api/v1/companies/persons/${id}/companies`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showSuccess('Employment history relationship saved.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error linking company: ' + err.message);
    }
  };

  const handleLogActivity = async (formData: ActivityFormData) => {
    if (!id) return;
    try {
      await apiFetch('/api/v1/activities', {
        method: 'POST',
        body: JSON.stringify({
          person_id: id,
          title: formData.title.trim(),
          type: formData.type,
          source: formData.source,
          summary: formData.summary.trim() || undefined,
        }),
      });
      showSuccess('Activity logged in person history.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error logging activity: ' + err.message);
    }
  };

  const handleAddNote = async (formData: NoteFormData) => {
    if (!id || !formData.summary.trim()) return;
    try {
      await apiFetch('/api/v1/activities', {
        method: 'POST',
        body: JSON.stringify({
          person_id: id,
          type: 'note',
          source: 'manual',
          title: formData.title.trim() || 'Internal Note',
          summary: formData.summary.trim(),
          occurred_at: new Date().toISOString(),
        }),
      });
      showSuccess('Note added to person record.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error adding note: ' + err.message);
    }
  };

  const handleAddOpportunity = async (formData: OpportunityFormData) => {
    if (!id) return;
    try {
      const payload: any = {
        title: formData.title.trim(),
        stage: formData.stage,
        currency: formData.currency,
        probability: Number(formData.probability),
        notes: formData.notes.trim() || undefined,
        person_ids: [{ person_id: id, role: 'decision_maker' }],
      };
      if (formData.value) payload.value = Number(formData.value);
      if (formData.expected_close_date) payload.expected_close_date = formData.expected_close_date;

      await apiFetch('/api/v1/opportunities', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showSuccess('Opportunity attached to person.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error creating opportunity: ' + err.message);
    }
  };

  const handleAddLead = async (formData: LeadFormData) => {
    if (!id) return;
    try {
      await apiFetch('/api/v1/leads', {
        method: 'POST',
        body: JSON.stringify({
          person_id: id,
          title: formData.title.trim(),
          stage: formData.stage,
          source: formData.source,
          intent: formData.intent.trim() || undefined,
          signal_strength: formData.signal_strength,
          notes: formData.notes.trim() || undefined,
        }),
      });
      showSuccess('Lead attached to person.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error creating lead: ' + err.message);
    }
  };

  const handleAdvanceOpportunity = async (oppId: string) => {
    if (!id) return;
    try {
      await apiFetch(`/api/v1/opportunities/${oppId}/advance`, { method: 'POST' });
      showSuccess('Opportunity stage advanced.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error advancing opportunity: ' + err.message);
    }
  };

  const handleConvertLead = async (leadId: string, leadTitle: string) => {
    if (!id) return;
    const oppTitle = prompt('Enter title for converted opportunity:', leadTitle || 'New Deal');
    if (!oppTitle) return;
    try {
      await apiFetch(`/api/v1/leads/${leadId}/convert`, {
        method: 'POST',
        body: JSON.stringify({
          title: oppTitle,
          opportunity_title: oppTitle,
          stage: 'prospect',
        }),
      });
      showSuccess('Lead converted to Opportunity.');
      loadAllData(id);
    } catch (err: any) {
      alert('Error converting lead: ' + err.message);
    }
  };

  return {
    person,
    activities,
    opportunities,
    leads,
    history,
    companies,
    loading,
    error,
    loadAllData,
    handleLinkCompany,
    handleLogActivity,
    handleAddNote,
    handleAddOpportunity,
    handleAddLead,
    handleAdvanceOpportunity,
    handleConvertLead,
  };
}
