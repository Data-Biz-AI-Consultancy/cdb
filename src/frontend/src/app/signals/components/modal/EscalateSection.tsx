'use client';

import React from 'react';

interface EscalateSectionProps {
  escalationLevel: string;
  setEscalationLevel?: (val: string) => void;
  escalationReason: string;
  setEscalationReason?: (val: string) => void;
}

export const EscalateSection: React.FC<EscalateSectionProps> = ({
  escalationLevel,
  setEscalationLevel,
  escalationReason,
  setEscalationReason,
}) => {
  return (
    <div className="space-y-3 bg-rose-50/60 p-3.5 rounded-xl border border-rose-200/80">
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-rose-900">
          Escalation Severity Level
        </label>
        <select
          value={escalationLevel}
          onChange={(e) => setEscalationLevel && setEscalationLevel(e.target.value)}
          className="w-full text-xs p-2.5 bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
        >
          <option value="warning">Warning Escalation</option>
          <option value="escalated">Escalated (Lead Review)</option>
          <option value="critical">Critical Emergency (P0 / Partner SLA Breach)</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-semibold text-rose-900">
          Escalation Risk Rationale / Justification <span className="text-rose-600">*</span>
        </label>
        <textarea
          rows={3}
          value={escalationReason}
          onChange={(e) => setEscalationReason && setEscalationReason(e.target.value)}
          placeholder="Describe why this signal requires immediate escalation and senior intervention..."
          className="w-full text-xs p-2.5 bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
        />
      </div>
    </div>
  );
};
