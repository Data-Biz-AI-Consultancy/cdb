'use client';

import React from 'react';
import Link from 'next/link';
import { EngagementItem } from '../types';
import { formatMoney } from '@/lib/currency';

interface EngagementCardProps {
  engagement: EngagementItem;
}

export function EngagementCard({ engagement: eng }: EngagementCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 p-5 shadow-sm transition space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full shrink-0 ${
              eng.status === 'active'
                ? 'bg-emerald-500'
                : eng.status === 'in_delivery'
                ? 'bg-blue-500'
                : eng.status === 'planning'
                ? 'bg-amber-500'
                : eng.status === 'completed'
                ? 'bg-purple-500'
                : 'bg-slate-400'
            }`}
          />
          <div>
            <Link
              href={`/engagements/${eng.id}`}
              className="text-base font-bold text-slate-900 hover:text-blue-600 transition"
            >
              {eng.title}
            </Link>
          </div>
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
            {eng.engagement_type.replace('_', ' ')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Rate & Total Value */}
          <div className="text-right">
            {eng.rate_value ? (
              <div className="text-sm font-bold text-slate-900">
                {formatMoney(eng.rate_value, eng.currency)}{' '}
                <span className="text-xs font-medium text-slate-500">/{eng.rate_type}</span>
              </div>
            ) : (
              <div className="text-sm font-bold text-slate-900">
                {formatMoney(eng.total_value, eng.currency, { includeCode: true })}
              </div>
            )}
            {eng.total_value && eng.rate_value && (
              <div className="text-xs text-slate-500">
                Cap: {formatMoney(eng.total_value, eng.currency, { includeCode: true })}
              </div>
            )}
          </div>

          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
              eng.status === 'active'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : eng.status === 'in_delivery'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : eng.status === 'planning'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : eng.status === 'completed'
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {eng.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Connections Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
        <div>
          <span className="text-slate-400 block mb-0.5">Client Organization:</span>
          {eng.company ? (
            <Link
              href={`/companies/${eng.company_id}`}
              className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              🏢 {eng.company.name}
            </Link>
          ) : (
            <span className="font-semibold text-slate-700">Client Org</span>
          )}
        </div>

        <div>
          <span className="text-slate-400 block mb-0.5">Connected Person(s):</span>
          {eng.persons && eng.persons.length > 0 ? (
            <div className="flex flex-wrap gap-1 items-center">
              {eng.persons.map((p) => (
                <Link
                  key={p.person_id}
                  href={`/persons/${p.person_id}`}
                  className="inline-flex items-center gap-1 bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-700 px-2 py-0.5 rounded text-xs font-medium transition"
                >
                  <span>👤 {p.person_name || p.person_email}</span>
                  {p.role && <span className="text-slate-400">({p.role.replace('_', ' ')})</span>}
                </Link>
              ))}
            </div>
          ) : (
            <span className="text-slate-400 italic">No contacts attached</span>
          )}
        </div>

        <div>
          <span className="text-slate-400 block mb-0.5">Timeline & Deadline:</span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800">
              {eng.start_date || 'Ongoing'} → {eng.expected_end_date || 'Open-ended'}
            </span>
            {eng.is_overdue && (
              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">
                Overdue
              </span>
            )}
            {eng.days_remaining !== null &&
              eng.days_remaining !== undefined &&
              eng.days_remaining >= 0 && (
                <span className="text-[11px] text-slate-500 font-mono">
                  ({eng.days_remaining}d left)
                </span>
              )}
          </div>
        </div>
      </div>

      {/* Contract & T&C Snippet */}
      {(eng.contract_ref || eng.terms_and_conditions) && (
        <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-150">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-slate-800 shrink-0">📜 Contract:</span>
            {eng.contract_ref ? (
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-900">
                {eng.contract_ref}
              </span>
            ) : (
              <span className="text-slate-500">Signed Terms</span>
            )}
            {eng.terms_and_conditions && (
              <span className="text-slate-500 truncate italic">
                — {eng.terms_and_conditions}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium capitalize">
              ✓ {eng.contract_status}
            </span>
            {eng.signed_at && (
              <span className="text-[11px] text-slate-500">Signed: {eng.signed_at}</span>
            )}
          </div>
        </div>
      )}

      {/* Latest Activity / Notion Notes Banner */}
      <div className="bg-blue-50/50 rounded-lg p-3 text-xs flex items-center justify-between gap-2 border border-blue-100">
        <div className="flex items-center gap-2 text-slate-700 truncate">
          <span className="font-bold text-blue-900 shrink-0">📝 Recent Touchpoint:</span>
          <span className="truncate">
            {eng.recent_activity || 'Touchpoint or Notion meeting note logged'}
          </span>
        </div>
        <Link
          href={`/engagements/${eng.id}`}
          className="text-blue-600 hover:text-blue-800 font-semibold shrink-0"
        >
          View Workspace & Notes →
        </Link>
      </div>
    </div>
  );
}
