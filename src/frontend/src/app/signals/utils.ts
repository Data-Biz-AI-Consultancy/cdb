import { SignalSeverity, SignalCategory, DetectedSignalStatus } from './types';

export const normalizeSlug = (slug?: string | null): string => {
  if (!slug) return '';
  return slug
    .toLowerCase()
    .trim()
    .replace(/_accounts$/, '_account')
    .replace(/_conversations$/, '_conversation')
    .replace(/_contracts$/, '_contract')
    .replace(/_changes$/, '_change')
    .replace(/_events$/, '_event')
    .replace(/_signals$/, '_signal')
    .replace(/_or_funding_/, '_funding_');
};

export const getSeverityBadge = (severity: SignalSeverity | string) => {
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

export const getCategoryBadge = (category: SignalCategory | string) => {
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

export const getStatusBadge = (status: DetectedSignalStatus | string) => {
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

export const getPriorityBadge = (priorityTier?: string | null, effectivePolarity?: string | null) => {
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

export const getEvidenceHealthBadge = (
  evidenceStatus?: string,
  isUncertain?: boolean,
  hasConflict?: boolean
) => {
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
