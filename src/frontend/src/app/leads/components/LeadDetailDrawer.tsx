'use client';

import React from 'react';
import Modal from '@/components/Modal';
import { Lead } from '../types';
import { formatDateTime } from '@/lib/dateUtils';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  onClose: () => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({ lead, onClose }) => {
  if (!lead) return null;

  return (
    <Modal
      isOpen={!!lead}
      onClose={onClose}
      title="Lead Description & Conversation Transcript"
      subtitle={`Contact: ${lead.person_name || 'Unknown Contact'}${
        lead.company_name ? ` (${lead.company_name})` : ''
      }`}
      size="2xl"
    >
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Stage:</span>
            <span className="font-semibold uppercase text-slate-800">{lead.stage}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Intent:</span>
            <span className="font-semibold text-slate-800">{lead.intent || 'General'}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Signal:</span>
            <span className="font-semibold text-slate-800 capitalize">
              {lead.signal_strength || 'Normal'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Created:</span>
            <span className="font-semibold text-slate-800">{formatDateTime(lead.created_at)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Full Description & Transcript:
          </label>
          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[350px] overflow-y-auto border border-slate-800">
            {lead.description || lead.notes || 'No description notes.'}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LeadDetailDrawer;
