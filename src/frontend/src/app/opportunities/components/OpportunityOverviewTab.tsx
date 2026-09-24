'use client';

import React from 'react';
import { STAGES, Opportunity } from '../types';
import { COMMON_CURRENCIES } from '@/lib/currency';

interface OpportunityOverviewTabProps {
  opportunity: Opportunity;
  editForm: any;
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  savingEdit: boolean;
  onSaveEdit: (e: React.FormEvent) => void;
  isOppOverdue: (opp: Opportunity) => boolean;
  getDaysOverdue: (opp: Opportunity) => number;
}

export const OpportunityOverviewTab: React.FC<OpportunityOverviewTabProps> = ({
  opportunity,
  editForm,
  setEditForm,
  savingEdit,
  onSaveEdit,
  isOppOverdue,
  getDaysOverdue,
}) => {
  return (
    <form onSubmit={onSaveEdit} className="space-y-4">
      {/* Deal Health & Inactivity Status Box */}
      <div
        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          isOppOverdue(opportunity)
            ? 'border-red-300 bg-red-50/70'
            : 'border-slate-200 bg-slate-50/80'
        }`}
      >
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Deal Health & Activity Tracking
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {isOppOverdue(opportunity) && (
              <span className="font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded border border-red-300">
                🚨 Overdue ({getDaysOverdue(opportunity)}d past target)
              </span>
            )}

            {opportunity.is_expired ? (
              <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                ⛔ Expired ({opportunity.days_inactive}d inactive)
              </span>
            ) : opportunity.is_stale ? (
              <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                ⚠️ Stale ({opportunity.days_inactive}d inactive)
              </span>
            ) : opportunity.stage === 'closed_won' ? (
              <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                🏆 Closed Won
              </span>
            ) : opportunity.stage === 'closed_lost' ? (
              <span className="font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded border border-slate-300">
                Closed Lost
              </span>
            ) : (
              <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                🟢 Active ({opportunity.days_inactive || 0}d inactive)
              </span>
            )}
            <span className="text-slate-500">
              {opportunity.days_inactive === 0 || !opportunity.days_inactive
                ? 'Active today'
                : `Last active ${opportunity.days_inactive} days ago`}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 sm:text-right">
          <div>
            Stale: <span className="font-semibold text-slate-600">&gt;30 days</span>
          </div>
          <div>
            Expired: <span className="font-semibold text-slate-600">&gt;90 days</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
        <input
          required
          value={editForm.title || ''}
          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs font-medium"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
        <textarea
          rows={4}
          placeholder="Opportunity details, strategic objectives, or scope..."
          value={editForm.description || ''}
          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          className="w-full min-h-[100px] px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs leading-relaxed"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Stage</label>
          <select
            value={editForm.stage || 'prospect'}
            onChange={(e) => setEditForm({ ...editForm, stage: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Value</label>
          <input
            type="number"
            step="0.01"
            value={editForm.value || ''}
            onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
          <select
            value={editForm.currency || 'USD'}
            onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
          >
            {COMMON_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Win Probability ({editForm.probability ?? 50}%)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={editForm.probability ?? 50}
            onChange={(e) => setEditForm({ ...editForm, probability: Number(e.target.value) })}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Close Date</label>
          <input
            type="date"
            value={editForm.expected_close_date || ''}
            onChange={(e) => setEditForm({ ...editForm, expected_close_date: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes</label>
        <textarea
          rows={3}
          placeholder="Strategic context, client relationship history, objections..."
          value={editForm.notes || ''}
          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs leading-relaxed"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={savingEdit}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs shadow-md transition disabled:opacity-50"
        >
          {savingEdit ? 'Saving Changes...' : 'Save Opportunity Details'}
        </button>
      </div>
    </form>
  );
};
