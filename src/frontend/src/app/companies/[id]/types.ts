import { AccountAIBriefResponse, NextBestActionItem } from '@/app/signals/types';

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

export const ACTIVITY_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  linkedin_message: { label: 'LinkedIn Message', icon: '💼', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  meeting: { label: 'Meeting / Notion Notes', icon: '📝', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  email: { label: 'Email', icon: '✉️', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  call: { label: 'Phone Call', icon: '📞', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  whatsapp: { label: 'WhatsApp', icon: '💬', color: 'bg-green-100 text-green-800 border-green-200' },
  note: { label: 'Internal Note', icon: '📌', color: 'bg-slate-100 text-slate-800 border-slate-200' },
};

export const STAGES = [
  { id: 'prospect', label: 'Prospect' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'closed_won', label: 'Closed Won' },
  { id: 'closed_lost', label: 'Closed Lost' },
];

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
