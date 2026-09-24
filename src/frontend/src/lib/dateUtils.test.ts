import { describe, it, expect } from 'vitest';
import { formatRelativeTime, formatDate, formatDateTime, getDateBucket, isDatePast } from './dateUtils';

describe('dateUtils', () => {
  it('formats relative times correctly', () => {
    expect(formatRelativeTime(null)).toBe('—');
    expect(formatRelativeTime(undefined)).toBe('—');
    expect(formatRelativeTime('invalid-date')).toBe('invalid-date');

    const now = new Date();
    expect(formatRelativeTime(now.toISOString())).toBe('Just now');

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    expect(formatRelativeTime(tenMinutesAgo.toISOString())).toBe('10m ago');

    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeHoursAgo.toISOString())).toBe('3h ago');
  });

  it('formats absolute dates correctly', () => {
    expect(formatDate(null)).toBe('—');
    const d = '2026-08-08T12:00:00Z';
    expect(formatDate(d)).toContain('2026');
    expect(formatDateTime(d)).toContain('2026');
  });

  it('determines date bucket correctly', () => {
    expect(getDateBucket(null)).toBe('Earlier');
    expect(getDateBucket(new Date().toISOString())).toBe('Today');
  });

  it('checks if date is past', () => {
    expect(isDatePast(null)).toBe(false);
    expect(isDatePast(new Date(Date.now() - 100000).toISOString())).toBe(true);
    expect(isDatePast(new Date(Date.now() + 100000).toISOString())).toBe(false);
  });
});
