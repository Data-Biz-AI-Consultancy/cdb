/**
 * Types and metadata for Person Detail Page.
 */

export interface CareerItem {
  relationship_id: string;
  company: {
    id: string;
    name: string;
    domain?: string | null;
    industry?: string | null;
  };
  title?: string | null;
  is_current: boolean;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface PersonDetail {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email?: string | null;
  secondary_emails?: string[];
  primary_phone?: string | null;
  linkedin_url?: string | null;
  city?: string | null;
  country?: string | null;
  sources?: string[];
  attributes?: {
    segment?: string;
    temperature?: string;
    engagement_temperature?: string;
    tags?: string[];
    [key: string]: any;
  };
  career?: CareerItem[];
  created_at: string;
  updated_at: string;
}

export interface NoteFormData {
  title: string;
  summary: string;
}

export interface LinkCompanyFormData {
  company_id: string;
  title: string;
  is_current: boolean;
  started_at: string;
  ended_at: string;
}

export interface ActivityFormData {
  title: string;
  type: string;
  source: string;
  summary: string;
}

export interface OpportunityFormData {
  title: string;
  stage: string;
  value: string;
  currency: string;
  probability: number;
  expected_close_date: string;
  notes: string;
}

export interface LeadFormData {
  title: string;
  stage: string;
  source: string;
  intent: string;
  signal_strength: string;
  notes: string;
}

export const SEGMENT_META: Record<string, { label: string; bg: string; text: string; border: string; desc: string }> = {
  clients_and_prospects: {
    label: 'Clients & Prospects',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    desc: 'Active/past clients and warm prospective consulting deals',
  },
  hiring_decision_makers: {
    label: 'Hiring Decision-Makers',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    desc: 'Founders, CTOs, VPs of Data/Engineering, and Heads',
  },
  recruiters_and_talent: {
    label: 'Recruiters & Talent Acquisition',
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'text-purple-700',
    border: 'border-purple-200',
    desc: 'Internal/agency recruiters, talent partners, and headhunters',
  },
  former_colleagues_alumni: {
    label: 'Alumni & Former Colleagues',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
    border: 'border-amber-200',
    desc: 'Alumni from target tech & consulting networks',
  },
  peer_collaborators: {
    label: 'Peer Collaborators & Agencies',
    bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    desc: 'Fellow consultants, partner agencies, and tooling partners',
  },
  general_network: {
    label: 'General Network',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    text: 'text-slate-700',
    border: 'border-slate-200',
    desc: 'General network contacts and connections',
  },
};

export const TEMPERATURE_META: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  hot: { label: 'Hot', icon: '🔥', bg: 'bg-red-100 border-red-200', text: 'text-red-700' },
  warm: { label: 'Warm', icon: '☀️', bg: 'bg-amber-100 border-amber-200', text: 'text-amber-700' },
  dormant: { label: 'Dormant', icon: '⏳', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600' },
  cold: { label: 'Cold', icon: '❄️', bg: 'bg-blue-100 border-blue-200', text: 'text-blue-700' },
};
