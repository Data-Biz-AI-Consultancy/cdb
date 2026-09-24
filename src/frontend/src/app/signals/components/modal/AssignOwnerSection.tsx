'use client';

import React from 'react';
import UserSelect from '@/components/UserSelect';

interface AssignOwnerSectionProps {
  assignedOwnerId: string;
  setAssignedOwnerId?: (val: string) => void;
}

export const AssignOwnerSection: React.FC<AssignOwnerSectionProps> = ({
  assignedOwnerId,
  setAssignedOwnerId,
}) => {
  return (
    <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
      <UserSelect
        id="assign-owner-select"
        label="Owner / Assignee"
        value={assignedOwnerId || ''}
        onChange={(uid) => setAssignedOwnerId && setAssignedOwnerId(uid)}
        placeholder="Select team member (or leave unassigned)..."
      />
      <p className="text-[11px] text-slate-500">
        Leave empty and submit to move this signal to the unassigned triage queue.
      </p>
    </div>
  );
};
