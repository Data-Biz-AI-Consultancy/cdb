'use client';

import React from 'react';
import { DetectedSignal } from '../types';
import { ModalHeader } from './modal/ModalHeader';
import { AssignOwnerSection } from './modal/AssignOwnerSection';
import { EscalateSection } from './modal/EscalateSection';
import { CreateOpportunitySection } from './modal/CreateOpportunitySection';
import { FalsePositiveSection } from './modal/FalsePositiveSection';
import { SnoozeSection } from './modal/SnoozeSection';
import { DismissSection } from './modal/DismissSection';
import { NotesSection } from './modal/NotesSection';
import { ModalFooter } from './modal/ModalFooter';

interface SignalActionModalProps {
  modalSignal: DetectedSignal | null;
  modalActionType:
    | 'actioned'
    | 'dismissed'
    | 'snoozed'
    | 'resolved'
    | 'false_positive'
    | 'assign'
    | 'escalate'
    | 'create_opportunity'
    | null;
  actionInProgress: string | null;
  resolutionNotes: string;
  dismissalReason: string;
  snoozeDays: number;
  customSnoozeDate: string;
  feedbackReason?: string;
  setFeedbackReason?: (val: string) => void;
  alsoDismiss?: boolean;
  setAlsoDismiss?: (val: boolean) => void;
  // Ownership & Escalation Props
  assignedOwnerId?: string;
  setAssignedOwnerId?: (val: string) => void;
  escalationLevel?: string;
  setEscalationLevel?: (val: string) => void;
  escalationReason?: string;
  setEscalationReason?: (val: string) => void;
  // Create Opportunity Props
  oppTitle?: string;
  setOppTitle?: (val: string) => void;
  oppValue?: string | number;
  setOppValue?: (val: string | number) => void;
  oppCurrency?: string;
  setOppCurrency?: (val: string) => void;
  oppStage?: string;
  setOppStage?: (val: string) => void;
  oppProbability?: string | number;
  setOppProbability?: (val: string | number) => void;
  onClose: () => void;
  onSave: () => void;
  setResolutionNotes: (val: string) => void;
  setDismissalReason: (val: string) => void;
  setSnoozeDays: (days: number) => void;
  setCustomSnoozeDate: (date: string) => void;
}

export const SignalActionModal: React.FC<SignalActionModalProps> = ({
  modalSignal,
  modalActionType,
  actionInProgress,
  resolutionNotes,
  dismissalReason,
  snoozeDays,
  customSnoozeDate,
  feedbackReason = 'incorrect_intent',
  setFeedbackReason,
  alsoDismiss = true,
  setAlsoDismiss,
  assignedOwnerId = '',
  setAssignedOwnerId,
  escalationLevel = 'escalated',
  setEscalationLevel,
  escalationReason = '',
  setEscalationReason,
  oppTitle = '',
  setOppTitle,
  oppValue = '',
  setOppValue,
  oppCurrency = 'EUR',
  setOppCurrency,
  oppStage = 'prospect',
  setOppStage,
  oppProbability = 50,
  setOppProbability,
  onClose,
  onSave,
  setResolutionNotes,
  setDismissalReason,
  setSnoozeDays,
  setCustomSnoozeDate,
}) => {
  if (!modalSignal || !modalActionType) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <ModalHeader actionType={modalActionType} onClose={onClose} />

        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Signal: <strong className="text-slate-800 font-semibold">{modalSignal.title}</strong>
          </p>

          {modalActionType === 'assign' && (
            <AssignOwnerSection
              assignedOwnerId={assignedOwnerId}
              setAssignedOwnerId={setAssignedOwnerId}
            />
          )}

          {modalActionType === 'escalate' && (
            <EscalateSection
              escalationLevel={escalationLevel}
              setEscalationLevel={setEscalationLevel}
              escalationReason={escalationReason}
              setEscalationReason={setEscalationReason}
            />
          )}

          {modalActionType === 'create_opportunity' && (
            <CreateOpportunitySection
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
            />
          )}

          {modalActionType === 'false_positive' && (
            <FalsePositiveSection
              feedbackReason={feedbackReason}
              setFeedbackReason={setFeedbackReason}
              alsoDismiss={alsoDismiss}
              setAlsoDismiss={setAlsoDismiss}
            />
          )}

          {modalActionType === 'snoozed' && (
            <SnoozeSection
              snoozeDays={snoozeDays}
              setSnoozeDays={setSnoozeDays}
              customSnoozeDate={customSnoozeDate}
              setCustomSnoozeDate={setCustomSnoozeDate}
            />
          )}

          {modalActionType === 'dismissed' && (
            <DismissSection
              dismissalReason={dismissalReason}
              setDismissalReason={setDismissalReason}
            />
          )}

          <NotesSection
            modalActionType={modalActionType}
            resolutionNotes={resolutionNotes}
            setResolutionNotes={setResolutionNotes}
          />
        </div>

        <ModalFooter
          modalActionType={modalActionType}
          actionInProgress={actionInProgress}
          signalId={modalSignal.id}
          escalationReason={escalationReason}
          onClose={onClose}
          onSave={onSave}
        />
      </div>
    </div>
  );
};
