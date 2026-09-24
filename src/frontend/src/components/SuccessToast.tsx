'use client';

import React from 'react';

interface SuccessToastProps {
  /** Null / undefined means hidden. */
  message: string | null | undefined;
  onDismiss: () => void;
  /** Optional override for additional wrapper classes. */
  className?: string;
}

/**
 * Transient success/confirmation banner.
 *
 * Appears when `message` is non-null. Pair with `useSuccessMessage` from
 * `@/lib/useSuccessMessage` for automatic dismiss-after-timeout behaviour.
 *
 * Previously copy-pasted in:
 *   companies/page, companies/[id]/page, persons/page, persons/[id]/page,
 *   leads/page, engagements/[id]/page, settings/users/page
 */
export const SuccessToast: React.FC<SuccessToastProps> = ({ message, onDismiss, className }) => {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`p-3.5 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-200 flex items-center justify-between shadow-sm animate-fade-in ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 font-medium">
        <span aria-hidden>✓</span>
        <span>{message}</span>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-emerald-600 hover:text-emerald-900 text-xs font-semibold px-1"
      >
        ✕
      </button>
    </div>
  );
};

export default SuccessToast;
