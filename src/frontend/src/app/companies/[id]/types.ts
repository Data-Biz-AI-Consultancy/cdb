import { AccountAIBriefResponse, NextBestActionItem } from '@/app/signals/types';
export { PIPELINE_STAGES as STAGES, STAGE_OPTIONS } from '@/lib/pipelineStages';
export type { StageDefinition } from '@/lib/pipelineStages';
export { ACTIVITY_TYPE_CONFIG as ACTIVITY_TYPE_META, getActivityTypeConfig } from '@/lib/activityTypes';
export type { ActivityTypeConfig } from '@/lib/activityTypes';

// Segment definitions & visual mapping
export const SEGMENT_META: Record<string, { label: string; bg: string; text: string; border: string }> = {
  clients_and_prospects: {
    label: 'Clients & Prospects',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  hiring_decision_makers: {
    label: 'Hiring Decision-Makers',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
  recruiters_and_talent: {
    label: 'Recruiters & Talent',
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  former_colleagues_alumni: {
    label: 'Alumni & Colleagues',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  peer_collaborators: {
    label: 'Peer Collaborators',
    bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
  },
  general_network: {
    label: 'General Network',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    text: 'text-slate-700',
    border: 'border-slate-200',
  },
};

export const TEMPERATURE_META: Record<string, { label: string; icon: string; bg: string; text: string; order: number }> = {
  hot: { label: 'Hot', icon: '🔥', bg: 'bg-red-100 border-red-200', text: 'text-red-700', order: 1 },
  warm: { label: 'Warm', icon: '☀️', bg: 'bg-amber-100 border-amber-200', text: 'text-amber-700', order: 2 },
  cold: { label: 'Cold', icon: '❄️', bg: 'bg-blue-100 border-blue-200', text: 'text-blue-700', order: 3 },
  dormant: { label: 'Dormant', icon: '⏳', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600', order: 4 },
};

// ACTIVITY_TYPE_META is now re-exported from '@/lib/activityTypes' (as ACTIVITY_TYPE_CONFIG alias).

// STAGES is now exported from '@/lib/pipelineStages' via the re-export above.

export type CompanyActiveTab =
  | 'brief'
  | 'employees'
  | 'timeline'
  | 'notes'
  | 'opportunities'
  | 'leads'
  | 'engagements'
  | 'signals'
  | 'profile';
