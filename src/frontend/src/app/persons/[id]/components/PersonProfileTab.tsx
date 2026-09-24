'use client';

import React from 'react';
import { PersonDetail, SEGMENT_META, TEMPERATURE_META } from '../types';

interface PersonProfileTabProps {
  person: PersonDetail;
}

export function PersonProfileTab({ person }: PersonProfileTabProps) {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Direct Contact Info */}
      <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 border-b pb-2">Contact Channels</h3>
        <dl className="grid grid-cols-1 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Primary Email
            </dt>
            <dd className="text-slate-800 font-medium mt-0.5">{person.primary_email || '—'}</dd>
          </div>

          {(person.secondary_emails || []).length > 0 && (
            <div>
              <dt className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Secondary Emails
              </dt>
              <dd className="text-slate-700 font-mono text-xs mt-0.5">
                {person.secondary_emails?.join(', ')}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Primary Phone
            </dt>
            <dd className="text-slate-800 font-mono mt-0.5">{person.primary_phone || '—'}</dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              LinkedIn Profile
            </dt>
            <dd className="mt-0.5">
              {person.linkedin_url ? (
                <div className="flex flex-col gap-1 mt-0.5">
                  {person.linkedin_url.split(',').map((url: string, i: number) => {
                    const trimmed = url.trim();
                    if (!trimmed) return null;
                    const href = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
                    return (
                      <a
                        key={i}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline text-xs break-all inline-flex items-center gap-1"
                      >
                        <span>🔗</span>
                        <span>{trimmed}</span>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Location
            </dt>
            <dd className="text-slate-800 mt-0.5">
              {[person.city, person.country].filter(Boolean).join(', ') || '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Intelligence & Segmentation Metadata */}
      <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 border-b pb-2">
          Intelligence & Attributes
        </h3>
        <dl className="grid grid-cols-1 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Assigned Segment
            </dt>
            <dd className="mt-1">
              <span
                className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${segmentInfo.bg}`}
              >
                {segmentInfo.label}
              </span>
              <p className="text-xs text-slate-500 mt-1">{segmentInfo.desc}</p>
            </dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Engagement Temperature
            </dt>
            <dd className="mt-1">
              {tempInfo ? (
                <span
                  className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${tempInfo.bg} ${tempInfo.text}`}
                >
                  {tempInfo.icon} {tempInfo.label}
                </span>
              ) : (
                <span className="text-slate-400 text-xs">Not evaluated</span>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Raw Attributes
            </dt>
            <dd className="mt-1">
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto max-h-44">
                {JSON.stringify(person.attributes || {}, null, 2)}
              </pre>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
