'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { SuccessToast } from '@/components/SuccessToast';
import { Spinner } from '@/components/Spinner';
import { usePersonDetail } from './hooks/usePersonDetail';
import {
  PersonHeader,
  PersonKpis,
  PersonTabNav,
  PersonDetailTab,
  PersonTimelineTab,
  PersonNotesTab,
  PersonEmploymentTab,
  PersonOpportunitiesTab,
  PersonLeadsTab,
  PersonChangelogTab,
  PersonProfileTab,
  AddNoteModal,
  LinkCompanyModal,
  LogActivityModal,
  AddOpportunityModal,
  AddLeadModal,
} from './components';

export default function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PersonDetailTab>('timeline');

  // Modals state
  const [showLinkCompany, setShowLinkCompany] = useState(false);
  const [showLogActivity, setShowLogActivity] = useState(false);
  const [showAddOpp, setShowAddOpp] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);

  useEffect(() => {
    if (params && typeof (params as any).then === 'function') {
      (params as Promise<{ id: string }>).then((p) => {
        if (p?.id) setId(p.id);
      });
    } else if (params && (params as any).id) {
      setId((params as any).id);
    }
  }, [params]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const {
    person,
    activities,
    opportunities,
    leads,
    history,
    companies,
    loading,
    error,
    handleLinkCompany,
    handleLogActivity,
    handleAddNote,
    handleAddOpportunity,
    handleAddLead,
    handleAdvanceOpportunity,
    handleConvertLead,
  } = usePersonDetail(id, showSuccess);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
        <Spinner size="lg" />
        <p className="text-sm font-medium">Loading person profile, employment history & activities...</p>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto">
            👤
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Person Record Not Found</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {error
                ? error
                : `The requested person record${id ? ` (ID: ${id})` : ''} does not exist in the database or may have been deleted.`}
            </p>
          </div>
          <div className="pt-4 flex items-center justify-center gap-3">
            <Link
              href="/persons"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              ← Back to Persons Directory
            </Link>
            <Link
              href="/activities"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              View Activities Feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const fullName = `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unnamed Contact';
  const careerItems = person.career || [];
  const currentRole = careerItems.find((c) => c.is_current);
  const totalOppValue = opportunities.reduce((sum, o) => sum + (Number(o.value) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage(null)} />

      {/* Top Breadcrumb & Quick Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/persons"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <span>←</span>
          <span>Back to Persons Directory</span>
        </Link>
        <span className="text-xs text-slate-400 font-mono">ID: {person.id}</span>
      </div>

      {/* Hero Profile Header Card */}
      <PersonHeader
        person={person}
        onAddNote={() => setShowAddNote(true)}
        onLogActivity={() => setShowLogActivity(true)}
        onAddOpp={() => setShowAddOpp(true)}
        onAddLead={() => setShowAddLead(true)}
        onLinkCompany={() => setShowLinkCompany(true)}
      />

      {/* KPI Metrics Summary Bar */}
      <PersonKpis
        careerCount={careerItems.length}
        hasCurrentRole={Boolean(currentRole)}
        activitiesCount={activities.length}
        latestActivityDate={
          activities.length > 0
            ? new Date(activities[0].occurred_at || activities[0].created_at).toLocaleDateString()
            : undefined
        }
        opportunitiesCount={opportunities.length}
        totalOppValue={totalOppValue}
        leadsCount={leads.length}
        openLeadsCount={leads.filter((l) => l.stage === 'new' || l.stage === 'contacted').length}
        onTabSelect={setActiveTab}
      />

      {/* Navigation Tabs */}
      <PersonTabNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activitiesCount={activities.length}
        notesCount={activities.filter((a) => a.type === 'note').length}
        employmentCount={careerItems.length}
        opportunitiesCount={opportunities.length}
        leadsCount={leads.length}
        historyCount={history.length}
      />

      {/* Tab Contents */}
      {activeTab === 'timeline' && (
        <PersonTimelineTab
          fullName={fullName}
          activities={activities}
          onOpenLogModal={() => setShowLogActivity(true)}
        />
      )}

      {activeTab === 'notes' && (
        <PersonNotesTab
          fullName={fullName}
          notes={activities.filter((a) => a.type === 'note')}
          onAddNote={handleAddNote}
          onOpenAddNoteModal={() => setShowAddNote(true)}
        />
      )}

      {activeTab === 'employment' && (
        <PersonEmploymentTab
          careerItems={careerItems}
          onOpenLinkModal={() => setShowLinkCompany(true)}
        />
      )}

      {activeTab === 'opportunities' && (
        <PersonOpportunitiesTab
          fullName={fullName}
          opportunities={opportunities}
          onOpenAddOppModal={() => setShowAddOpp(true)}
          onAdvanceOpportunity={handleAdvanceOpportunity}
        />
      )}

      {activeTab === 'leads' && (
        <PersonLeadsTab
          fullName={fullName}
          leads={leads}
          onOpenAddLeadModal={() => setShowAddLead(true)}
          onConvertLead={handleConvertLead}
        />
      )}

      {activeTab === 'changelog' && <PersonChangelogTab history={history} />}

      {activeTab === 'profile' && <PersonProfileTab person={person} />}

      {/* Action Modals */}
      <LinkCompanyModal
        isOpen={showLinkCompany}
        companies={companies}
        onClose={() => setShowLinkCompany(false)}
        onSubmit={handleLinkCompany}
      />

      <AddNoteModal
        isOpen={showAddNote}
        personName={fullName}
        onClose={() => setShowAddNote(false)}
        onSubmit={handleAddNote}
      />

      <LogActivityModal
        isOpen={showLogActivity}
        personName={fullName}
        onClose={() => setShowLogActivity(false)}
        onSubmit={handleLogActivity}
      />

      <AddOpportunityModal
        isOpen={showAddOpp}
        onClose={() => setShowAddOpp(false)}
        onSubmit={handleAddOpportunity}
      />

      <AddLeadModal
        isOpen={showAddLead}
        onClose={() => setShowAddLead(false)}
        onSubmit={handleAddLead}
      />
    </div>
  );
}
