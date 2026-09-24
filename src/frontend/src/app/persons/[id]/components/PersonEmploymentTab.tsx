'use client';

import React from 'react';
import Link from 'next/link';
import { CareerItem } from '../types';
import { formatDate } from '@/lib/dateUtils';

interface PersonEmploymentTabProps {
  careerItems: CareerItem[];
  onOpenLinkModal: () => void;
}

export function PersonEmploymentTab({
  careerItems,
  onOpenLinkModal,
}: PersonEmploymentTabProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900">Career & Employment History</h2>
          <p className="text-xs text-slate-500">Verified company affiliations, current & past roles</p>
        </div>
        <button
          onClick={onOpenLinkModal}
          className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3.5 py-2 rounded-lg shadow-sm"
        >
          + Add Employment Record
        </button>
      </div>

      {careerItems.length === 0 ? (
        <div className="p-10 text-center text-slate-500 space-y-2">
          <p className="text-sm">No linked employment history found for this person.</p>
          <button
            onClick={onOpenLinkModal}
            className="text-xs text-blue-600 hover:underline font-semibold"
          >
            + Link to a Company now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {careerItems.map((item) => (
            <div
              key={item.relationship_id}
              className={`p-4 rounded-xl border transition shadow-sm ${
                item.is_current
                  ? 'bg-emerald-50/30 border-emerald-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    <Link
                      href={`/companies/${item.company.id}`}
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <span>{item.company.name}</span>
                      <span className="text-xs">↗</span>
                    </Link>
                  </h3>
                  <div className="text-sm font-semibold text-slate-700 mt-0.5">
                    {item.title || 'Role not specified'}
                  </div>
                </div>
                {item.is_current ? (
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-full">
                    Current Role
                  </span>
                ) : (
                  <span className="text-[11px] bg-slate-100 text-slate-600 border border-slate-200 font-medium px-2 py-0.5 rounded-full">
                    Past Role
                  </span>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                <div>
                  <dt className="text-slate-400 font-medium">Domain / Industry</dt>
                  <dd className="font-mono text-slate-800 truncate">
                    {item.company.domain || item.company.industry || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Tenure</dt>
                  <dd className="text-slate-800 font-medium">
                    {item.started_at ? formatDate(item.started_at) : 'Start date unknown'}{' '}
                    →{' '}
                    {item.is_current
                      ? 'Present'
                      : item.ended_at
                      ? formatDate(item.ended_at)
                      : 'End date unknown'}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
