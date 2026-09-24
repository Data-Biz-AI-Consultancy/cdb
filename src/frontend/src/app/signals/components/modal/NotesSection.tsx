'use client';

import React from 'react';

interface NotesSectionProps {
  modalActionType: string | null;
  resolutionNotes: string;
  setResolutionNotes: (val: string) => void;
}

export const NotesSection: React.FC<NotesSectionProps> = ({
  modalActionType,
  resolutionNotes,
  setResolutionNotes,
}) => {
  if (modalActionType === 'assign' || modalActionType === 'escalate') return null;

  const getLabel = () => {
    switch (modalActionType) {
      case 'actioned':
        return 'Action Notes / Commercial Next Step';
      case 'resolved':
        return 'Resolution Notes';
      case 'snoozed':
        return 'Optional Snooze Reason';
      case 'false_positive':
        return 'Feedback Details & Investigation Context';
      case 'create_opportunity':
        return 'Additional Deal Notes & Next Steps';
      default:
        return 'Additional Context / Notes';
    }
  };

  const getPlaceholder = () => {
    switch (modalActionType) {
      case 'actioned':
        return 'e.g., Scheduled executive check-in for next Tuesday via email...';
      case 'resolved':
        return 'e.g., Re-engagement call completed and QBR scheduled.';
      case 'snoozed':
        return 'e.g., Lead asked to reconnect after holiday period.';
      case 'false_positive':
        return 'e.g., This email was sent to an external vendor rather than the prospective buyer; please suppress.';
      case 'create_opportunity':
        return 'e.g., Initial discovery call notes and delivery requirements...';
      default:
        return 'e.g., Contact already communicated via WhatsApp.';
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-slate-700">{getLabel()}</label>
      <textarea
        rows={3}
        value={resolutionNotes}
        onChange={(e) => setResolutionNotes(e.target.value)}
        placeholder={getPlaceholder()}
        className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
      />
    </div>
  );
};
