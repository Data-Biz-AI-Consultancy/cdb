/**
 * Shared signal badge / styling helpers.
 *
 * Single source of truth for all Tailwind badge class-strings used across
 * companies, opportunities, and signals modules.
 */

export type SignalSeverity = 'critical' | 'high' | 'medium' | 'low';
export type SignalCategory = 'opportunity' | 'risk' | 'hybrid';
export type DetectedSignalStatus =
  | 'active'
  | 'acknowledged'
  | 'actioned'
  | 'snoozed'
  | 'dismissed'
  | 'resolved';
export type PriorityTier = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export const getSeverityBadge = (severity: SignalSeverity | string): string => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'bg-rose-100 text-rose-800 border-rose-200 font-semibold';
    case 'high':
      return 'bg-amber-100 text-amber-800 border-amber-200 font-medium';
    case 'medium':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'low':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export const getCategoryBadge = (category: SignalCategory | string): string => {
  switch (category?.toLowerCase()) {
    case 'opportunity':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'risk':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'hybrid':
    default:
      return 'bg-purple-100 text-purple-800 border-purple-200';
  }
};

export const getStatusBadge = (status: DetectedSignalStatus | string): string => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'acknowledged':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'actioned':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'snoozed':
      return 'bg-purple-50 text-purple-700 border-purple-200 font-medium';
    case 'resolved':
      return 'bg-teal-50 text-teal-700 border-teal-200 font-medium';
    case 'dismissed':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

export interface PriorityBadgeResult {
  tier: string;
  label: string;
  shortLabel: string;
  className: string;
}

export const getPriorityBadge = (
  priorityTier?: string | null,
  effectivePolarity?: string | null
): PriorityBadgeResult => {
  const tier = (priorityTier || 'P2').toUpperCase();
  const pol = (effectivePolarity || '').toLowerCase();
  const isOpp = pol === 'opportunity';

  switch (tier) {
    case 'P0':
      return {
        tier: 'P0',
        label: isOpp ? 'P0 • Critical Opportunity' : 'P0 • Critical Risk',
        shortLabel: 'P0 Critical',
        className: isOpp
          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-bold'
          : 'bg-rose-600 text-white border-rose-700 shadow-sm font-bold',
      };
    case 'P1':
      return {
        tier: 'P1',
        label: isOpp ? 'P1 • High Opportunity' : 'P1 • High Risk',
        shortLabel: 'P1 High',
        className: isOpp
          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
          : 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
      };
    case 'P2':
      return {
        tier: 'P2',
        label: isOpp ? 'P2 • Medium Opportunity' : 'P2 • Medium Risk',
        shortLabel: 'P2 Medium',
        className: isOpp
          ? 'bg-teal-50 text-teal-800 border-teal-200 font-semibold'
          : 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
      };
    case 'P3':
      return {
        tier: 'P3',
        label: isOpp ? 'P3 • Moderate Opportunity' : 'P3 • Moderate Risk',
        shortLabel: 'P3 Moderate',
        className: 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
      };
    case 'P4':
    default:
      return {
        tier: 'P4',
        label: 'P4 • Low Impact',
        shortLabel: 'P4 Low',
        className: 'bg-slate-50 text-slate-500 border-slate-200 font-normal',
      };
  }
};

export interface EvidenceHealthBadgeResult {
  label: string;
  className: string;
  icon: string;
}

export const getEvidenceHealthBadge = (
  evidenceStatus?: string,
  isUncertain?: boolean,
  hasConflict?: boolean
): EvidenceHealthBadgeResult => {
  if (hasConflict || evidenceStatus === 'conflicting') {
    return {
      label: 'Conflicting',
      className: 'bg-rose-100 text-rose-800 border-rose-200',
      icon: '⚠️',
    };
  }
  if (evidenceStatus === 'stale') {
    return {
      label: 'Stale (>60d)',
      className: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: '🟡',
    };
  }
  if (evidenceStatus === 'incomplete') {
    return {
      label: 'Incomplete',
      className: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: '🟠',
    };
  }
  if (isUncertain || evidenceStatus === 'unverified') {
    return {
      label: 'Unverified',
      className: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: '🔍',
    };
  }
  return {
    label: 'Fresh Evidence',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: '🟢',
  };
};

/** Polarity card accent border class, used on signal cards across modules. */
export const getPolarityBorderAccent = (
  polarity: 'opportunity' | 'risk' | 'hybrid' | string,
  isEscalated?: boolean
): string => {
  if (isEscalated) return 'border-l-4 border-l-rose-600 ring-1 ring-rose-500/20';
  switch (polarity) {
    case 'opportunity':
      return 'border-l-4 border-l-emerald-500';
    case 'risk':
      return 'border-l-4 border-l-rose-500';
    default:
      return 'border-l-4 border-l-amber-500';
  }
};
