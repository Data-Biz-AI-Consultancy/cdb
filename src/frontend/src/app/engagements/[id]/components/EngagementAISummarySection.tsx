'use client';

import React from 'react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { EngagementAISummaryItem } from '../types';

interface EngagementAISummarySectionProps {
  aiSummary: EngagementAISummaryItem;
  refreshingAi: boolean;
  onRefresh: () => void;
}

export function EngagementAISummarySection({
  aiSummary,
  refreshingAi,
  onRefresh,
}: EngagementAISummarySectionProps) {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-500/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 pb-4 border-b border-indigo-500/20">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 text-lg border border-indigo-400/30">
            ✨
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                AI Engagement Intelligence Briefing
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-300 font-semibold border border-indigo-400/30">
                Live Synthesis
              </span>
            </div>
            <p className="text-xs text-indigo-200/70">
              Synthesized from {aiSummary.activity_count_analyzed} recorded meetings, LinkedIn
              conversations & touchpoints.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sentiment Indicator */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
              aiSummary.client_sentiment === 'very_positive' ||
              aiSummary.client_sentiment === 'positive'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : aiSummary.client_sentiment === 'needs_attention' ||
                  aiSummary.client_sentiment === 'at_risk'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-700/50 text-slate-300 border-slate-600'
            }`}
          >
            <span>
              {aiSummary.client_sentiment === 'very_positive' ||
              aiSummary.client_sentiment === 'positive'
                ? '🟢'
                : aiSummary.client_sentiment === 'needs_attention' ||
                  aiSummary.client_sentiment === 'at_risk'
                ? '🔴'
                : '⚪'}
            </span>
            <span className="capitalize">
              {(aiSummary.client_sentiment || 'positive').replace('_', ' ')} Health
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={refreshingAi}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 border border-white/10"
          >
            <span className={refreshingAi ? 'animate-spin inline-block' : ''}>⚡</span>
            {refreshingAi ? 'Analyzing...' : 'Refresh AI'}
          </button>
        </div>
      </div>

      {/* Executive Summary Callout */}
      <div className="mt-4 relative z-10 bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-indigo-100 leading-relaxed">
        <span className="font-bold text-indigo-300 block mb-1 uppercase tracking-wider text-[10px]">
          Executive Overview
        </span>
        <MarkdownRenderer content={aiSummary.executive_summary} className="text-indigo-100" />
      </div>

      {/* 3-Column Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 relative z-10 text-xs">
        {/* Highlights */}
        <div className="p-4 bg-indigo-950/40 rounded-xl border border-indigo-500/20 space-y-2">
          <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <span>🎯</span> Key Highlights & Wins
          </span>
          <ul className="space-y-1.5 text-indigo-100/90 list-disc list-inside">
            {(aiSummary.key_highlights || []).map((h: string, i: number) => (
              <li key={i} className="leading-snug">
                {h}
              </li>
            ))}
          </ul>
        </div>

        {/* Blockers & Risks */}
        <div className="p-4 bg-indigo-950/40 rounded-xl border border-indigo-500/20 space-y-2">
          <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <span>⚠️</span> Delivery Risks & Dependencies
          </span>
          <ul className="space-y-1.5 text-indigo-100/90 list-disc list-inside">
            {(aiSummary.blockers_and_risks || []).map((b: string, i: number) => (
              <li key={i} className="leading-snug">
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Action Items */}
        <div className="p-4 bg-indigo-950/40 rounded-xl border border-indigo-500/20 space-y-2">
          <span className="font-bold text-sky-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <span>📋</span> Prioritized Action Items
          </span>
          <div className="space-y-2">
            {(aiSummary.action_items || []).map((act: any, i: number) => (
              <div key={i} className="p-2 rounded-lg bg-white/5 border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span
                    className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                      act.priority === 'high'
                        ? 'bg-rose-500/30 text-rose-300'
                        : act.priority === 'medium'
                        ? 'bg-amber-500/30 text-amber-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {act.priority}
                  </span>
                  {act.suggested_role && (
                    <span className="text-indigo-300/80 truncate">{act.suggested_role}</span>
                  )}
                </div>
                <p className="text-white font-medium text-[11px] leading-snug">{act.task}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
