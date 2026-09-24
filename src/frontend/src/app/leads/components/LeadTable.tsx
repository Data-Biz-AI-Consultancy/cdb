'use client';

import React from 'react';
import Link from 'next/link';
import { Lead } from '../types';
import { formatDateTime } from '@/lib/dateUtils';
import TablePagination from '@/components/TablePagination';

interface LeadTableProps {
  leads: Lead[];
  loading: boolean;
  selectedIds: string[];
  isAllCurrentPageSelected: boolean;
  onSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onViewLead: (lead: Lead) => void;
  onOpenConvert: (lead: Lead) => void;
  onOpenAdvance: (lead: Lead) => void;
  onOpenDisqualify: (lead: Lead) => void;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const getStageBadge = (stage: string) => {
  switch (stage) {
    case 'new':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'contacted':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'qualified':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'stale':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'converted':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'disqualified':
      return 'bg-slate-100 text-slate-500 border-slate-200';
    case 'expired':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const getSignalBadge = (sig?: string | null) => {
  const s = (sig || '').toLowerCase();
  if (s === 'strong' || s === 'high') {
    return (
      <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-semibold">
        🔥 Strong
      </span>
    );
  }
  if (s === 'medium') {
    return (
      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-semibold">
        ⚡ Medium
      </span>
    );
  }
  return (
    <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium">
      🌱 Low
    </span>
  );
};

const getInitials = (name?: string | null) => {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  loading,
  selectedIds,
  isAllCurrentPageSelected,
  onSelectAll,
  onToggleSelect,
  onViewLead,
  onOpenConvert,
  onOpenAdvance,
  onOpenDisqualify,
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 select-none">
            <tr>
              <th className="p-3.5 pl-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllCurrentPageSelected}
                  onChange={onSelectAll}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                  title="Select all on this page"
                />
              </th>
              <th className="p-3.5 min-w-[150px]">Contact</th>
              <th className="p-3.5 min-w-[140px]">Company</th>
              <th className="p-3.5 min-w-[130px]">Intent</th>
              <th className="p-3.5 min-w-[110px]">Signal & Source</th>
              <th className="p-3.5 min-w-[200px]">Title (Summary)</th>
              <th className="p-3.5 min-w-[240px]">Description / Conversation Notes</th>
              <th className="p-3.5 min-w-[120px]">Stage / Status</th>
              <th className="p-3.5 min-w-[160px] whitespace-nowrap">Created & Updated</th>
              <th className="p-3.5 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={10} className="p-12 text-center text-slate-500">
                  <div className="inline-block animate-spin mr-2">⏳</div>
                  Loading leads...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-12 text-center text-slate-500">
                  <div className="text-3xl mb-2">🎯</div>
                  <div className="font-semibold text-slate-800">No leads found</div>
                  <div className="text-xs text-slate-400 mt-1">Try adjusting your search terms or filters</div>
                </td>
              </tr>
            ) : (
              leads.map((l) => {
                const leadDesc = l.description || l.notes || '';
                const hasLongDesc = leadDesc.length > 90;
                const isSelected = selectedIds.includes(l.id);

                const formattedIntent = (l.intent || 'General Inquiry')
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (char) => char.toUpperCase());

                const isResolved = ['converted', 'disqualified', 'expired'].includes(l.stage);

                return (
                  <tr
                    key={l.id}
                    className={`hover:bg-slate-50/80 transition ${
                      isSelected ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    {/* 1. Selection Checkbox */}
                    <td className="p-3.5 pl-4 align-top text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(l.id)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4 mt-1"
                      />
                    </td>

                    {/* 2. Contact Person */}
                    <td className="p-3.5 align-top">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {getInitials(l.person_name)}
                        </div>
                        <div>
                          {l.person_id ? (
                            <Link
                              href={`/persons/${l.person_id}`}
                              className="font-semibold text-slate-900 hover:text-blue-600 hover:underline transition block leading-snug"
                            >
                              {l.person_name || 'Contact Person'}
                            </Link>
                          ) : (
                            <span className="font-semibold text-slate-900 leading-snug">
                              {l.person_name || 'Unknown Person'}
                            </span>
                          )}
                          {l.person_email && (
                            <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[150px]">
                              {l.person_email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. Company */}
                    <td className="p-3.5 align-top">
                      {l.company_name ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-medium text-xs text-slate-900">
                            <span>🏢</span>
                            {l.company_id ? (
                              <Link
                                href={`/companies/${l.company_id}`}
                                className="hover:underline hover:text-blue-600 text-slate-900 font-semibold"
                              >
                                {l.company_name}
                              </Link>
                            ) : (
                              <span>{l.company_name}</span>
                            )}
                          </div>
                          {l.company_domain && (
                            <div className="text-[11px] text-slate-400 pl-4 truncate max-w-[140px]">
                              {l.company_domain}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* 4. Intent */}
                    <td className="p-3.5 align-top">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        <span>🎯</span>
                        <span>{formattedIntent}</span>
                      </span>
                    </td>

                    {/* 5. Signal & Source */}
                    <td className="p-3.5 align-top">
                      <div className="space-y-1">
                        <div>{getSignalBadge(l.signal_strength)}</div>
                        <div className="text-[11px] text-slate-500 capitalize">
                          {(l.source || 'inbound').replace(/_/g, ' ')}
                        </div>
                      </div>
                    </td>

                    {/* 6. Title / Summary */}
                    <td className="p-3.5 align-top">
                      <div className="font-medium text-xs text-slate-900 leading-snug">
                        {l.title || 'Inbound Lead'}
                      </div>
                      {l.title && l.title !== l.intent && (
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <span>✨</span>
                          <span>LLM Summary</span>
                        </div>
                      )}
                    </td>

                    {/* 7. Description / Notes */}
                    <td className="p-3.5 align-top">
                      {leadDesc ? (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed whitespace-pre-line bg-slate-50 p-2 rounded-md border border-slate-100">
                            {leadDesc}
                          </p>
                          {hasLongDesc && (
                            <button
                              onClick={() => onViewLead(l)}
                              className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-1"
                            >
                              <span>👁️</span>
                              <span>View Full Description / Transcript</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No notes provided</span>
                      )}
                    </td>

                    {/* 8. Stage / Staleness */}
                    <td className="p-3.5 align-top whitespace-nowrap">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider ${getStageBadge(
                          l.stage
                        )}`}
                      >
                        {l.stage}
                      </span>

                      {/* Staleness Indicators */}
                      {l.is_stale && !isResolved && (
                        <div className="text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                          <span>⏳</span>
                          <span>{l.days_inactive ?? 30}d inactive (Stale)</span>
                        </div>
                      )}
                      {l.is_expired && !['converted', 'disqualified'].includes(l.stage) && (
                        <div className="text-[10px] text-rose-700 font-semibold mt-1 flex items-center gap-1">
                          <span>🛑</span>
                          <span>{l.days_inactive ?? 90}d inactive (Expired)</span>
                        </div>
                      )}

                      {l.disqualification_reason && (
                        <div className="text-[10px] text-slate-500 mt-1 max-w-[120px] truncate">
                          Reason: {l.disqualification_reason}
                        </div>
                      )}
                    </td>

                    {/* 9. Created & Updated Timestamps */}
                    <td className="p-3.5 align-top text-xs whitespace-nowrap space-y-1">
                      <div>
                        <span className="text-slate-400 font-medium text-[11px]">Created: </span>
                        <span className="text-slate-700 font-medium">{formatDateTime(l.created_at)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium text-[11px]">Updated: </span>
                        <span className="text-slate-600 font-medium">{formatDateTime(l.updated_at)}</span>
                      </div>
                    </td>

                    {/* 10. Actions */}
                    <td className="p-3.5 pr-4 align-top text-right whitespace-nowrap space-y-1">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isResolved && (
                          <>
                            <button
                              onClick={() => onOpenAdvance(l)}
                              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium px-2.5 py-1 rounded transition"
                              title="Advance Stage"
                            >
                              Advance →
                            </button>
                            <button
                              onClick={() => onOpenConvert(l)}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2.5 py-1 rounded shadow-2xs transition"
                            >
                              Convert to Opp
                            </button>
                          </>
                        )}
                        {l.stage === 'converted' && (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            ✓ Converted
                          </span>
                        )}
                        {l.stage === 'expired' && (
                          <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                            🛑 Expired
                          </span>
                        )}
                        {!isResolved && (
                          <button
                            onClick={() => onOpenDisqualify(l)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-medium px-1.5 py-1 hover:bg-rose-50 rounded transition"
                            title="Disqualify / Reject Lead"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        entityLabel="lead"
        pageSizeOptions={[10, 25, 50, 100]}
      />
    </div>
  );
};

export default LeadTable;
