'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, ApiResponse, getAuthToken } from '@/lib/api';
import { PersonOption } from '@/lib/entityTypes';
import {
  EngagementItem,
  EngagementAISummaryItem,
  ActivityItem,
  EditEngagementFormData,
  LogActivityFormData,
} from '../types';

export function useEngagementDetail(
  id: string,
  showSuccess: (msg: string) => void
) {
  const [engagement, setEngagement] = useState<EngagementItem | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [allPersons, setAllPersons] = useState<PersonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Contract File Upload State
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<EngagementAISummaryItem | null>(null);
  const [refreshingAi, setRefreshingAi] = useState(false);

  const loadData = useCallback(
    async (targetId: string) => {
      if (!targetId) return;
      setLoading(true);
      setError(null);
      try {
        const [engRes, actRes, persRes] = await Promise.allSettled([
          apiFetch<EngagementItem>(`/api/v1/engagements/${targetId}`),
          apiFetch<ActivityItem[]>(`/api/v1/engagements/${targetId}/activities`),
          apiFetch<ApiResponse<PersonOption[]>>('/api/v1/persons?limit=100'),
        ]);

        if (engRes.status === 'fulfilled' && engRes.value) {
          const eng = engRes.value;
          setEngagement(eng);
          setAiSummary(eng.ai_summary || null);
        } else {
          setError('Engagement not found or failed to load.');
        }

        if (actRes.status === 'fulfilled' && actRes.value) {
          setActivities(actRes.value);
        }
        if (persRes.status === 'fulfilled' && persRes.value?.data) {
          setAllPersons(persRes.value.data);
        }
      } catch (err: any) {
        console.error('Error loading engagement detail:', err);
        setError('Failed to load engagement details.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id, loadData]);

  const handleUploadContractFile = async (file: File) => {
    if (!file || !id) return;
    if (file.size > 25 * 1024 * 1024) {
      alert('File exceeds the 25MB maximum size limit.');
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const updated = await apiFetch<EngagementItem>(
        `/api/v1/engagements/${id}/contract/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (updated) {
        setEngagement(updated);
        showSuccess(`Contract file '${file.name}' uploaded successfully.`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to upload contract document.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteContractFile = async () => {
    if (!id || !confirm('Are you sure you want to delete this uploaded contract file?'))
      return;
    try {
      const updated = await apiFetch<EngagementItem>(
        `/api/v1/engagements/${id}/contract/file`,
        {
          method: 'DELETE',
        }
      );
      if (updated) {
        setEngagement(updated);
        showSuccess('Contract file removed.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete contract file.');
    }
  };

  const handleViewContractDocument = async () => {
    const token = getAuthToken();
    if (!id) return;
    try {
      const url = `/api/v1/engagements/${id}/contract/download${
        token ? `?token=${encodeURIComponent(token)}` : ''
      }`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error('Failed to load contract document.');
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err: any) {
      alert(err.message || 'Error opening contract.');
    }
  };

  const handleRefreshAiSummary = async () => {
    if (!id || refreshingAi) return;
    setRefreshingAi(true);
    try {
      const res = await apiFetch<EngagementAISummaryItem>(
        `/api/v1/engagements/${id}/ai-summary/refresh`,
        {
          method: 'POST',
        }
      );
      if (res) {
        setAiSummary(res);
        showSuccess('AI Summary intelligence updated from latest activities.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to refresh AI summary.');
    } finally {
      setRefreshingAi(false);
    }
  };

  const handleLinkActivities = async (activityIds: string[]) => {
    if (activityIds.length === 0 || !id) return;
    try {
      const linked = await apiFetch<ActivityItem[]>(
        `/api/v1/engagements/${id}/activities/link`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activity_ids: activityIds }),
        }
      );

      if (linked) {
        setActivities((prev) => {
          const currentIds = new Set(prev.map((a) => a.id));
          const toAdd = linked.filter((a) => !currentIds.has(a.id));
          return [...toAdd, ...prev];
        });

        showSuccess(
          `Successfully linked ${activityIds.length} activity/conversation(s) to this engagement.`
        );

        // Auto-refresh AI summary
        apiFetch<EngagementAISummaryItem>(
          `/api/v1/engagements/${id}/ai-summary/refresh`,
          { method: 'POST' }
        )
          .then((res) => {
            if (res) setAiSummary(res);
          })
          .catch(() => {});
      }
    } catch (err: any) {
      alert(err.message || 'Failed to link activities.');
    }
  };

  const handleUnlinkActivity = async (actId: string) => {
    if (
      !id ||
      !confirm('Are you sure you want to unlink this conversation from this engagement?')
    )
      return;
    try {
      await apiFetch(`/api/v1/engagements/${id}/activities/${actId}/link`, {
        method: 'DELETE',
      });

      setActivities((prev) => prev.filter((a) => a.id !== actId));
      showSuccess('Activity unlinked from engagement.');

      // Auto-refresh AI summary
      apiFetch<EngagementAISummaryItem>(
        `/api/v1/engagements/${id}/ai-summary/refresh`,
        { method: 'POST' }
      )
        .then((res) => {
          if (res) setAiSummary(res);
        })
        .catch(() => {});
    } catch (err: any) {
      alert(err.message || 'Failed to unlink activity.');
    }
  };

  const handleUpdateEngagement = async (formData: EditEngagementFormData) => {
    if (!formData.title.trim() || !id) return;

    try {
      const payload = {
        title: formData.title.trim(),
        status: formData.status,
        engagement_type: formData.engagement_type,
        currency: formData.currency,
        rate_type: formData.rate_type,
        rate_value: formData.rate_value ? parseFloat(formData.rate_value) : null,
        total_value: formData.total_value ? parseFloat(formData.total_value) : null,
        contract_ref: formData.contract_ref.trim() || null,
        contract_status: formData.contract_status,
        signed_at: formData.signed_at || null,
        terms_and_conditions: formData.terms_and_conditions.trim() || null,
        start_date: formData.start_date || null,
        expected_end_date: formData.expected_end_date || null,
        notes: formData.notes.trim() || null,
      };

      const updated = await apiFetch<EngagementItem>(`/api/v1/engagements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (updated) {
        setEngagement(updated);
        if (updated.ai_summary) setAiSummary(updated.ai_summary);
        showSuccess('Engagement updated successfully.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update engagement.');
    }
  };

  const handleAttachContact = async (personId: string, role: string) => {
    if (!personId || !id) return;
    try {
      const updated = await apiFetch<EngagementItem>(
        `/api/v1/engagements/${id}/persons`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ person_id: personId, role }),
        }
      );

      if (updated) {
        setEngagement(updated);
        if (updated.ai_summary) setAiSummary(updated.ai_summary);
        showSuccess('Contact person attached.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to attach contact.');
    }
  };

  const handleRemoveContact = async (personId: string) => {
    if (!id || !confirm('Remove this contact from the engagement?')) return;
    try {
      const updated = await apiFetch<EngagementItem>(
        `/api/v1/engagements/${id}/persons/${personId}`,
        {
          method: 'DELETE',
        }
      );
      if (updated) {
        setEngagement(updated);
        showSuccess('Contact removed from engagement.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove contact.');
    }
  };

  const handleCreateActivity = async (data: LogActivityFormData) => {
    if (!id || !data.title.trim()) return;
    try {
      const payload: any = {
        title: data.title.trim(),
        type: data.type,
        source: data.source,
        engagement_id: id,
        company_id: engagement?.company_id,
        occurred_at: data.occurred_at ? new Date(data.occurred_at).toISOString() : new Date().toISOString(),
        summary: data.summary.trim() || null,
        raw_content: data.raw_content.trim() || null,
      };
      if (data.person_id) payload.person_id = data.person_id;

      const newAct = await apiFetch<ActivityItem>('/api/v1/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (newAct) {
        setActivities((prev) => [newAct, ...prev]);
        showSuccess('Touchpoint / note logged successfully.');

        // Auto-refresh AI summary
        apiFetch<EngagementAISummaryItem>(
          `/api/v1/engagements/${id}/ai-summary/refresh`,
          { method: 'POST' }
        )
          .then((res) => {
            if (res) setAiSummary(res);
          })
          .catch(() => {});
      }
    } catch (err: any) {
      alert(err.message || 'Failed to log activity.');
    }
  };

  return {
    engagement,
    activities,
    allPersons,
    loading,
    error,
    uploadingFile,
    fileInputRef,
    aiSummary,
    refreshingAi,
    loadData,
    handleUploadContractFile,
    handleDeleteContractFile,
    handleViewContractDocument,
    handleRefreshAiSummary,
    handleLinkActivities,
    handleUnlinkActivity,
    handleUpdateEngagement,
    handleAttachContact,
    handleRemoveContact,
    handleCreateActivity,
  };
}
