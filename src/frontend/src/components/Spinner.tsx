'use client';

import React from 'react';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3 border-[1.5px]',
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-7 w-7 border-2',
};

interface SpinnerProps {
  size?: SpinnerSize;
  /** Tailwind color class for the visible arc. Defaults to indigo-600. */
  color?: string;
  className?: string;
  label?: string;
}

/**
 * Indeterminate loading spinner.
 *
 * Previously inlined across:
 *   activities/page, opportunities/page, OpportunitySignalsTab,
 *   OpportunityHistoryTab, companies/page, and more.
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'border-indigo-600',
  className,
  label = 'Loading…',
}) => (
  <div
    role="status"
    aria-label={label}
    className={`${SIZE_CLASSES[size]} animate-spin rounded-full ${color} border-t-transparent ${className ?? ''}`}
  />
);

/**
 * Full-area centred loading state — drop-in replacement for the
 * "Loading…" skeleton row that appears across table pages.
 */
export const LoadingRows: React.FC<{
  colSpan?: number;
  message?: string;
}> = ({ colSpan = 7, message = 'Loading…' }) => (
  <tr>
    <td colSpan={colSpan} className="p-12 text-center text-slate-500">
      <div className="flex flex-col items-center justify-center gap-2">
        <Spinner size="lg" />
        <span className="text-sm">{message}</span>
      </div>
    </td>
  </tr>
);

export default Spinner;
