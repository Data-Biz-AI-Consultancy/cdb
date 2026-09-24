'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { SuccessToast } from '@/components/SuccessToast';
import { Spinner } from '@/components/Spinner';
import { useEngagementDetail } from './hooks/useEngagementDetail';
import {
  EngagementDetailHeader,
  EngagementAISummarySection,
  EngagementContractSection,
  EngagementStakeholdersSection,
  EngagementActivitiesSection,
  EditEngagementModal,
  AttachContactModal,
  LogActivityModal,
  LinkActivityModal,
} from './components';

export default function EngagementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAttachContactModal, setShowAttachContactModal] = useState(false);
  const [showLogActivityModal, setShowLogActivityModal] = useState(false);
  const [showLinkActivityModal, setShowLinkActivityModal] = useState(false);

  useEffect(() => {
    if (params && typeof (params as any).then === 'function') {
      params.then((p) => {
        if (p?.id) setId(p.id);
      });
    } else if (params && (params as any).id) {
      setId((params as any).id);
    }
  }, [params]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const {
    engagement,
    activities,
    allPersons,
    loading,
    error,
    uploadingFile,
    fileInputRef,
    aiSummary,
    refreshingAi,
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
  } = useEngagementDetail(id, showSuccess);

  const existingActivityIds = useMemo(() => {
    return new Set(activities.map((a) => a.id));
  }, [activities]);

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-500 space-y-3">
        <Spinner size="lg" />
        <p className="text-sm font-medium">Loading engagement workspace...</p>
      </div>
    );
  }

  if (error || !engagement) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-3 bg-white p-8 rounded-2xl border border-slate-200">
        <p className="text-rose-600 font-bold">{error || 'Engagement not found'}</p>
        <Link href="/engagements" className="text-sm font-semibold text-blue-600 hover:underline block">
          ← Back to Engagements
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage(null)} />

      {/* Hidden File Input for Contract Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadContractFile(file);
        }}
        accept=".pdf,.docx,.doc,image/png,image/jpeg"
        className="hidden"
      />

      {/* Header & Top Summary Banner */}
      <EngagementDetailHeader
        engagement={engagement}
        onOpenLinkModal={() => setShowLinkActivityModal(true)}
        onOpenLogModal={() => setShowLogActivityModal(true)}
        onOpenEditModal={() => setShowEditModal(true)}
      />

      {/* AI Engagement Intelligence Briefing */}
      {aiSummary && (
        <EngagementAISummarySection
          aiSummary={aiSummary}
          refreshingAi={refreshingAi}
          onRefresh={handleRefreshAiSummary}
        />
      )}

      {/* Main Grid: Left column for Contract & Contacts, Right column for Activities & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-6">
          <EngagementContractSection
            engagement={engagement}
            uploadingFile={uploadingFile}
            fileInputRef={fileInputRef}
            onViewContract={handleViewContractDocument}
            onDeleteContract={handleDeleteContractFile}
          />

          <EngagementStakeholdersSection
            persons={engagement.persons}
            onOpenAttachModal={() => setShowAttachContactModal(true)}
            onRemoveContact={handleRemoveContact}
          />
        </div>

        {/* Right Column: Timeline & Notes (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-6">
          <EngagementActivitiesSection
            activities={activities}
            onOpenLinkModal={() => setShowLinkActivityModal(true)}
            onOpenLogModal={() => setShowLogActivityModal(true)}
            onUnlinkActivity={handleUnlinkActivity}
          />
        </div>
      </div>

      {/* Modals */}
      {showEditModal && (
        <EditEngagementModal
          isOpen={showEditModal}
          engagement={engagement}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdateEngagement}
        />
      )}

      {showAttachContactModal && (
        <AttachContactModal
          isOpen={showAttachContactModal}
          allPersons={allPersons}
          onClose={() => setShowAttachContactModal(false)}
          onSubmit={handleAttachContact}
        />
      )}

      {showLogActivityModal && (
        <LogActivityModal
          isOpen={showLogActivityModal}
          persons={engagement.persons}
          onClose={() => setShowLogActivityModal(false)}
          onSubmit={handleCreateActivity}
        />
      )}

      {showLinkActivityModal && (
        <LinkActivityModal
          isOpen={showLinkActivityModal}
          engagementId={id}
          existingActivityIds={existingActivityIds}
          onClose={() => setShowLinkActivityModal(false)}
          onSubmit={handleLinkActivities}
        />
      )}
    </div>
  );
}
