'use client';

import React from 'react';
import Link from 'next/link';
import {
  DetectedSignal,
  PriorityBreakdown,
  PriorityTier,
} from '../types';
import {
  getPriorityBadge,
  getSeverityBadge,
  getCategoryBadge,
  getStatusBadge,
  getEvidenceHealthBadge,
} from '../utils';

interface SignalCardProps {
  sig: DetectedSignal;
  columnVariant: 'opportunity' | 'risk' | 'hybrid';
  isSelected: boolean;
  actionInProgress: string | null;
  onToggleSelect: (id: string) => void;
  onAcknowledge: (id: string) => void;
  onOpenActionModal: (
    sig: DetectedSignal,
    actionType: 'actioned' | 'dismissed' | 'snoozed' | 'resolved' | 'false_positive'
  ) => void;
  onLinkPerson: (signalId: string, personId: string, role: string) => void;
  onUnlinkPerson: (signalId: string, personId: string) => void;
}

export const SignalCard: React.FC<SignalCardProps> = ({
  sig,
  columnVariant,
  isSelected,
  actionInProgress,
  onToggleSelect,
  onAcknowledge,
  onOpenActionModal,
  onLinkPerson,
  onUnlinkPerson,
}) => {
  const borderAccent =
    columnVariant === 'opportunity'
      ? 'border-l-4 border-l-emerald-500'
      : columnVariant === 'risk'
      ? 'border-l-4 border-l-rose-500'
      : 'border-l-4 border-l-amber-500';

  const evidence = sig.evidence || sig.metadata?.evidence;
  const whyItMatters =
    sig.why_it_matters_now ||
    (evidence && (evidence as any).why_it_matters_now);

  const evidenceStatus =
    (evidence && (evidence as any).evidence_status) ||
    (sig.has_conflict ? 'conflicting' : sig.is_uncertain ? 'unverified' : 'fresh');

  const healthBadge = getEvidenceHealthBadge(evidenceStatus, sig.is_uncertain, sig.has_conflict);

  const priorityTier: PriorityTier = (
    sig.priority_tier ||
    sig.metadata?.priority_tier ||
    (sig.score && sig.score >= 90
      ? 'P0'
      : sig.score && sig.score >= 75
      ? 'P1'
      : sig.score && sig.score >= 50
      ? 'P2'
      : sig.score && sig.score >= 25
      ? 'P3'
      : 'P4')
  ) as PriorityTier;

  const effPolarity =
    sig.effective_polarity ||
    sig.metadata?.effective_polarity ||
    sig.signal?.category ||
    columnVariant;

  const priorityBadge = getPriorityBadge(priorityTier, effPolarity);
  const priorityScore =
    sig.priority_score !== undefined && sig.priority_score !== null
      ? Math.round(Number(sig.priority_score))
      : sig.score !== undefined && sig.score !== null
      ? Math.round(Number(sig.score))
      : null;

  const breakdown: PriorityBreakdown | Record<string, any> | undefined =
    sig.priority_breakdown || sig.metadata?.priority_breakdown;

  const sourceReliability = sig.source_reliability || (evidence as any)?.source_reliability || 'high';
  const hasQualityWarning = sig.has_data_quality_warning || (evidence as any)?.has_quality_warning || false;
  const isRestricted = (evidence as any)?.is_restricted || sig.source_reliability === 'restricted' || false;
  const qualityFlags: string[] = sig.data_quality_flags || (evidence as any)?.data_quality_flags || [];

  return (
    <div
      className={`bg-white rounded-xl border ${
        isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
      } shadow-sm hover:shadow-md transition p-4 flex flex-col justify-between gap-3 overflow-hidden min-w-0 ${borderAccent}`}
    >
      <div className="space-y-2 min-w-0">
        {/* Top Status & Indicator Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Selection Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(sig.id)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer mr-1"
            title="Select signal for bulk actions"
          />

          {/* Priority Tier & Impact Badge */}
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${priorityBadge.className}`}
            title={
              breakdown?.impact_rationale ||
              `Priority Tier: ${priorityTier} (Business Impact Score: ${priorityScore ?? 'N/A'}/100)`
            }
          >
            <span>⭐</span>
            <span>{priorityBadge.label}</span>
            {priorityScore !== null && (
              <span className="opacity-80 font-normal">({priorityScore} pts)</span>
            )}
          </span>

          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${getSeverityBadge(
              sig.severity
            )}`}
          >
            {sig.severity.toUpperCase()}
          </span>
          {sig.signal?.category && (
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border ${getCategoryBadge(
                sig.signal.category
              )}`}
            >
              {sig.signal.category.toLowerCase() === 'hybrid' ? 'Mixed' : sig.signal.category}
            </span>
          )}
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border ${getStatusBadge(
              sig.status
            )}`}
          >
            {sig.status === 'snoozed' && sig.snoozed_until
              ? `💤 Snoozed until ${new Date(sig.snoozed_until).toLocaleDateString()}`
              : sig.status}
          </span>

          {/* Evidence Health Pill */}
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${healthBadge.className}`}
          >
            <span>{healthBadge.icon}</span>
            <span>{healthBadge.label}</span>
          </span>

          {/* Data Quality & Source Safeguard Badges */}
          {hasQualityWarning && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full border bg-amber-100 text-amber-900 border-amber-300 font-semibold flex items-center gap-1"
              title={
                qualityFlags.length > 0
                  ? `Quality Flags: ${qualityFlags.join(', ')}`
                  : 'Source data may be stale, incomplete, or lower reliability'
              }
            >
              <span>⚠️</span>
              <span>Quality Warning</span>
            </span>
          )}

          {sourceReliability === 'unreliable' || sourceReliability === 'low' ? (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full border bg-rose-50 text-rose-800 border-rose-300 font-semibold flex items-center gap-1"
              title={`Source data classified with ${sourceReliability.toUpperCase()} reliability`}
            >
              <span>📉</span>
              <span className="capitalize">{sourceReliability} Source</span>
            </span>
          ) : null}

          {isRestricted && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-800 border-indigo-300 font-semibold flex items-center gap-1"
              title="Contains confidential or restricted metadata with privacy disclosures"
            >
              <span>🔒</span>
              <span>Restricted Source</span>
            </span>
          )}

          {sig.false_positive_count !== undefined && sig.false_positive_count > 0 && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full border bg-rose-100 text-rose-900 border-rose-400 font-bold flex items-center gap-1"
              title={`Reported as false positive ${sig.false_positive_count} time(s)`}
            >
              <span>🚩</span>
              <span>FP ({sig.false_positive_count})</span>
            </span>
          )}

          {/* Reopened Alert Indicator */}
          {sig.reopen_count !== undefined && sig.reopen_count > 0 && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full border bg-amber-100 text-amber-900 border-amber-300 font-bold flex items-center gap-1"
              title={`Signal re-alerted with new evidence (${sig.reopen_count}x). Last reopened: ${
                sig.last_reopened_at ? new Date(sig.last_reopened_at).toLocaleDateString() : 'recently'
              }`}
            >
              <span>🔄</span>
              <span>Reopened ({sig.reopen_count}x)</span>
            </span>
          )}

          {sig.confidence_score !== undefined && sig.confidence_score !== null && (
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                sig.confidence_score >= 0.8 || sig.confidence_tier === 'high'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : sig.confidence_score >= 0.5 || sig.confidence_tier === 'medium'
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-rose-50 text-rose-700 border-rose-300'
              }`}
            >
              🎯 {Math.round(sig.confidence_score * 100)}% Confidence
            </span>
          )}
          {sig.has_conflict && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200 font-semibold flex items-center gap-1">
              <span>⚠️</span>
              <span>Opposing Signal Polarity Detected</span>
            </span>
          )}
          {sig.is_uncertain && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 font-semibold flex items-center gap-1">
              <span>🔍</span>
              <span>Verification Recommended</span>
            </span>
          )}
          <span className="text-[11px] text-slate-400">
            {new Date(sig.detected_at).toLocaleDateString()}
          </span>
        </div>

        {/* Business Impact 4-Dimension Mini Breakdown Meter */}
        {breakdown && (
          <div
            className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-2"
            title={breakdown.impact_rationale || 'Business Impact Breakdown'}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px]">
                <span>⚡</span>
                <span>Impact Drivers</span>
              </span>
              {priorityScore !== null && (
                <span className="text-[11px] text-slate-500">
                  Composite: <strong className="font-extrabold text-slate-900">{priorityScore}</strong>
                  <span className="text-slate-400 font-normal">/100</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white p-1.5 rounded-lg border border-slate-200/70 shadow-2xs flex flex-col items-center text-center">
                <span className="text-[10px] font-semibold text-slate-500 truncate w-full">
                  Account
                </span>
                <div className="mt-0.5 flex items-baseline gap-0.5 font-bold text-slate-900 text-xs">
                  <span>{breakdown.account_importance_score ?? 0}</span>
                  <span className="text-[9px] font-normal text-slate-400">/25</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                  <div
                    className="bg-blue-500 h-1 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, ((breakdown.account_importance_score ?? 0) / 25) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-white p-1.5 rounded-lg border border-slate-200/70 shadow-2xs flex flex-col items-center text-center">
                <span className="text-[10px] font-semibold text-slate-500 truncate w-full">
                  Relation
                </span>
                <div className="mt-0.5 flex items-baseline gap-0.5 font-bold text-slate-900 text-xs">
                  <span>{breakdown.relationship_context_score ?? 0}</span>
                  <span className="text-[9px] font-normal text-slate-400">/25</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-1 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, ((breakdown.relationship_context_score ?? 0) / 25) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-white p-1.5 rounded-lg border border-slate-200/70 shadow-2xs flex flex-col items-center text-center">
                <span className="text-[10px] font-semibold text-slate-500 truncate w-full">
                  Urgency
                </span>
                <div className="mt-0.5 flex items-baseline gap-0.5 font-bold text-slate-900 text-xs">
                  <span>{breakdown.urgency_score ?? 0}</span>
                  <span className="text-[9px] font-normal text-slate-400">/25</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                  <div
                    className="bg-amber-500 h-1 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, ((breakdown.urgency_score ?? 0) / 25) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-white p-1.5 rounded-lg border border-slate-200/70 shadow-2xs flex flex-col items-center text-center">
                <span className="text-[10px] font-semibold text-slate-500 truncate w-full">
                  Impact
                </span>
                <div className="mt-0.5 flex items-baseline gap-0.5 font-bold text-slate-900 text-xs">
                  <span>{breakdown.business_impact_score ?? 0}</span>
                  <span className="text-[9px] font-normal text-slate-400">/25</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, ((breakdown.business_impact_score ?? 0) / 25) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Title and Short Summary */}
        <div>
          <Link
            href={`/signals/${sig.id}`}
            className="text-sm sm:text-base font-semibold text-slate-900 hover:text-emerald-600 transition flex items-center gap-1.5 group"
          >
            <span className="text-base">{sig.signal?.icon || '⚡'}</span>
            <span className="group-hover:underline">{sig.title}</span>
          </Link>
          {sig.summary && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {sig.summary}
            </p>
          )}

          {/* Why It Matters Callout */}
          {whyItMatters && (
            <div className="mt-1.5 p-2 bg-amber-50/70 border border-amber-200/60 rounded-lg text-[11px] text-amber-900 leading-snug">
              <span className="font-bold">⚡ Why it matters: </span>
              <span>{whyItMatters}</span>
            </div>
          )}

          {sig.resolution_notes && (
            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1.5 italic">
              💬 <strong>Notes:</strong> {sig.resolution_notes}
            </p>
          )}
        </div>

        {/* Associated Context Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {sig.company_name && (
            <Link
              href={
                sig.company_id
                  ? `/companies/${sig.company_id}`
                  : `/companies?q=${encodeURIComponent(sig.company_name)}`
              }
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition font-medium text-[11px]"
            >
              <span>🏢</span>
              <span className="truncate max-w-[140px]">{sig.company_name}</span>
            </Link>
          )}
          {sig.connected_persons && sig.connected_persons.length > 0 ? (
            sig.connected_persons.map((p) => {
              const pName = p.name || 'Contact';
              return (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]"
                >
                  <span>👤</span>
                  <Link
                    href={`/persons/${p.id}`}
                    className="hover:underline font-semibold truncate max-w-[120px]"
                  >
                    {pName}
                  </Link>
                  {p.role && (
                    <span className="text-[9px] uppercase font-bold text-emerald-600 bg-emerald-100/80 px-1 rounded">
                      {p.role}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onUnlinkPerson(sig.id, p.id);
                    }}
                    disabled={actionInProgress === sig.id}
                    className="text-emerald-500 hover:text-rose-600 hover:bg-emerald-100/50 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] ml-0.5 cursor-pointer"
                    title={`Unlink ${pName}`}
                  >
                    ✕
                  </button>
                </span>
              );
            })
          ) : sig.person_name ? (
            <Link
              href={
                sig.person_id
                  ? `/persons/${sig.person_id}`
                  : `/persons?q=${encodeURIComponent(sig.person_name)}`
              }
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition font-medium text-[11px]"
            >
              <span>👤</span>
              <span className="truncate max-w-[140px]">{sig.person_name}</span>
            </Link>
          ) : null}
          {sig.opportunity_title && (
            <Link
              href={`/opportunities?search=${encodeURIComponent(sig.opportunity_title)}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition font-medium text-[11px]"
            >
              <span>💼</span>
              <span className="truncate max-w-[140px]">{sig.opportunity_title}</span>
            </Link>
          )}
          {sig.engagement_title && (
            <Link
              href="/engagements"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition font-medium text-[11px]"
            >
              <span>📋</span>
              <span className="truncate max-w-[140px]">{sig.engagement_title}</span>
            </Link>
          )}
        </div>

        {/* Suggested People Prompt Bar */}
        {sig.suggested_persons && sig.suggested_persons.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs">
            <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider flex items-center gap-1">
              <span>💡 Suggested:</span>
            </span>
            {sig.suggested_persons.map((sp, idx) =>
              sp.person_id ? (
                <button
                  key={sp.person_id || idx}
                  onClick={() =>
                    onLinkPerson(sig.id, sp.person_id!, sp.role || 'counterparty')
                  }
                  disabled={actionInProgress === sig.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-semibold transition cursor-pointer shadow-2xs"
                  title={`Click to link ${sp.name} (${sp.role || 'contact'}) to this signal`}
                >
                  <span className="text-indigo-600 font-bold">+</span>
                  <span>{sp.name}</span>
                  {sp.role && (
                    <span className="text-[9px] uppercase font-bold text-indigo-600">
                      ({sp.role})
                    </span>
                  )}
                </button>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* Card Actions Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-1">
        <Link
          href={`/signals/${sig.id}`}
          className="px-2.5 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-sm whitespace-nowrap"
        >
          <span>View Details</span>
          <span>→</span>
        </Link>

        <div className="flex flex-wrap items-center gap-1.5">
          {sig.status === 'active' && (
            <button
              onClick={() => onAcknowledge(sig.id)}
              disabled={actionInProgress === sig.id}
              className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap"
              title="Mark as Acknowledged"
            >
              Acknowledge
            </button>
          )}

          {(sig.status === 'active' || sig.status === 'acknowledged') && (
            <button
              onClick={() => onOpenActionModal(sig, 'actioned')}
              disabled={actionInProgress === sig.id}
              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap"
              title="Record Action"
            >
              Take Action
            </button>
          )}

          {/* Snooze Control */}
          {sig.status !== 'dismissed' && sig.status !== 'resolved' && (
            <button
              onClick={() => onOpenActionModal(sig, 'snoozed')}
              disabled={actionInProgress === sig.id}
              className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap"
              title="Snooze Alert"
            >
              💤 Snooze
            </button>
          )}

          {/* Resolve Control */}
          {sig.status !== 'resolved' && sig.status !== 'dismissed' && (
            <button
              onClick={() => onOpenActionModal(sig, 'resolved')}
              disabled={actionInProgress === sig.id}
              className="px-2 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap"
              title="Resolve Signal"
            >
              Resolve
            </button>
          )}

          {/* Dismiss Control */}
          {sig.status !== 'dismissed' && (
            <button
              onClick={() => onOpenActionModal(sig, 'dismissed')}
              disabled={actionInProgress === sig.id}
              className="px-1.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs transition cursor-pointer"
              title="Dismiss Signal"
            >
              Dismiss
            </button>
          )}

          {/* Report False Positive */}
          <button
            onClick={() => onOpenActionModal(sig, 'false_positive')}
            disabled={actionInProgress === sig.id}
            className="px-1.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs transition cursor-pointer font-medium"
            title="Report this signal as a False Positive or Unreliable Source"
          >
            🚩 Report FP
          </button>

          {(sig.status === 'dismissed' || sig.status === 'resolved') && (
            <button
              onClick={() => onOpenActionModal(sig, 'actioned')}
              disabled={actionInProgress === sig.id}
              className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
              title="Reopen or take follow-up action"
            >
              Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
