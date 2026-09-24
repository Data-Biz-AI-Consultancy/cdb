'use client';

import React from 'react';

interface DismissSectionProps {
  dismissalReason: string;
  setDismissalReason: (val: string) => void;
}

export const DismissSection: React.FC<DismissSectionProps> = ({
  dismissalReason,
  setDismissalReason,
}) => {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-slate-700">Dismissal Category</label>
      <select
        value={dismissalReason}
        onChange={(e) => setDismissalReason(e.target.value)}
        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
      >
        <option value="Not Relevant">Not Relevant / Ignorable</option>
        <option value="False Positive">False Positive / Incorrect Attribution</option>
        <option value="Handled Elsewhere">Already Handled Elsewhere</option>
        <option value="Other">Other / Miscellaneous</option>
      </select>
    </div>
  );
};
