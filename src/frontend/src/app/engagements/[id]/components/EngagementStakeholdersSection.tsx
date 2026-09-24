'use client';

import React from 'react';
import Link from 'next/link';
import { EngagementPersonItem } from '../types';

interface EngagementStakeholdersSectionProps {
  persons?: EngagementPersonItem[];
  onOpenAttachModal: () => void;
  onRemoveContact: (personId: string) => void;
}

export function EngagementStakeholdersSection({
  persons,
  onOpenAttachModal,
  onRemoveContact,
}: EngagementStakeholdersSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>👥</span> Connected Contact Person(s)
          </h2>
          <p className="text-xs text-slate-500">Key stakeholders, sponsors, and delivery leads.</p>
        </div>
        <button
          onClick={onOpenAttachModal}
          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition"
        >
          + Attach Contact
        </button>
      </div>

      {!persons || persons.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
          No contact persons attached to this engagement yet.
        </div>
      ) : (
        <div className="space-y-2">
          {persons.map((p) => (
            <div
              key={p.person_id}
              className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <Link
                  href={`/persons/${p.person_id}`}
                  className="font-bold text-slate-900 hover:text-blue-600 transition block truncate"
                >
                  👤 {p.person_name || 'Contact'}
                </Link>
                <span className="text-slate-500 block truncate">
                  {p.person_email || 'No email'}
                </span>
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-semibold capitalize">
                  {p.role?.replace('_', ' ') || 'Contact'}
                </span>
              </div>

              <button
                onClick={() => onRemoveContact(p.person_id)}
                title="Detach person"
                className="text-slate-400 hover:text-rose-600 p-1 text-sm transition"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
