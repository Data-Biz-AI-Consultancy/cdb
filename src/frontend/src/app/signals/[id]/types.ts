export type {
  DetectedSignal,
  DetectedSignalStatus,
  SignalSeverity,
  SignalCategory,
  SupportingEvidence,
  ConnectedPerson,
  SignalFeedback,
} from '../types';

export type SignalActionType =
  | 'actioned'
  | 'dismissed'
  | 'snoozed'
  | 'resolved'
  | 'false_positive';
