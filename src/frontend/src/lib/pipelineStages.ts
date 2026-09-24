/**
 * Canonical pipeline stage definitions shared across opportunities and companies.
 *
 * Previously duplicated in:
 *   - opportunities/types.ts (full StageDefinition with icons/colors)
 *   - companies/[id]/types.ts (id + label only)
 */

export interface StageDefinition {
  id: string;
  label: string;
  icon: string;
  color: string;
  headerBg: string;
  badge: string;
}

export const PIPELINE_STAGES: StageDefinition[] = [
  {
    id: 'prospect',
    label: 'Prospect',
    icon: '🎯',
    color: 'border-slate-300 bg-slate-50',
    headerBg: 'bg-slate-100 text-slate-700',
    badge: 'bg-slate-100 text-slate-700',
  },
  {
    id: 'qualified',
    label: 'Qualified',
    icon: '🔍',
    color: 'border-blue-300 bg-blue-50/30',
    headerBg: 'bg-blue-100 text-blue-800',
    badge: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'proposal',
    label: 'Proposal',
    icon: '📑',
    color: 'border-amber-300 bg-amber-50/30',
    headerBg: 'bg-amber-100 text-amber-800',
    badge: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'negotiation',
    label: 'Negotiation',
    icon: '🤝',
    color: 'border-purple-300 bg-purple-50/30',
    headerBg: 'bg-purple-100 text-purple-800',
    badge: 'bg-purple-100 text-purple-800',
  },
  {
    id: 'closed_won',
    label: 'Closed Won',
    icon: '🏆',
    color: 'border-emerald-300 bg-emerald-50/30',
    headerBg: 'bg-emerald-100 text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  {
    id: 'closed_lost',
    label: 'Closed Lost',
    icon: '❌',
    color: 'border-rose-300 bg-rose-50/30',
    headerBg: 'bg-rose-100 text-rose-800',
    badge: 'bg-rose-100 text-rose-800',
  },
];

/** Lightweight id+label pairs for use in selects/dropdowns. */
export const STAGE_OPTIONS = PIPELINE_STAGES.map(({ id, label }) => ({ id, label }));
