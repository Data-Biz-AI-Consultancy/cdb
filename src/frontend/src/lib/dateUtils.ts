/**
 * Canonical date formatting and calculation utilities for CDB frontend.
 */

/**
 * Returns a human-friendly relative time string (e.g., 'Just now', '5m ago', '2h ago', 'Yesterday', '3d ago', 'Jan 15, 2026').
 */
export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) {
      // Future date
      const futureDays = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
      if (futureDays === 1) return 'Tomorrow';
      if (futureDays <= 30) return `in ${futureDays}d`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Alias for formatRelativeTime.
 */
export const timeAgo = formatRelativeTime;

/**
 * Formats a date string into a localized short/medium date (e.g., 'Aug 8, 2026').
 */
export function formatDate(
  dateStr?: string | null,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', options);
  } catch {
    return dateStr;
  }
}

/**
 * Formats a date string into a localized date & time (e.g., 'Aug 8, 2026, 05:30 PM').
 */
export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Groups a timestamp into standard timeline buckets ('Today', 'Yesterday', 'This Week', or 'Month Year').
 */
export function getDateBucket(dateStr?: string | null): string {
  if (!dateStr) return 'Earlier';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Earlier';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const actDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (actDate.getTime() === today.getTime()) return 'Today';
    if (actDate.getTime() === yesterday.getTime()) return 'Yesterday';
    if (actDate.getTime() >= sevenDaysAgo.getTime()) return 'This Week';
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return 'Earlier';
  }
}

/**
 * Checks if a target date has passed compared to now.
 */
export function isDatePast(targetDateStr?: string | null): boolean {
  if (!targetDateStr) return false;
  try {
    const date = new Date(targetDateStr);
    return !isNaN(date.getTime()) && date.getTime() < Date.now();
  } catch {
    return false;
  }
}
