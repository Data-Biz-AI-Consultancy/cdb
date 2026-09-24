'use client';

import { DetectedSignal } from '../types';

interface SignalPlaybookSectionProps {
  signal: DetectedSignal;
}

export function SignalPlaybookSection({ signal }: SignalPlaybookSectionProps) {
  if (!signal.signal?.recommended_action) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
        <span>💡</span>
        <span>Recommended Action Playbook</span>
      </h2>
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-xs space-y-2">
        <p className="font-bold text-emerald-900 text-sm">
          {signal.signal.recommended_action.title || 'Recommended Next Best Action'}
        </p>
        <p className="text-emerald-800 leading-relaxed">
          {signal.signal.recommended_action.description ||
            'Review account history and initiate prompt executive check-in.'}
        </p>
      </div>
    </div>
  );
}
