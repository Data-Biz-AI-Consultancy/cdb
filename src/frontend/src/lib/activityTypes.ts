/**
 * Activity type metadata — single source of truth for icon, label, and
 * Tailwind badge/color classes for each activity type.
 *
 * Previously declared three times under different names:
 *   - `TYPE_CONFIG` in activities/page.tsx
 *   - `ACTIVITY_TYPE_META` in companies/[id]/types.ts
 *   - `ACTIVITY_TYPE_META` (inline copy) in persons/[id]/page.tsx
 */

export type ActivityType =
  | 'meeting'
  | 'email'
  | 'linkedin_message'
  | 'whatsapp'
  | 'call'
  | 'note';

export interface ActivityPersonSummary {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email?: string | null;
  avatar_url?: string | null;
  linkedin_url?: string | null;
}

export interface ActivityCompanySummary {
  id: string;
  name: string;
  domain?: string | null;
  avatar_url?: string | null;
  industry?: string | null;
}

export interface Activity {
  id: string;
  person_id?: string | null;
  company_id?: string | null;
  person?: ActivityPersonSummary | null;
  company?: ActivityCompanySummary | null;
  type: ActivityType | string;
  source: 'notion' | 'gmail' | 'linkedin' | 'whatsapp' | 'manual' | string;
  source_id?: string | null;
  occurred_at: string;
  title?: string | null;
  summary?: string | null;
  raw_content?: string | null;
  attributes?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ActivityStats {
  total: number;
  by_type: Record<string, number>;
  by_source: Record<string, number>;
  timeline?: Array<{
    date: string;
    total: number;
    by_type: Record<string, number>;
  }>;
}

export interface ActivityTypeConfig {
  label: string;
  icon: string;
  /** Full Tailwind badge classes (bg + text + border). */
  badge: string;
  /** Card background. */
  bg: string;
  /** Card border. */
  border: string;
  /** Card text. */
  text: string;
  /** Condensed color string for timeline dots etc. */
  color: string;
}

export const ACTIVITY_TYPE_CONFIG: Record<string, ActivityTypeConfig> = {
  meeting: {
    label: 'Meeting',
    icon: '🤝',
    badge: 'bg-violet-100 text-violet-800 border-violet-200',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    color: 'bg-violet-100 text-violet-800 border-violet-200',
  },
  linkedin_message: {
    label: 'LinkedIn Message',
    icon: '💼',
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-800',
    color: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  email: {
    label: 'Email',
    icon: '✉️',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-800',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  call: {
    label: 'Phone Call',
    icon: '📞',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-800',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  note: {
    label: 'Note',
    icon: '📌',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    color: 'bg-slate-100 text-slate-800 border-slate-200',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: '💬',
    badge: 'bg-green-100 text-green-800 border-green-200',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-800',
    color: 'bg-green-100 text-green-800 border-green-200',
  },
};

/** Returns config for an activity type, with a sensible fallback. */
export function getActivityTypeConfig(type: string): ActivityTypeConfig {
  return (
    ACTIVITY_TYPE_CONFIG[type] ?? {
      label: type,
      icon: '📌',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      text: 'text-slate-700',
      color: 'bg-slate-100 text-slate-700 border-slate-200',
    }
  );
}

/** Source label + Tailwind class pairs for activity source badges. */
export const ACTIVITY_SOURCE_BADGES: Record<string, { label: string; bg: string }> = {
  linkedin: { label: 'LinkedIn', bg: 'bg-sky-100 text-sky-800' },
  notion: { label: 'Notion', bg: 'bg-stone-100 text-stone-800' },
  gmail: { label: 'Gmail', bg: 'bg-red-100 text-red-800' },
  whatsapp: { label: 'WhatsApp', bg: 'bg-emerald-100 text-emerald-800' },
  manual: { label: 'Manual', bg: 'bg-slate-100 text-slate-700' },
};
