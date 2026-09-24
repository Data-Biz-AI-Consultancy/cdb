'use client';

import React from 'react';
import Link from 'next/link';
import { PersonItem } from '../types';
import { formatDateTime } from '@/lib/dateUtils';
import TablePagination from '@/components/TablePagination';

interface PersonsTableProps {
  persons: PersonItem[];
  loading: boolean;
  selectedIds: string[];
  isAllCurrentPageSelected: boolean;
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectRow: (id: string) => void;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  onDelete: (id: string, name: string) => void;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const PersonsTable: React.FC<PersonsTableProps> = ({
  persons,
  loading,
  selectedIds,
  isAllCurrentPageSelected,
  onSelectAll,
  onSelectRow,
  sortField,
  sortOrder,
  onSort,
  onDelete,
  page,
  pageSize,
  total,
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
              <th className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllCurrentPageSelected}
                  onChange={onSelectAll}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                  title="Select all on this page"
                />
              </th>
              <th
                onClick={() => onSort('first_name')}
                className="p-3 cursor-pointer hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Name</span>
                  {sortField === 'first_name' ? (
                    <span className="text-blue-600">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  ) : (
                    <span className="text-slate-400 text-xs">↕</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => onSort('primary_email')}
                className="p-3 cursor-pointer hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Email</span>
                  {sortField === 'primary_email' ? (
                    <span className="text-blue-600">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  ) : (
                    <span className="text-slate-400 text-xs">↕</span>
                  )}
                </div>
              </th>
              <th className="p-3">Phone</th>
              <th className="p-3">LinkedIn</th>
              <th
                onClick={() => onSort('country')}
                className="p-3 cursor-pointer hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Location</span>
                  {sortField === 'country' || sortField === 'city' ? (
                    <span className="text-blue-600">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  ) : (
                    <span className="text-slate-400 text-xs">↕</span>
                  )}
                </div>
              </th>
              <th className="p-3">Sources</th>
              <th
                onClick={() => onSort('created_at')}
                className="p-3 cursor-pointer hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Created At</span>
                  {sortField === 'created_at' ? (
                    <span className="text-blue-600">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  ) : (
                    <span className="text-slate-400 text-xs">↕</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => onSort('updated_at')}
                className="p-3 cursor-pointer hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Last Edited</span>
                  {sortField === 'updated_at' ? (
                    <span className="text-blue-600">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                  ) : (
                    <span className="text-slate-400 text-xs">↕</span>
                  )}
                </div>
              </th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={10} className="p-10 text-center text-slate-500">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading persons...</span>
                  </div>
                </td>
              </tr>
            ) : persons.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-10 text-center text-slate-500">
                  No person records found.
                </td>
              </tr>
            ) : (
              persons.map((p) => {
                const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unnamed';
                const isSelected = selectedIds.includes(p.id);

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50 transition ${isSelected ? 'bg-blue-50/50' : ''}`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectRow(p.id)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                      />
                    </td>
                    <td className="p-3 font-medium text-slate-900">
                      <Link href={`/persons/${p.id}`} className="text-blue-600 hover:underline">
                        {fullName}
                      </Link>
                    </td>
                    <td className="p-3 text-slate-600">{p.primary_email || '—'}</td>
                    <td className="p-3 text-slate-600">{p.primary_phone || '—'}</td>
                    <td className="p-3 text-slate-600 text-xs max-w-[180px] truncate">
                      {p.linkedin_url ? (
                        <a
                          href={p.linkedin_url.startsWith('http') ? p.linkedin_url : `https://${p.linkedin_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline truncate block"
                          title={p.linkedin_url}
                        >
                          {p.linkedin_url}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-slate-600">
                      {[p.city, p.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {(p.sources || []).map((s: string) => (
                          <span
                            key={s}
                            className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded border border-slate-200 font-mono"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-slate-500 whitespace-nowrap" title={p.created_at}>
                      {formatDateTime(p.created_at)}
                    </td>
                    <td className="p-3 text-xs text-slate-500 whitespace-nowrap" title={p.updated_at}>
                      {formatDateTime(p.updated_at)}
                    </td>
                    <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/persons/${p.id}`}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded transition"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => onDelete(p.id, fullName)}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 rounded transition"
                      >
                        Delete
                      </button>
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
        total={total}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        entityLabel="person"
        entityLabelPlural="persons"
        pageSizeOptions={[10, 20, 50, 100]}
      />
    </div>
  );
};

export default PersonsTable;
