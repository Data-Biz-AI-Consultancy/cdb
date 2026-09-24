/**
 * signals/utils.ts
 *
 * Re-exports canonical badge helpers from @/lib/signalBadges and
 * polarity utilities from @/lib/signalPolarity so that all existing
 * imports within the signals module continue to work unchanged.
 *
 * New code outside this module should import directly from the lib files.
 */

export {
  getSeverityBadge,
  getCategoryBadge,
  getStatusBadge,
  getPriorityBadge,
  getEvidenceHealthBadge,
  getPolarityBorderAccent,
} from '@/lib/signalBadges';

export { normalizeSlug } from './normalizeSlug';
