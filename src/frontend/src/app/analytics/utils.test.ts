import { describe, it, expect } from 'vitest';
import { getSeverityBadge, getCategoryBadge } from './utils';

describe('Analytics utils', () => {
  it('returns appropriate severity badge styles', () => {
    expect(getSeverityBadge('critical')).toContain('rose');
    expect(getSeverityBadge('high')).toContain('amber');
    expect(getSeverityBadge('medium')).toContain('blue');
    expect(getSeverityBadge('low')).toContain('slate');
  });

  it('returns appropriate category badge styles', () => {
    expect(getCategoryBadge('opportunity')).toContain('emerald');
    expect(getCategoryBadge('risk')).toContain('rose');
    expect(getCategoryBadge('hybrid')).toContain('amber');
  });
});
