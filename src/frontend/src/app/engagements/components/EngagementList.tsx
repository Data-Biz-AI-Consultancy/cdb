'use client';

import React from 'react';
import { EngagementItem } from '../types';
import { EngagementCard } from './EngagementCard';

interface EngagementListProps {
  engagements: EngagementItem[];
  loading: boolean;
}

export function EngagementList({ engagements, loading }: EngagementListProps) {
  if (loading) {
    return (
      <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
        Loading client engagements...
      </div>
    );
  }

  if (engagements.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
        <p className="text-slate-600 font-medium">
          No client engagements match your filter criteria.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Add an ongoing client engagement above to track contracts, rates, and meeting notes.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {engagements.map((eng) => (
        <EngagementCard key={eng.id} engagement={eng} />
      ))}
    </div>
  );
}
