'use client';

import React from 'react';
import Link from 'next/link';
import { EngagementItem } from '../types';
import { formatMoney } from '@/lib/currency';

interface EngagementDetailHeaderProps {
  engagement: EngagementItem;
  onOpenLinkModal: () => void;
  onOpenLogModal: () => void;
  onOpenEditModal: () => void;
}

export function EngagementDetailHeader({
  engagement,
  onOpenLinkModal,
  onOpenLogModal,
  onOpenEditModal,
}: EngagementDetailHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Breadcrumb & Top Bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-500">
          <Link href="/engagements" className="hover:text-slate-800 font-medium">
            Client Engagements
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-bold truncate max-w-sm">{engagement.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenLinkModal}
            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <span>🔗</span> Link LinkedIn / Conversation
          </button>
          <button
            onClick={onOpenLogModal}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <span>📝</span> Log Activity / Note
          </button>
          <button
            onClick={onOpenEditModal}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <span>✏️</span> Edit
          </button>
        </div>
      </div>

      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold capitalize ${
                  engagement.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : engagement.status === 'in_delivery'
                    ? 'bg-blue-100 text-blue-800'
                    : engagement.status === 'planning'
                    ? 'bg-amber-100 text-amber-800'
                    : engagement.status === 'completed'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {engagement.status.replace('_', ' ')}
              </span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                {engagement.engagement_type.replace('_', ' ')}
              </span>
              {engagement.is_overdue && (
                <span className="text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                  ⚠️ Overdue Deadline
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {engagement.title}
            </h1>

            <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
              <span>Client Organization:</span>
              {engagement.company ? (
                <Link
                  href={`/companies/${engagement.company_id}`}
                  className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                >
                  <span>🏢</span> {engagement.company.name}
                </Link>
              ) : (
                <span className="font-semibold text-slate-800">Client Org</span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                Total Contract
              </span>
              <span className="text-xl font-black text-slate-900">
                {engagement.total_value
                  ? formatMoney(engagement.total_value, engagement.currency)
                  : formatMoney(engagement.rate_value, engagement.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-1">Billing Rate</span>
            <span className="text-sm font-bold text-slate-900">
              {engagement.rate_value ? (
                <>
                  {formatMoney(engagement.rate_value, engagement.currency)}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    /{engagement.rate_type}
                  </span>
                </>
              ) : (
                'Not set'
              )}
            </span>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-1">Contract Budget Cap</span>
            <span className="text-sm font-bold text-slate-900">
              {engagement.total_value
                ? formatMoney(engagement.total_value, engagement.currency, { includeCode: true })
                : 'Open / Uncapped'}
            </span>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-1">Delivery Timeline</span>
            <span className="text-sm font-bold text-slate-900">
              {engagement.start_date || 'Start'} → {engagement.expected_end_date || 'Ongoing'}
            </span>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-1">Timeline Health</span>
            <span className="text-sm font-bold text-slate-900">
              {engagement.days_remaining !== null && engagement.days_remaining !== undefined
                ? engagement.days_remaining >= 0
                  ? `${engagement.days_remaining} days left`
                  : `${Math.abs(engagement.days_remaining)} days overdue`
                : 'Open-ended'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
