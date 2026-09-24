'use client';

import { useState, useCallback } from 'react';
import { apiFetch, ApiResponse } from '@/lib/api';
import { Opportunity, OpportunityHistoryItem } from '../types';

export function useOpportunityDrawer(
  refreshOpps: () => void,
  refreshSignals: () => void
) {
  const [selectedOppForDetail, setSelectedOppForDetail] = useState<Opportunity | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'signals' | 'contacts' | 'history'>('overview');
  const [historyItems, setHistoryItems] = useState<OpportunityHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [newHistoryNote, setNewHistoryNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const [attachPersonForm, setAttachPersonForm] = useState({ person_id: '', role: 'decision_maker' });
  const [attachCompanyForm, setAttachCompanyForm] = useState({ company_id: '', role: 'client' });
  const [attachingPerson, setAttachingPerson] = useState(false);
  const [attachingCompany, setAttachingCompany] = useState(false);

  const loadHistory = useCallback(async (oppId: string) => {
    setHistoryLoading(true);
    try {
      const res = await apiFetch<ApiResponse<OpportunityHistoryItem[]>>(
        `/api/v1/opportunities/${oppId}/history`
      );
      setHistoryItems(res.data || []);
    } catch (err: any) {
      console.error('Failed to load history', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleOpenDetail = (opp: Opportunity) => {
    setSelectedOppForDetail(opp);
    setEditForm({
      title: opp.title,
      description: opp.description || '',
      stage: opp.stage,
      value: opp.value ? String(opp.value) : '',
      currency: opp.currency || 'USD',
      probability: opp.probability !== null && opp.probability !== undefined ? opp.probability : 50,
      expected_close_date: opp.expected_close_date || '',
      notes: opp.notes || '',
    });
    setDetailTab('overview');
    loadHistory(opp.id);
  };

  const isOppOverdue = (opp: Opportunity): boolean => {
    if (['closed_won', 'closed_lost'].includes(opp.stage)) return false;
    if (opp.is_overdue) return true;
    if (!opp.expected_close_date) return false;
    const todayStr = new Date().toISOString().slice(0, 10);
    return opp.expected_close_date < todayStr;
  };

  const getDaysOverdue = (opp: Opportunity): number => {
    if (!isOppOverdue(opp) || !opp.expected_close_date) return 0;
    if (opp.days_overdue && opp.days_overdue > 0) return opp.days_overdue;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(opp.expected_close_date);
    target.setHours(0, 0, 0, 0);
    const diff = today.getTime() - target.getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppForDetail) return;
    setSavingEdit(true);
    try {
      const payload: any = {
        title: editForm.title,
        description: editForm.description || null,
        stage: editForm.stage,
        currency: editForm.currency,
        probability: Number(editForm.probability),
        notes: editForm.notes || null,
      };
      if (editForm.value !== '') {
        payload.value = parseFloat(editForm.value);
      }
      if (editForm.expected_close_date) {
        payload.expected_close_date = editForm.expected_close_date;
      }

      const res = await apiFetch<Opportunity>(`/api/v1/opportunities/${selectedOppForDetail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setSelectedOppForDetail((prev) => (prev ? { ...prev, ...res } : null));
      refreshOpps();
      loadHistory(selectedOppForDetail.id);
    } catch (err: any) {
      alert(err.message || 'Failed to update opportunity');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppForDetail || !newHistoryNote.trim()) return;
    setSavingNote(true);
    try {
      await apiFetch(`/api/v1/opportunities/${selectedOppForDetail.id}/history/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newHistoryNote }),
      });
      setNewHistoryNote('');
      loadHistory(selectedOppForDetail.id);
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleAttachPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppForDetail || !attachPersonForm.person_id) return;
    setAttachingPerson(true);
    try {
      const res = await apiFetch<Opportunity>(
        `/api/v1/opportunities/${selectedOppForDetail.id}/persons`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attachPersonForm),
        }
      );
      setSelectedOppForDetail((prev) => (prev ? { ...prev, persons: res.persons } : null));
      setAttachPersonForm({ person_id: '', role: 'decision_maker' });
      refreshOpps();
      loadHistory(selectedOppForDetail.id);
    } catch (err: any) {
      alert(err.message || 'Failed to link person');
    } finally {
      setAttachingPerson(false);
    }
  };

  const handleDetachPerson = async (personId: string) => {
    if (!selectedOppForDetail) return;
    try {
      const res = await apiFetch<Opportunity>(
        `/api/v1/opportunities/${selectedOppForDetail.id}/persons/${personId}`,
        { method: 'DELETE' }
      );
      setSelectedOppForDetail((prev) => (prev ? { ...prev, persons: res.persons } : null));
      refreshOpps();
      loadHistory(selectedOppForDetail.id);
    } catch (err: any) {
      alert(err.message || 'Failed to unlink person');
    }
  };

  const handleAttachCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppForDetail || !attachCompanyForm.company_id) return;
    setAttachingCompany(true);
    try {
      const res = await apiFetch<Opportunity>(
        `/api/v1/opportunities/${selectedOppForDetail.id}/companies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attachCompanyForm),
        }
      );
      setSelectedOppForDetail((prev) => (prev ? { ...prev, companies: res.companies } : null));
      setAttachCompanyForm({ company_id: '', role: 'client' });
      refreshOpps();
      loadHistory(selectedOppForDetail.id);
      refreshSignals();
    } catch (err: any) {
      alert(err.message || 'Failed to link company');
    } finally {
      setAttachingCompany(false);
    }
  };

  const handleDetachCompany = async (companyId: string) => {
    if (!selectedOppForDetail) return;
    try {
      const res = await apiFetch<Opportunity>(
        `/api/v1/opportunities/${selectedOppForDetail.id}/companies/${companyId}`,
        { method: 'DELETE' }
      );
      setSelectedOppForDetail((prev) => (prev ? { ...prev, companies: res.companies } : null));
      refreshOpps();
      loadHistory(selectedOppForDetail.id);
      refreshSignals();
    } catch (err: any) {
      alert(err.message || 'Failed to unlink company');
    }
  };

  return {
    selectedOppForDetail,
    setSelectedOppForDetail,
    detailTab,
    setDetailTab,
    historyItems,
    historyLoading,
    newHistoryNote,
    setNewHistoryNote,
    savingNote,
    editForm,
    setEditForm,
    savingEdit,
    attachPersonForm,
    setAttachPersonForm,
    attachCompanyForm,
    setAttachCompanyForm,
    attachingPerson,
    attachingCompany,
    handleOpenDetail,
    isOppOverdue,
    getDaysOverdue,
    handleSaveEdit,
    handleAddNote,
    handleAttachPerson,
    handleDetachPerson,
    handleAttachCompany,
    handleDetachCompany,
  };
}
