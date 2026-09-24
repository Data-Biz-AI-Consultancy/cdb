'use client';

import { Suspense } from 'react';
import { DetectedSignal } from './types';
import { useSignalsPage } from './hooks/useSignalsPage';
import { SignalStatsOverview } from './components/SignalStatsOverview';
import { SignalTriageFeed } from './components/SignalTriageFeed';
import { SignalCard } from './components/SignalCard';
import { SignalCatalogTab } from './components/SignalCatalogTab';
import { SignalMetricsTab } from './components/SignalMetricsTab';
import { SignalActionModal } from './components/SignalActionModal';

function SignalsPageContent() {
  const {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    catalog,
    availableCatalog,
    signals,
    stats,
    metrics,
    loading,
    evaluating,
    evaluationBanner,
    setEvaluationBanner,
    actionInProgress,
    selectedSignalIds,
    setSelectedSignalIds,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    severityFilter,
    setSeverityFilter,
    signalTypeFilter,
    setSignalTypeFilter,
    priorityFilter,
    setPriorityFilter,
    qualityFilter,
    setQualityFilter,
    ownerFilter,
    setOwnerFilter,
    sortBy,
    setSortBy,
    lookbackDays,
    modalSignal,
    modalActionType,
    resolutionNotes,
    setResolutionNotes,
    dismissalReason,
    setDismissalReason,
    feedbackReason,
    setFeedbackReason,
    alsoDismiss,
    setAlsoDismiss,
    snoozeDays,
    setSnoozeDays,
    customSnoozeDate,
    setCustomSnoozeDate,
    assignedOwnerId,
    setAssignedOwnerId,
    escalationLevel,
    setEscalationLevel,
    escalationReason,
    setEscalationReason,
    oppTitle,
    setOppTitle,
    oppValue,
    setOppValue,
    oppCurrency,
    setOppCurrency,
    oppStage,
    setOppStage,
    oppProbability,
    setOppProbability,
    filteredSignals,
    feedOpportunities,
    feedRisks,
    feedHybrids,
    feedConflicts,
    feedUncertain,
    feedEscalated,
    accountGroupMap,
    groupedByAccount,
    handleLookbackChange,
    handleRunEvaluation,
    handleAcknowledge,
    handleLinkPerson,
    handleUnlinkPerson,
    handleOpenActionModal,
    handleCloseActionModal,
    handleSaveModalAction,
    handleBulkAction,
    toggleSelectSignal,
    handleSelectAllInView,
    handleResetFilters,
    handleDrilldownSignal,
    handleDrilldownSeverity,
  } = useSignalsPage();

  const renderCard = (sig: DetectedSignal, columnVariant: 'opportunity' | 'risk' | 'hybrid') => (
    <SignalCard
      key={sig.id}
      sig={sig}
      columnVariant={columnVariant}
      isSelected={selectedSignalIds.includes(sig.id)}
      actionInProgress={actionInProgress}
      onToggleSelect={toggleSelectSignal}
      onAcknowledge={handleAcknowledge}
      onOpenActionModal={handleOpenActionModal}
      onLinkPerson={handleLinkPerson}
      onUnlinkPerson={handleUnlinkPerson}
    />
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header & Stats Overview */}
      <SignalStatsOverview
        stats={stats}
        signals={signals}
        metrics={metrics}
        catalog={catalog}
        evaluating={evaluating}
        evaluationBanner={evaluationBanner}
        activeTab={activeTab}
        severityFilter={severityFilter}
        onRunEvaluation={handleRunEvaluation}
        onDismissBanner={() => setEvaluationBanner(null)}
        onSetSeverityFilter={setSeverityFilter}
        onSelectTab={setActiveTab}
      />

      {/* Main Tab Content */}
      {activeTab === 'catalog' ? (
        <SignalCatalogTab catalog={availableCatalog} />
      ) : activeTab === 'metrics' ? (
        <SignalMetricsTab
          metrics={metrics}
          lookbackDays={lookbackDays}
          onLookbackChange={handleLookbackChange}
          onDrilldownSignal={handleDrilldownSignal}
          onDrilldownSeverity={handleDrilldownSeverity}
        />
      ) : (
        <SignalTriageFeed
          loading={loading}
          viewMode={viewMode}
          setViewMode={setViewMode}
          selectedSignalIds={selectedSignalIds}
          setSelectedSignalIds={setSelectedSignalIds}
          onBulkAction={handleBulkAction}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
          signalTypeFilter={signalTypeFilter}
          setSignalTypeFilter={setSignalTypeFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          qualityFilter={qualityFilter}
          setQualityFilter={setQualityFilter}
          ownerFilter={ownerFilter}
          setOwnerFilter={setOwnerFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          lookbackDays={lookbackDays}
          onLookbackChange={handleLookbackChange}
          onResetFilters={handleResetFilters}
          catalog={catalog}
          availableCatalog={availableCatalog}
          filteredSignals={filteredSignals}
          opportunitySignals={feedOpportunities}
          hybridSignals={feedHybrids}
          riskSignals={feedRisks}
          groupedByAccount={groupedByAccount}
          onToggleSelectAll={() => handleSelectAllInView(filteredSignals)}
          onRunEvaluation={handleRunEvaluation}
          renderCard={renderCard}
        />
      )}

      {/* Action / Dismiss / Snooze / False Positive / Assign / Escalate / Create Deal Modal */}
      <SignalActionModal
        modalSignal={modalSignal}
        modalActionType={modalActionType}
        actionInProgress={actionInProgress}
        resolutionNotes={resolutionNotes}
        dismissalReason={dismissalReason}
        snoozeDays={snoozeDays}
        customSnoozeDate={customSnoozeDate}
        feedbackReason={feedbackReason}
        setFeedbackReason={setFeedbackReason}
        alsoDismiss={alsoDismiss}
        setAlsoDismiss={setAlsoDismiss}
        assignedOwnerId={assignedOwnerId}
        setAssignedOwnerId={setAssignedOwnerId}
        escalationLevel={escalationLevel}
        setEscalationLevel={setEscalationLevel}
        escalationReason={escalationReason}
        setEscalationReason={setEscalationReason}
        oppTitle={oppTitle}
        setOppTitle={setOppTitle}
        oppValue={oppValue}
        setOppValue={setOppValue}
        oppCurrency={oppCurrency}
        setOppCurrency={setOppCurrency}
        oppStage={oppStage}
        setOppStage={setOppStage}
        oppProbability={oppProbability}
        setOppProbability={setOppProbability}
        onClose={handleCloseActionModal}
        onSave={handleSaveModalAction}
        setResolutionNotes={setResolutionNotes}
        setDismissalReason={setDismissalReason}
        setSnoozeDays={setSnoozeDays}
        setCustomSnoozeDate={setCustomSnoozeDate}
      />
    </div>
  );
}

export default function SignalsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-400">Loading Signals Radar...</div>
      }
    >
      <SignalsPageContent />
    </Suspense>
  );
}
