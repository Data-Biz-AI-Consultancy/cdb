import { SignalSeverity, DetectedSignalStatus } from './types';

export function getSeverityBadge(severity: SignalSeverity) {
  switch (severity) {
    case 'critical':
      return 'bg-rose-100 text-rose-800 border-rose-300';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'medium':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'low':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function getCategoryBadge(category: string) {
  switch (category?.toLowerCase()) {
    case 'opportunity':
      return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    case 'risk':
      return 'bg-rose-50 text-rose-700 border-rose-300';
    case 'hybrid':
      return 'bg-purple-50 text-purple-700 border-purple-300';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export function getStatusBadge(status: DetectedSignalStatus) {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    case 'acknowledged':
      return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'actioned':
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'snoozed':
      return 'bg-purple-100 text-purple-800 border-purple-300 font-semibold';
    case 'resolved':
      return 'bg-teal-100 text-teal-800 border-teal-300 font-semibold';
    case 'dismissed':
      return 'bg-slate-100 text-slate-600 border-slate-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function getPriorityBadge(priorityTier?: string | null, effectivePolarity?: string | null) {
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
}

export function getEvidenceHealthBadge(
  evidenceStatus?: string,
  isUncertain?: boolean,
  hasConflict?: boolean
) {
  if (hasConflict || evidenceStatus === 'conflicting') {
    return {
      label: 'Conflicting Evidence',
      className: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: '⚠️',
    };
  }
  if (evidenceStatus === 'stale') {
    return {
      label: 'Stale Evidence (>60d old)',
      className: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: '🟡',
    };
  }
  if (evidenceStatus === 'incomplete') {
    return {
      label: 'Incomplete Context',
      className: 'bg-orange-100 text-orange-800 border-orange-300',
      icon: '🟠',
    };
  }
  if (isUncertain || evidenceStatus === 'unverified') {
    return {
      label: 'Unverified Evidence',
      className: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: '🔍',
    };
  }
  return {
    label: 'Fresh & Verified Evidence',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    icon: '🟢',
  };
}
