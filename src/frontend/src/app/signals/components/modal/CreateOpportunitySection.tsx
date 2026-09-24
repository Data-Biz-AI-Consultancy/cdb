'use client';

import React from 'react';

interface CreateOpportunitySectionProps {
  oppTitle: string;
  setOppTitle?: (val: string) => void;
  oppValue: string | number;
  setOppValue?: (val: string | number) => void;
  oppCurrency: string;
  setOppCurrency?: (val: string) => void;
  oppStage: string;
  setOppStage?: (val: string) => void;
  oppProbability: string | number;
  setOppProbability?: (val: string | number) => void;
}

export const CreateOpportunitySection: React.FC<CreateOpportunitySectionProps> = ({
  oppTitle,
  setOppTitle,
  oppValue,
  setOppValue,
  oppCurrency,
  setOppCurrency,
  oppStage,
  setOppStage,
  oppProbability,
  setOppProbability,
}) => {
  return (
    <div className="space-y-3 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200">
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-emerald-950">Opportunity Deal Title</label>
        <input
          type="text"
          value={oppTitle}
          onChange={(e) => setOppTitle && setOppTitle(e.target.value)}
          placeholder="Opportunity Title"
          className="w-full text-xs p-2.5 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-emerald-950">Estimated Deal Value</label>
          <input
            type="number"
            value={oppValue}
            onChange={(e) => setOppValue && setOppValue(e.target.value)}
            placeholder="50000"
            className="w-full text-xs p-2.5 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-emerald-950">Currency</label>
          <select
            value={oppCurrency}
            onChange={(e) => setOppCurrency && setOppCurrency(e.target.value)}
            className="w-full text-xs p-2.5 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          >
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-emerald-950">Initial Stage</label>
          <select
            value={oppStage}
            onChange={(e) => setOppStage && setOppStage(e.target.value)}
            className="w-full text-xs p-2.5 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          >
            <option value="prospect">Prospect</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-emerald-950">Probability (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={oppProbability}
            onChange={(e) => setOppProbability && setOppProbability(e.target.value)}
            className="w-full text-xs p-2.5 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          />
        </div>
      </div>
    </div>
  );
};
