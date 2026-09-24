'use client';

import React from 'react';

interface SnoozeSectionProps {
  snoozeDays: number;
  setSnoozeDays: (days: number) => void;
  customSnoozeDate: string;
  setCustomSnoozeDate: (date: string) => void;
}

export const SnoozeSection: React.FC<SnoozeSectionProps> = ({
  snoozeDays,
  setSnoozeDays,
  customSnoozeDate,
  setCustomSnoozeDate,
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-700">Snooze Duration</label>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '7 Days', days: 7 },
          { label: '14 Days (Default)', days: 14 },
          { label: '30 Days', days: 30 },
        ].map((opt) => (
          <button
            key={opt.days}
            type="button"
            onClick={() => {
              setSnoozeDays(opt.days);
              setCustomSnoozeDate('');
            }}
            className={`py-2 px-3 text-xs rounded-xl border font-semibold transition cursor-pointer ${
              snoozeDays === opt.days && !customSnoozeDate
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="pt-2">
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Or Pick Custom Date
        </label>
        <input
          type="date"
          value={customSnoozeDate}
          onChange={(e) => setCustomSnoozeDate(e.target.value)}
          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
    </div>
  );
};
