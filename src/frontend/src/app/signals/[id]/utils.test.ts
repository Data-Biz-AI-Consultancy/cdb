import { describe, it, expect } from 'vitest';
import {
  getSeverityBadge,
  getCategoryBadge,
  getStatusBadge,
  getPriorityBadge,
  getEvidenceHealthBadge,
} from './utils';

describe('Signal [id] utils', () => {
  it('returns correct severity badge classes', () => {
    expect(getSeverityBadge('critical')).toContain('rose');
    expect(getSeverityBadge('high')).toContain('orange');
    expect(getSeverityBadge('medium')).toContain('amber');
    expect(getSeverityBadge('low')).toContain('slate');
  });

  it('returns correct category badge classes', () => {
    expect(getCategoryBadge('opportunity')).toContain('emerald');
    expect(getCategoryBadge('risk')).toContain('rose');
    expect(getCategoryBadge('hybrid')).toContain('purple');
  });

  it('returns correct status badge classes', () => {
    expect(getStatusBadge('active')).toContain('emerald');
    expect(getStatusBadge('acknowledged')).toContain('sky');
    expect(getStatusBadge('actioned')).toContain('indigo');
    expect(getStatusBadge('snoozed')).toContain('purple');
    expect(getStatusBadge('resolved')).toContain('teal');
    expect(getStatusBadge('dismissed')).toContain('slate');
  });

  it('returns priority badges according to polarity and tier', () => {
    const p0Opp = getPriorityBadge('P0', 'opportunity');
    expect(p0Opp.label).toBe('P0 • Critical Opportunity');
    expect(p0Opp.className).toContain('emerald');

    const p0Risk = getPriorityBadge('P0', 'risk');
    expect(p0Risk.label).toBe('P0 • Critical Risk');
    expect(p0Risk.className).toContain('rose');

    const p1Opp = getPriorityBadge('P1', 'opportunity');
    expect(p1Opp.label).toBe('P1 • High Opportunity');

    const p2Risk = getPriorityBadge('P2', 'risk');
    expect(p2Risk.label).toBe('P2 • Medium Risk');

    const p4 = getPriorityBadge('P4', 'risk');
    expect(p4.label).toBe('P4 • Low Impact');
  });

  it('evaluates evidence health badge correctly', () => {
    expect(getEvidenceHealthBadge('conflicting', false, true).label).toBe('Conflicting Evidence');
    expect(getEvidenceHealthBadge('stale', false, false).label).toContain('Stale Evidence');
    expect(getEvidenceHealthBadge('incomplete', false, false).label).toBe('Incomplete Context');
    expect(getEvidenceHealthBadge('unverified', true, false).label).toBe('Unverified Evidence');
    expect(getEvidenceHealthBadge('fresh', false, false).label).toBe('Fresh & Verified Evidence');
  });
});
