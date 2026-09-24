'use client';

import React from 'react';
import Link from 'next/link';
import { PersonDetail, SEGMENT_META, TEMPERATURE_META } from '../types';

interface PersonHeaderProps {
  person: PersonDetail;
  onAddNote: () => void;
  onLogActivity: () => void;
  onAddOpp: () => void;
  onAddLead: () => void;
  onLinkCompany: () => void;
}

export function PersonHeader({
  person,
  onAddNote,
  onLogActivity,
  onAddOpp,
  onAddLead,
  onLinkCompany,
}: PersonHeaderProps) {
  const fullName =
    `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unnamed Contact';
  const initials =
    `${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase() || 'P';

  const rawSegment = person.attributes?.segment || 'general_network';
  const segmentInfo = SEGMENT_META[rawSegment] || {
    label: rawSegment.replace(/_/g, ' '),
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    text: 'text-slate-700',
    border: 'border-slate-200',
    desc: 'Assigned segment tag',
  };

  const rawTemperature =
    person.attributes?.temperature || person.attributes?.engagement_temperature;
  const tempInfo = rawTemperature ? TEMPERATURE_META[rawTemperature.toLowerCase()] : null;

  const customTags: string[] = Array.isArray(person.attributes?.tags) ? person.attributes.tags : [];
  const careerItems = person.career || [];
  const currentRole = careerItems.find((c) => c.is_current);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left Avatar & Name */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center text-xl font-bold tracking-tight shadow-md shrink-0 border-2 border-slate-700">
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {fullName}
              </h1>
              {/* Segment Badge */}
              <span
                title={segmentInfo.desc}
                className={`text-xs px-3 py-1 rounded-full font-semibold border ${segmentInfo.bg} shadow-sm inline-flex items-center gap-1`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {segmentInfo.label}
              </span>

              {/* Engagement Temperature Badge */}
              {tempInfo && (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${tempInfo.bg} ${tempInfo.text} inline-flex items-center gap-1`}
                >
                  <span>{tempInfo.icon}</span>
                  <span>{tempInfo.label}</span>
                </span>
              )}
            </div>

            {/* Current Role & Company */}
            <div className="text-sm text-slate-600 mt-1 flex flex-wrap items-center gap-2">
              {currentRole ? (
                <>
                  <span className="font-medium text-slate-800">{currentRole.title || 'Role'}</span>
                  <span className="text-slate-400">at</span>
                  <Link
                    href={`/companies/${currentRole.company?.id}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {currentRole.company?.name || 'Company'}
                  </Link>
                </>
              ) : (
                <span className="text-slate-400 italic">No current company specified</span>
              )}

              {(person.city || person.country) && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-medium">
                    📍 {[person.city, person.country].filter(Boolean).join(', ')}
                  </span>
                </>
              )}
            </div>

            {/* Tags & Labels Row */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
                Tags & Sources:
              </span>
              {(person.sources || []).map((s: string) => (
                <span
                  key={s}
                  className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-mono"
                >
                  src:{s}
                </span>
              ))}
              {customTags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-medium"
                >
                  🏷️ {tag}
                </span>
              ))}
              {customTags.length === 0 && (person.sources || []).length === 0 && (
                <span className="text-xs text-slate-400 italic">None</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onAddNote}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <span>📝</span>
            <span>+ Add Note</span>
          </button>
          <button
            onClick={onLogActivity}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <span>+</span>
            <span>Log Activity</span>
          </button>
          <button
            onClick={onAddOpp}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <span>+</span>
            <span>Add Opportunity</span>
          </button>
          <button
            onClick={onAddLead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <span>+</span>
            <span>Add Lead</span>
          </button>
          <button
            onClick={onLinkCompany}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition"
          >
            <span>💼</span>
            <span>Link Employment</span>
          </button>
        </div>
      </div>
    </div>
  );
}
