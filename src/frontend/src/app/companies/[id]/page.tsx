'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TEMPERATURE_META,
  CompanyActiveTab,
} from './types';
import {
  CompanyHeroHeader,
  CompanyTabsNav,
  CompanyAIBriefTab,
  CompanyEmployeesTab,
  CompanyTimelineTab,
  CompanyNotesTab,
  CompanyOpportunitiesTab,
  CompanyLeadsTab,
  CompanyEngagementsTab,
  CompanyProfileTab,
  CompanySignalsTab,
  CompanyModals,
} from './components';
import { useCompanyData, useCompanyActions } from './hooks';

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>('');

  useEffect(() => {
    if (params && typeof (params as any).then === 'function') {
      (params as Promise<{ id: string }>).then((p) => {
        if (p?.id) setId(p.id);
      });
    } else if (params && (params as any).id) {
      setId((params as any).id);
    }
  }, [params]);

  // Tab & Sub-filter states
  const [activeTab, setActiveTab] = useState<CompanyActiveTab>('brief');
  const [employeeSubFilter, setEmployeeSubFilter] = useState<'all' | 'current' | 'alumni'>('all');
  const [employeeSortBy, setEmployeeSortBy] = useState<'warmth' | 'interaction' | 'name' | 'tenure'>('warmth');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');
  const [signalSubFilter, setSignalSubFilter] = useState<'all' | 'active' | 'risk' | 'opportunity'>('active');

  // Data hook
  const {
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
    successMessage,
    setSuccessMessage,
    showSuccess,
    regeneratingBrief,
    loadAllData,
    handleRegenerateBrief,
  } = useCompanyData(id);

  // Actions hook
  const actions = useCompanyActions({
    id,
    company,
    allPersons,
    employees,
    loadAllData,
    showSuccess,
  });

  // Derived calculations
  const latestInteractionByPerson = useMemo(() => {
    return activities.reduce((acc: Record<string, any>, act) => {
      if (act.person_id) {
        const existing = acc[act.person_id];
        if (!existing || new Date(act.occurred_at) > new Date(existing.occurred_at)) {
          acc[act.person_id] = act;
        }
      }
      return acc;
    }, {});
  }, [activities]);

  const processedEmployees = useMemo(() => {
    return employees
      .filter((emp) => {
        if (employeeSubFilter === 'current') return emp.is_current;
        if (employeeSubFilter === 'alumni') return !emp.is_current;
        return true;
      })
      .sort((a, b) => {
        if (employeeSortBy === 'warmth') {
          const tempA = (a.attributes?.temperature || 'dormant').toLowerCase();
          const tempB = (b.attributes?.temperature || 'dormant').toLowerCase();
          const orderA = TEMPERATURE_META[tempA]?.order ?? 5;
          const orderB = TEMPERATURE_META[tempB]?.order ?? 5;
          if (orderA !== orderB) return orderA - orderB;
        }

        if (employeeSortBy === 'interaction') {
          const actA = latestInteractionByPerson[a.person_id]?.occurred_at;
          const actB = latestInteractionByPerson[b.person_id]?.occurred_at;
          if (actA && !actB) return -1;
          if (!actA && actB) return 1;
          if (actA && actB) return new Date(actB).getTime() - new Date(actA).getTime();
        }

        if (employeeSortBy === 'name') {
          const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
          const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
          return nameA.localeCompare(nameB);
        }

        if (employeeSortBy === 'tenure') {
          const startA = a.started_at ? new Date(a.started_at).getTime() : 0;
          const startB = b.started_at ? new Date(b.started_at).getTime() : 0;
          return startB - startA;
        }

        return 0;
      });
  }, [employees, employeeSubFilter, employeeSortBy, latestInteractionByPerson]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Loading company intelligence & staff directory...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto">
            🏢
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Company Record Not Found</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {error
                ? error
                : `The requested company record${id ? ` (ID: ${id})` : ''} does not exist in the database or may have been deleted.`}
            </p>
          </div>
          <div className="pt-4 flex items-center justify-center gap-3">
            <Link
              href="/companies"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              ← Back to Companies Directory
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

  const totalOppValue = opportunities.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
  const companyNotes = activities.filter((a) => a.type === 'note');
  const filteredActivities = activities.filter((act) => {
    if (activityTypeFilter === 'all') return true;
    return act.type === activityTypeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-200 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="font-bold">✓</span>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Header Card */}
      <CompanyHeroHeader
        company={company}
        employees={employees}
        opportunities={opportunities}
        leads={leads}
        activities={activities}
        detectedSignals={detectedSignals}
        onLogActivity={() => actions.setShowLogActivity(true)}
        onAddNote={() => actions.setShowAddNote(true)}
        onLinkContact={() => actions.setShowLinkContact(true)}
        onAddOpportunity={() => actions.setShowAddOpp(true)}
        onAddLead={() => actions.setShowAddLead(true)}
        onEditCompany={() => actions.setShowEditCompany(true)}
        onReviewSignals={() => setActiveTab('signals')}
      />

      {/* Tabs Navigation */}
      <CompanyTabsNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        nextBestActionsCount={nextBestActions.length}
        employeesCount={employees.length}
        activitiesCount={activities.length}
        notesCount={companyNotes.length}
        opportunitiesCount={opportunities.length}
        leadsCount={leads.length}
        engagementsCount={engagements.length}
        activeSignalsCount={detectedSignals.filter((s) => s.status === 'active').length}
        totalSignalsCount={detectedSignals.length}
      />

      {/* Tab: AI Account Brief & Actions */}
      {activeTab === 'brief' && (
        <CompanyAIBriefTab
          aiBrief={aiBrief}
          nextBestActions={nextBestActions}
          regeneratingBrief={regeneratingBrief}
          onRegenerateBrief={handleRegenerateBrief}
          onNavigateToTimeline={() => setActiveTab('timeline')}
        />
      )}

      {/* Tab: Employees & Contacts */}
      {activeTab === 'employees' && (
        <CompanyEmployeesTab
          employees={employees}
          processedEmployees={processedEmployees}
          employeeSubFilter={employeeSubFilter}
          setEmployeeSubFilter={setEmployeeSubFilter}
          employeeSortBy={employeeSortBy}
          setEmployeeSortBy={setEmployeeSortBy}
          latestInteractionByPerson={latestInteractionByPerson}
          onLinkContact={() => actions.setShowLinkContact(true)}
          onUnlinkContact={actions.handleUnlinkContact}
        />
      )}

      {/* Tab: Timeline & Activities */}
      {activeTab === 'timeline' && (
        <CompanyTimelineTab
          activities={activities}
          filteredActivities={filteredActivities}
          employees={employees}
          activityTypeFilter={activityTypeFilter}
          setActivityTypeFilter={setActivityTypeFilter}
          onLogActivity={() => actions.setShowLogActivity(true)}
        />
      )}

      {/* Tab: Notes */}
      {activeTab === 'notes' && (
        <CompanyNotesTab
          companyNotes={companyNotes}
          noteForm={actions.noteForm}
          setNoteForm={actions.setNoteForm}
          onAddNote={actions.handleAddNote}
        />
      )}

      {/* Tab: Opportunities */}
      {activeTab === 'opportunities' && (
        <CompanyOpportunitiesTab
          opportunities={opportunities}
          totalOppValue={totalOppValue}
          onAddOpportunity={() => actions.setShowAddOpp(true)}
          onAdvanceOpportunity={actions.handleAdvanceOpportunity}
        />
      )}

      {/* Tab: Leads */}
      {activeTab === 'leads' && (
        <CompanyLeadsTab
          leads={leads}
          onAddLead={() => actions.setShowAddLead(true)}
          onConvertLead={actions.handleConvertLead}
        />
      )}

      {/* Tab: Client Engagements */}
      {activeTab === 'engagements' && (
        <CompanyEngagementsTab
          company={company}
          engagements={engagements}
        />
      )}

      {/* Tab: Profile & Metadata */}
      {activeTab === 'profile' && (
        <CompanyProfileTab
          company={company}
          onEditCompany={() => actions.setShowEditCompany(true)}
        />
      )}

      {/* Tab: Account Opportunity & Risk Signals */}
      {activeTab === 'signals' && (
        <CompanySignalsTab
          company={company}
          detectedSignals={detectedSignals}
          signalSubFilter={signalSubFilter}
          setSignalSubFilter={setSignalSubFilter}
        />
      )}

      {/* Modals Dialogs */}
      <CompanyModals
        company={company}
        employees={employees}
        allPersons={allPersons}
        showEditCompany={actions.showEditCompany}
        setShowEditCompany={actions.setShowEditCompany}
        showLinkContact={actions.showLinkContact}
        setShowLinkContact={actions.setShowLinkContact}
        showLogActivity={actions.showLogActivity}
        setShowLogActivity={actions.setShowLogActivity}
        showAddNote={actions.showAddNote}
        setShowAddNote={actions.setShowAddNote}
        showAddOpp={actions.showAddOpp}
        setShowAddOpp={actions.setShowAddOpp}
        showAddLead={actions.showAddLead}
        setShowAddLead={actions.setShowAddLead}
        companyForm={actions.companyForm}
        setCompanyForm={actions.setCompanyForm}
        handleUpdateCompany={actions.handleUpdateCompany}
        linkForm={actions.linkForm}
        setLinkForm={actions.setLinkForm}
        handleLinkContact={actions.handleLinkContact}
        activityForm={actions.activityForm}
        setActivityForm={actions.setActivityForm}
        handleLogActivity={actions.handleLogActivity}
        noteForm={actions.noteForm}
        setNoteForm={actions.setNoteForm}
        handleAddNote={actions.handleAddNote}
        oppForm={actions.oppForm}
        setOppForm={actions.setOppForm}
        handleAddOpportunity={actions.handleAddOpportunity}
        leadForm={actions.leadForm}
        setLeadForm={actions.setLeadForm}
        handleAddLead={actions.handleAddLead}
      />
    </div>
  );
}
