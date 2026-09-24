'use client';

import React from 'react';

interface TablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Singular entity label, e.g. "company", "lead". Defaults to "record". */
  entityLabel?: string;
  /** Optional plural entity label, e.g. "activities". Defaults to auto-pluralized entityLabel. */
  entityLabelPlural?: string;
  /** Available page size options. Defaults to [10, 25, 50, 100]. */
  pageSizeOptions?: number[];
  /** Whether to show the per-page selector. Defaults to true. */
  showPageSize?: boolean;
  /** Whether to show the First/Last page jump buttons. Defaults to true. */
  showFirstLast?: boolean;
}

/**
 * Shared table pagination bar — «/Previous/Page X of N/Next/» + per-page selector.
 *
 * Previously copy-pasted across:
 *   companies/page, persons/page, activities/page, leads/page
 */
export const TablePagination: React.FC<TablePaginationProps> = ({
  page,
  totalPages,
  total,
  pageSize,
  loading = false,
  onPageChange,
  onPageSizeChange,
  entityLabel = 'record',
  entityLabelPlural,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSize = true,
  showFirstLast = true,
}) => {
  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);
  const pluralLabel =
    entityLabelPlural ||
    (entityLabel.endsWith('y') && !['ay', 'ey', 'oy', 'uy'].some((v) => entityLabel.endsWith(v))
      ? `${entityLabel.slice(0, -1)}ies`
      : `${entityLabel}s`);
  const displayedLabel = total === 1 ? entityLabel : pluralLabel;

  return (
    <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-600 font-medium">
      {/* Count summary */}
      <div data-testid="pagination-info">
        {total === 0 ? (
          <span>No {pluralLabel} found</span>
        ) : (
          <>
            Showing{' '}
            <span className="font-bold text-slate-800">{startRecord}</span> to{' '}
            <span className="font-bold text-slate-800">{endRecord}</span> of{' '}
            <span className="font-bold text-slate-800">{total}</span>{' '}
            {displayedLabel}
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Per-page selector */}
        {showPageSize && (
          <div className="flex items-center gap-1.5">
            <span>Per page:</span>
            <select
              aria-label="Items per page"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-700 focus:outline-none"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page navigation */}
        <div className="flex items-center gap-1">
          {showFirstLast && (
            <button
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(1)}
              className="px-2.5 py-1 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-semibold transition"
              title="First page"
              aria-label="First page"
            >
              «
            </button>
          )}

          <button
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            data-testid="pagination-prev"
            className="px-3 py-1 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-semibold transition"
          >
            Previous
          </button>

          <span className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-xs">
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            data-testid="pagination-next"
            className="px-3 py-1 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-semibold transition"
          >
            Next
          </button>

          {showFirstLast && (
            <button
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(totalPages)}
              className="px-2.5 py-1 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-semibold transition"
              title="Last page"
              aria-label="Last page"
            >
              »
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TablePagination;
