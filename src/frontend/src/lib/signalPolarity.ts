/**
 * Signal polarity classification helpers.
 *
 * Single source of truth for determining whether a detected signal is a
 * risk, opportunity, or hybrid. Previously duplicated verbatim across
 * useOpportunitySignals, OpportunitySignalsTab, and CompanySignalsTab.
 */

/** Minimal shape needed for polarity checks — works across all signal types. */
export interface SignalPolarityShape {
  effective_polarity?: string | null;
  signal?: { category?: string | null } | null;
  signal_id?: string | null;
  signal_type?: string | null;
}

/**
 * Returns true when a signal should be classified as a RISK.
 * Checks effective_polarity, signal category, and well-known risk slugs.
 */
export function isSignalRisk(sig: SignalPolarityShape): boolean {
  return (
    sig.effective_polarity === 'risk' ||
    sig.signal?.category === 'risk' ||
    !!(sig.signal_id?.includes('dormant')) ||
    !!(sig.signal_id?.includes('unanswered')) ||
    !!(sig.signal_id?.includes('competitor'))
  );
}

/**
 * Returns true when a signal should be classified as an OPPORTUNITY.
 * Checks effective_polarity, signal category, and well-known opportunity slugs.
 */
export function isSignalOpportunity(sig: SignalPolarityShape): boolean {
  return (
    sig.effective_polarity === 'opportunity' ||
    sig.signal?.category === 'opportunity' ||
    !!(sig.signal_id?.includes('hiring')) ||
    !!(sig.signal_id?.includes('funding')) ||
    !!(sig.signal_id?.includes('expansion'))
  );
}

export type SignalSubFilter = 'all' | 'active' | 'risk' | 'opportunity';

/**
 * Applies a sub-filter to a list of signals.
 * Works generically so it can be used in both opportunity and company contexts.
 */
export function applySignalSubFilter<T extends SignalPolarityShape & { status?: string }>(
  signals: T[],
  filter: SignalSubFilter
): T[] {
  switch (filter) {
    case 'active':
      return signals.filter((s) => s.status === 'active');
    case 'risk':
      return signals.filter(isSignalRisk);
    case 'opportunity':
      return signals.filter(isSignalOpportunity);
    case 'all':
    default:
      return signals;
  }
}

export interface PolarityStyle {
  badge: string;
  cardBorder: string;
  label: string;
  icon: string;
}

/** Returns Tailwind classes + label for a signal's polarity — used on cards. */
export function getPolarityStyle(sig: SignalPolarityShape): PolarityStyle {
  if (isSignalRisk(sig)) {
    return {
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
      cardBorder: 'border-l-4 border-l-rose-500',
      label: 'Risk Signal',
      icon: '⚠️',
    };
  }
  if (isSignalOpportunity(sig)) {
    return {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      cardBorder: 'border-l-4 border-l-emerald-500',
      label: 'Growth Opportunity',
      icon: '🚀',
    };
  }
  return {
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    cardBorder: 'border-l-4 border-l-purple-500',
    label: 'Hybrid Signal',
    icon: '⚡',
  };
}
