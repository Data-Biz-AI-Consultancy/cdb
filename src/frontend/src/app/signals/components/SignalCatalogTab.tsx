'use client';

import React from 'react';
import { SignalDefinition } from '../types';
import { getSeverityBadge, getCategoryBadge } from '../utils';

interface SignalCatalogTabProps {
  catalog: SignalDefinition[];
}

export const SignalCatalogTab: React.FC<SignalCatalogTabProps> = ({ catalog }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {catalog.map((def) => (
        <div
          key={def.id}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-6 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-3xl">{def.icon || '⚡'}</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getSeverityBadge(
                    def.severity
                  )}`}
                >
                  {def.severity.toUpperCase()}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border ${getCategoryBadge(
                    def.category
                  )}`}
                >
                  {def.category}
                </span>
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{def.name}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Target: {def.target_entity}</p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{def.business_interpretation}</p>
          </div>

          {def.recommended_action && def.recommended_action.title && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <p className="font-bold text-slate-700">
                💡 Playbook: {def.recommended_action.title}
              </p>
              {def.recommended_action.description && (
                <p className="text-slate-500 mt-1">{def.recommended_action.description}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
