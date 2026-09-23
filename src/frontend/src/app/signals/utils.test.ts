import { describe, it, expect } from 'vitest';
import {
  normalizeSlug,
  getSeverityBadge,
  getCategoryBadge,
  getStatusBadge,
  getPriorityBadge,
  getEvidenceHealthBadge,
} from './utils';

describe('signals utils', () => {
  describe('normalizeSlug', () => {
    it('handles empty and null slugs gracefully', () => {
      expect(normalizeSlug(null)).toBe('');
      expect(normalizeSlug(undefined)).toBe('');
      expect(normalizeSlug('')).toBe('');
    });

    it('normalizes singular/plural and variation suffixes', () => {
      expect(normalizeSlug('dormant_strategic_accounts')).toBe('dormant_strategic_account');
      expect(normalizeSlug('unanswered_conversations')).toBe('unanswered_conversation');
      expect(normalizeSlug('expiring_contracts')).toBe('expiring_contract');
      expect(normalizeSlug('contact_role_changes')).toBe('contact_role_change');
      expect(normalizeSlug('macro_market_events')).toBe('macro_market_event');
      expect(normalizeSlug('custom_risk_signals')).toBe('custom_risk_signal');
      expect(normalizeSlug('growth_or_funding_signals')).toBe('growth_funding_signal');
    });
  });

  describe('getSeverityBadge', () => {
    it('returns correct CSS classes for critical, high, medium, low', () => {
      expect(getSeverityBadge('critical')).toContain('bg-rose-100');
      expect(getSeverityBadge('high')).toContain('bg-amber-100');
      expect(getSeverityBadge('medium')).toContain('bg-blue-100');
      expect(getSeverityBadge('low')).toContain('bg-slate-100');
      expect(getSeverityBadge('unknown')).toContain('bg-slate-100');
    });
  });

  describe('getCategoryBadge', () => {
    it('returns appropriate category badge styles', () => {
      expect(getCategoryBadge('opportunity')).toContain('bg-emerald-100');
      expect(getCategoryBadge('risk')).toContain('bg-red-100');
      expect(getCategoryBadge('hybrid')).toContain('bg-purple-100');
      expect(getCategoryBadge('other')).toContain('bg-purple-100');
    });
  });

  describe('getStatusBadge', () => {
    it('returns appropriate status badges', () => {
      expect(getStatusBadge('active')).toContain('bg-emerald-50');
      expect(getStatusBadge('acknowledged')).toContain('bg-sky-50');
      expect(getStatusBadge('actioned')).toContain('bg-indigo-50');
      expect(getStatusBadge('snoozed')).toContain('bg-purple-50');
      expect(getStatusBadge('resolved')).toContain('bg-teal-50');
      expect(getStatusBadge('dismissed')).toContain('bg-slate-100');
      expect(getStatusBadge('other')).toContain('bg-slate-50');
    });
  });

  describe('getPriorityBadge', () => {
    it('returns correct tier and label for P0 opportunity and risk', () => {
      const oppP0 = getPriorityBadge('P0', 'opportunity');
      expect(oppP0.tier).toBe('P0');
      expect(oppP0.label).toBe('P0 • Critical Opportunity');
      expect(oppP0.className).toContain('bg-emerald-600');

      const riskP0 = getPriorityBadge('P0', 'risk');
      expect(riskP0.tier).toBe('P0');
      expect(riskP0.label).toBe('P0 • Critical Risk');
      expect(riskP0.className).toContain('bg-rose-600');
    });

    it('returns correct tier and label for P1, P2, P3, and P4', () => {
      const oppP1 = getPriorityBadge('P1', 'opportunity');
      expect(oppP1.tier).toBe('P1');
      expect(oppP1.label).toBe('P1 • High Opportunity');

      const riskP2 = getPriorityBadge('P2', 'risk');
      expect(riskP2.tier).toBe('P2');
      expect(riskP2.label).toBe('P2 • Medium Risk');

      const oppP3 = getPriorityBadge('P3', 'opportunity');
      expect(oppP3.tier).toBe('P3');

      const p4 = getPriorityBadge('P4');
      expect(p4.tier).toBe('P4');
      expect(p4.label).toBe('P4 • Low Impact');
    });
  });

  describe('getEvidenceHealthBadge', () => {
    it('returns Conflicting when hasConflict is true', () => {
      const badge = getEvidenceHealthBadge(undefined, false, true);
      expect(badge.label).toBe('Conflicting');
      expect(badge.icon).toBe('⚠️');
    });

    it('returns Stale when status is stale', () => {
      const badge = getEvidenceHealthBadge('stale', false, false);
      expect(badge.label).toBe('Stale (>60d)');
      expect(badge.icon).toBe('🟡');
    });

    it('returns Incomplete when status is incomplete', () => {
      const badge = getEvidenceHealthBadge('incomplete', false, false);
      expect(badge.label).toBe('Incomplete');
      expect(badge.icon).toBe('🟠');
    });

    it('returns Unverified when isUncertain is true or status is unverified', () => {
      const badge1 = getEvidenceHealthBadge(undefined, true, false);
      expect(badge1.label).toBe('Unverified');
      expect(badge1.icon).toBe('🔍');

      const badge2 = getEvidenceHealthBadge('unverified', false, false);
      expect(badge2.label).toBe('Unverified');
    });

    it('returns Fresh Evidence by default', () => {
      const badge = getEvidenceHealthBadge('fresh', false, false);
      expect(badge.label).toBe('Fresh Evidence');
      expect(badge.icon).toBe('🟢');
    });
  });
});
