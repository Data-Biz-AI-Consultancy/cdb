import React from 'react';
import Link from 'next/link';
import { AccountAIBriefResponse, NextBestActionItem } from '@/app/signals/types';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface CompanyAIBriefTabProps {
  aiBrief: AccountAIBriefResponse | null;
  nextBestActions: NextBestActionItem[];
  regeneratingBrief: boolean;
  onRegenerateBrief: () => void;
  onNavigateToTimeline: () => void;
}

export const CompanyAIBriefTab: React.FC<CompanyAIBriefTabProps> = ({
  aiBrief,
  nextBestActions,
  regeneratingBrief,
  onRegenerateBrief,
  onNavigateToTimeline,
}) => {
  return (
    <div className="space-y-6">
      {/* Executive Overview & Health Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <h2 className="text-xl font-bold tracking-tight text-white">
                AI Account Intelligence Brief
              </h2>
              {aiBrief?.commercial_posture && (
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    aiBrief.commercial_posture === 'growing'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : aiBrief.commercial_posture === 'at_risk'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : aiBrief.commercial_posture === 'dormant'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  }`}
                >
                  Posture: {aiBrief.commercial_posture.replace('_', ' ')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Synthesized executive intelligence across delivery engagements, active deal pipeline, stakeholder touchpoints, and detected opportunity/risk signals.
            </p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Health Score</div>
                <div className="text-lg font-black text-white">
                  {aiBrief?.relationship_health_score ?? 80}/100
                </div>
              </div>
              <div className="w-10 h-10 rounded-full border-4 border-emerald-400 flex items-center justify-center font-bold text-xs">
                {aiBrief?.relationship_health_score ?? 80}%
              </div>
            </div>

            <button
              onClick={onRegenerateBrief}
              disabled={regeneratingBrief}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 shadow-sm whitespace-nowrap"
            >
              <span className={regeneratingBrief ? 'animate-spin' : ''}>🔄</span>
              <span>{regeneratingBrief ? 'Synthesizing...' : 'Regenerate Brief'}</span>
            </button>
          </div>
        </div>

        {/* Health Rationale Bar */}
        {aiBrief?.relationship_health_rationale && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 text-xs text-slate-700 flex items-center gap-2">
            <span className="font-semibold text-slate-900 shrink-0">Health Drivers:</span>
            <MarkdownRenderer content={aiBrief.relationship_health_rationale} className="text-slate-600 inline-block" />
          </div>
        )}

        {/* Executive Narrative */}
        <div className="p-6 space-y-4">
          <div className="text-slate-800 leading-relaxed text-sm bg-slate-50/50 p-4 rounded-xl border border-slate-200/70">
            {aiBrief?.executive_summary ? (
              <MarkdownRenderer content={aiBrief.executive_summary} />
            ) : (
              <span className="text-slate-400">Synthesizing account intelligence...</span>
            )}
          </div>

          {/* Highlights Chips */}
          {aiBrief?.key_highlights && aiBrief.key_highlights.length > 0 && (
            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Key Account Highlights
              </h3>
              <div className="flex flex-wrap gap-2">
                {aiBrief.key_highlights.map((hl, idx) => (
                  <div
                    key={idx}
                    className="bg-indigo-50/70 border border-indigo-100 text-indigo-950 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  >
                    <span className="text-indigo-600 font-bold">✓</span>
                    <span>{hl}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🎯 Prioritized Next Best Actions (NBA) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <h3 className="text-base font-bold text-slate-900">
              Ranked Next Best Actions (NBA)
            </h3>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
              {nextBestActions.length} Recommended
            </span>
            {nextBestActions.some((a) => a.is_reconciled_conflict) && (
              <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>⚖️</span>
                <span>Conflict Reconciled</span>
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500">
            Sorted by Business Impact & Urgency
          </span>
        </div>

        {nextBestActions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            <p className="text-sm">No pending Next Best Actions for this account.</p>
            <p className="text-xs text-slate-400 mt-1">All active signal playbooks and relationship milestones are up to date.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nextBestActions.map((nba) => (
              <div
                key={nba.id}
                className={`bg-white rounded-xl border p-5 space-y-3 shadow-xs hover:shadow-md transition flex flex-col justify-between ${
                  nba.is_reconciled_conflict
                    ? 'border-purple-200 ring-1 ring-purple-100'
                    : nba.priority_tier === 'P0'
                    ? 'border-rose-300 ring-1 ring-rose-100'
                    : 'border-slate-200'
                }`}
              >
                <div className="space-y-2">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                          nba.priority_tier === 'P0'
                            ? 'bg-rose-600 text-white'
                            : nba.priority_tier === 'P1'
                            ? 'bg-amber-500 text-white'
                            : nba.priority_tier === 'P2'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {nba.priority_tier} ({Math.round(nba.priority_score)} pts)
                      </span>

                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          nba.urgency === 'immediate'
                            ? 'bg-rose-100 text-rose-800'
                            : nba.urgency === 'high'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {nba.urgency} Urgency
                      </span>
                    </div>

                    {nba.freshness_status && (
                      <span className="text-[11px] text-slate-500 font-medium capitalize">
                        Status: {nba.freshness_status}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{nba.action_type === 'schedule_sync' ? '📅' : nba.action_type === 'send_message' ? '✉️' : nba.action_type === 'prepare_proposal' ? '📝' : '⚡'}</span>
                      <span>{nba.title}</span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {nba.description}
                    </p>
                  </div>

                  {/* Reconciled Conflict Note */}
                  {nba.is_reconciled_conflict && (
                    <div className="bg-purple-50 border border-purple-200 text-purple-900 rounded-lg p-2.5 text-xs flex items-center gap-2">
                      <span className="text-base">⚖️</span>
                      <div>
                        <span className="font-bold">Reconciled Guidance: </span>
                        <span>{nba.conflict_resolution_notes || 'Harmonized co-occurring opportunity and risk signals.'}</span>
                      </div>
                    </div>
                  )}

                  {/* Why it matters / Rationale */}
                  {nba.rationale && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-xs text-slate-700 space-y-1">
                      <div className="font-semibold text-slate-900 flex items-center gap-1">
                        <span>🔍 Why It Matters Now:</span>
                      </div>
                      <p className="text-slate-600">{nba.rationale}</p>
                    </div>
                  )}

                  {/* Sequential Execution Steps */}
                  {nba.action_steps && nba.action_steps.length > 0 && (
                    <div className="pt-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Prescriptive Steps:
                      </div>
                      <ul className="space-y-1 text-xs text-slate-600">
                        {nba.action_steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="font-bold text-blue-600 text-[11px] mt-0.5">
                              {idx + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Footer Actions & Assignee */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <div className="text-slate-500">
                    {nba.target_person_name ? (
                      <span className="font-medium text-slate-700">Contact: {nba.target_person_name}</span>
                    ) : nba.suggested_owner_name ? (
                      <span>Owner: {nba.suggested_owner_name}</span>
                    ) : (
                      <span>Account Level</span>
                    )}
                  </div>

                  {nba.originating_signal_ids && nba.originating_signal_ids.length > 0 ? (
                    <Link
                      href={`/signals/${nba.originating_signal_ids[0]}`}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition text-xs flex items-center gap-1 shadow-xs"
                    >
                      <span>Execute Action</span>
                      <span>→</span>
                    </Link>
                  ) : (
                    <button
                      onClick={onNavigateToTimeline}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition text-xs shadow-xs"
                    >
                      Log Outreach →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Opportunities & Risks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Opportunities Column */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🟢</span>
              <h3 className="text-sm font-bold text-slate-900">
                Current Opportunities ({aiBrief?.key_opportunities?.length ?? 0})
              </h3>
            </div>
            <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
              Commercial Upside
            </span>
          </div>

          {(!aiBrief?.key_opportunities || aiBrief.key_opportunities.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No active commercial opportunities detected.
            </div>
          ) : (
            <div className="space-y-3">
              {aiBrief.key_opportunities.map((opp) => (
                <div
                  key={opp.detected_signal_id}
                  className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950">{opp.title}</span>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                      {opp.priority_tier} • {Math.round(opp.priority_score)} pts
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <MarkdownRenderer content={opp.why_it_matters} />
                  </div>
                  {opp.evidence_excerpt && (
                    <div className="text-[11px] text-slate-500 bg-white/80 p-2 rounded border border-emerald-100/60 font-mono">
                      "{opp.evidence_excerpt}"
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-slate-500">Confidence: {Math.round(opp.confidence_score * 100)}%</span>
                    <Link
                      href={`/signals/${opp.detected_signal_id}`}
                      className="text-emerald-700 font-semibold hover:underline"
                    >
                      View Triage →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risks Column */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔴</span>
              <h3 className="text-sm font-bold text-slate-900">
                Active Risks ({aiBrief?.key_risks?.length ?? 0})
              </h3>
            </div>
            <span className="text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-semibold">
              Relationship & Contract
            </span>
          </div>

          {(!aiBrief?.key_risks || aiBrief.key_risks.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No active relationship or delivery risks detected.
            </div>
          ) : (
            <div className="space-y-3">
              {aiBrief.key_risks.map((risk) => (
                <div
                  key={risk.detected_signal_id}
                  className="bg-rose-50/40 border border-rose-100 rounded-xl p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-950">{risk.title}</span>
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                      {risk.priority_tier} • {risk.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <MarkdownRenderer content={risk.why_it_matters} />
                  </div>
                  {risk.evidence_excerpt && (
                    <div className="text-[11px] text-slate-500 bg-white/80 p-2 rounded border border-rose-100/60 font-mono">
                      "{risk.evidence_excerpt}"
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-slate-500">Confidence: {Math.round(risk.confidence_score * 100)}%</span>
                    <Link
                      href={`/signals/${risk.detected_signal_id}`}
                      className="text-rose-700 font-semibold hover:underline"
                    >
                      View Triage →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyAIBriefTab;
