export type SignalCategory = 'opportunity' | 'risk' | 'hybrid';
export type SignalSeverity = 'critical' | 'high' | 'medium' | 'low';
export type DetectedSignalStatus =
  | 'active'
  | 'acknowledged'
  | 'actioned'
  | 'snoozed'
  | 'dismissed'
  | 'resolved';

export interface RecommendedAction {
  playbook?: string;
  action_type?: string;
  title?: string;
  description?: string;
}

export interface SignalDefinition {
  id: string;
  name: string;
  category: SignalCategory;
  target_entity: string;
  severity: SignalSeverity;
  detection_mechanism: string;
  description?: string | null;
  business_interpretation: string;
  parameters: Record<string, any>;
  recommended_action: Record<string, any>;
  icon?: string | null;
  color?: string | null;
  is_active: boolean;
}

export interface ConnectedPerson {
  id: string;
  name?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  primary_email?: string | null;
  role?: string | null;
  linkedin_url?: string | null;
}

export interface SuggestedPerson {
  person_id?: string | null;
  name: string;
  first_name?: string | null;
  role?: string | null;
  company_id?: string | null;
  company_name?: string | null;
  confidence?: number | null;
}

export type FeedbackReason =
  | 'incorrect_intent'
  | 'stale_outdated'
  | 'wrong_entity_attribution'
  | 'unreliable_source'
  | 'confidential_restricted'
  | 'other';

export type FeedbackStatus = 'pending' | 'investigated' | 'resolved' | 'rejected';

export interface SignalFeedback {
  id: string;
  detected_signal_id: string;
  user_id?: string | null;
  user_name?: string | null;
  is_false_positive: boolean;
  feedback_reason: FeedbackReason | string;
  feedback_notes?: string | null;
  suggested_action?: string | null;
  status: FeedbackStatus | string;
  investigated_by_id?: string | null;
  investigated_by_name?: string | null;
  investigation_notes?: string | null;
  investigated_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignalFeedbackCreatePayload {
  is_false_positive: boolean;
  feedback_reason: FeedbackReason | string;
  feedback_notes?: string;
  suggested_action?: string;
  dismiss_signal?: boolean;
}

export interface SupportingEvidence {
  evidence_type?: string;
  source_entity_type?: string;
  source_entity_id?: string | null;
  source_display?: string | null;
  trigger_event_title?: string | null;
  why_it_matters_now?: string | null;
  occurred_at?: string | null;
  days_elapsed?: number | null;
  excerpt?: string | null;
  evidence_status?:
    | 'fresh'
    | 'stale'
    | 'incomplete'
    | 'conflicting'
    | 'unverified'
    | 'unavailable'
    | 'restricted'
    | string;
  evidence_notes?: string[];
  commercial_context?: Record<string, any>;
  relationship_context?: Record<string, any>;
  key_metrics?: Record<string, any>;
  verification_status?: string;
  source_reliability?: 'high' | 'medium' | 'low' | 'restricted' | string;
  data_quality_flags?: string[];
  is_restricted?: boolean;
  disclosure_notes?: string[];
  has_quality_warning?: boolean;
}

export type PriorityTier = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export interface PriorityBreakdown {
  account_importance_score: number;
  relationship_context_score: number;
  urgency_score: number;
  business_impact_score: number;
  total_score: number;
  priority_tier: PriorityTier;
  effective_polarity: string;
  impact_rationale: string;
}

export interface DetectedSignal {
  id: string;
  signal_id: string;
  signal?: SignalDefinition | null;
  company_id?: string | null;
  company_name?: string | null;
  person_id?: string | null;
  person_name?: string | null;
  connected_persons?: ConnectedPerson[];
  suggested_persons?: SuggestedPerson[];
  opportunity_id?: string | null;
  opportunity_title?: string | null;
  engagement_id?: string | null;
  engagement_title?: string | null;
  activity_id?: string | null;
  status: DetectedSignalStatus;
  severity: SignalSeverity;
  score?: number | null;
  priority_score?: number | null;
  priority_tier?: PriorityTier | string | null;
  effective_polarity?: 'opportunity' | 'risk' | string | null;
  priority_breakdown?: PriorityBreakdown | Record<string, any> | null;
  confidence_score?: number | null;
  confidence_tier?: 'high' | 'medium' | 'low' | string | null;
  is_uncertain?: boolean;
  uncertainty_reasons?: string[];
  has_data_quality_warning?: boolean;
  data_quality_flags?: string[];
  source_reliability?: 'high' | 'medium' | 'low' | 'restricted' | string | null;
  false_positive_count?: number;
  feedback_entries?: SignalFeedback[];
  has_conflict?: boolean;
  conflicting_signal_ids?: string[];
  conflict_summary?: string | null;
  conflict_scope?: string | null;
  evidence?: SupportingEvidence | Record<string, any> | null;
  why_it_matters_now?: string | null;
  evidence_fingerprint?: string | null;
  title: string;
  summary?: string | null;
  metadata?: Record<string, any>;
  owner_id?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  assigned_at?: string | null;
  assigned_by_id?: string | null;
  assigned_by_name?: string | null;
  is_escalated?: boolean;
  escalation_level?: 'none' | 'warning' | 'escalated' | 'critical' | string;
  escalated_to_id?: string | null;
  escalated_to_name?: string | null;
  escalated_at?: string | null;
  escalation_reason?: string | null;
  routed_opportunity_id?: string | null;
  routed_opportunity_title?: string | null;
  routed_workflow_type?: string | null;
  routed_at?: string | null;
  actioned_at?: string | null;
  actioned_by_id?: string | null;
  resolution_notes?: string | null;
  snoozed_until?: string | null;
  reopen_count?: number;
  last_reopened_at?: string | null;
  detected_at: string;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignalCatalogResponse {
  data: SignalDefinition[];
  summary: {
    total_signals: number;
    by_category: Record<string, number>;
    by_target_entity: Record<string, number>;
    by_severity: Record<string, number>;
  };
}

export interface SignalQualityMetrics {
  total_detected: number;
  total_actioned: number;
  total_dismissed: number;
  total_resolved: number;
  total_snoozed: number;
  total_active: number;
  total_reopened: number;
  total_false_positives?: number;
  action_rate: number;
  dismissal_rate: number;
  false_positive_rate?: number;
  precision_proxy: number;
  needs_verification_rate: number;
  conflict_rate: number;
  quality_warning_rate?: number;
  feedback_reasons?: Record<string, number>;
  source_reliability_breakdown?: Record<string, number>;
}

export interface SignalLatencyMetrics {
  mean_time_to_action_hours?: number | null;
  median_time_to_action_hours?: number | null;
  sla_breach_count: number;
  sla_breach_rate: number;
  total_actioned_measured: number;
}

export interface SignalOutcomeMetrics {
  attribution_window_days: number;
  opportunities_created_count: number;
  opportunity_conversion_rate: number;
  account_reactivations_count: number;
  account_reactivation_rate: number;
  contracts_renewed_count: number;
  contract_renewal_rate: number;
}

export interface SignalRevenueMetrics {
  influenced_pipeline_total: string | number;
  weighted_influenced_pipeline_total: string | number;
  protected_revenue_total: string | number;
  currency: string;
  value_coverage_rate: number;
}

export interface SignalMetricsBreakdownItem {
  key: string;
  label: string;
  category?: string | null;
  severity?: string | null;
  total_detected: number;
  actioned_count: number;
  dismissed_count: number;
  snoozed_count?: number;
  false_positive_count?: number;
  action_rate: number;
  mean_time_to_action_hours?: number | null;
  opportunities_created_count: number;
  influenced_pipeline: string | number;
}

export interface SignalMetricsResponse {
  lookback_days: number;
  evaluated_at: string;
  quality: SignalQualityMetrics;
  latency: SignalLatencyMetrics;
  outcomes: SignalOutcomeMetrics;
  revenue: SignalRevenueMetrics;
  by_signal: SignalMetricsBreakdownItem[];
  by_category: SignalMetricsBreakdownItem[];
  by_severity: SignalMetricsBreakdownItem[];
}

export interface DetectedSignalStatsResponse {
  total_active: number;
  total_snoozed?: number;
  total_conflicting?: number;
  total_uncertain?: number;
  total_quality_warnings?: number;
  total_false_positives?: number;
  total_escalated?: number;
  total_unassigned?: number;
  by_severity: Record<string, number>;
  by_category: Record<string, number>;
  by_signal: Record<string, number>;
  by_status: Record<string, number>;
  by_source_reliability?: Record<string, number>;
}

export interface SignalEvaluationResult {
  status: string;
  evaluated_at: string;
  lookback_days?: number;
  total_active_signals: number;
  total_snoozed_signals?: number;
  total_suppressed_duplicates?: number;
  total_suppressed_low_quality?: number;
  total_reopened_signals?: number;
  total_conflicting?: number;
  total_uncertain?: number;
  total_quality_warnings?: number;
  new_signals_detected: number;
  refreshed_signals: number;
  by_signal: Record<string, number>;
}

export interface AccountGroupedSignals {
  company_id: string;
  company_name: string;
  signals: DetectedSignal[];
}

export interface SignalAssignPayload {
  owner_id?: string | null;
}

export interface SignalEscalatePayload {
  escalated_to_id?: string | null;
  escalation_level?: 'warning' | 'escalated' | 'critical' | string;
  escalation_reason: string;
}

export interface SignalDeescalatePayload {
  resolution_notes?: string;
}

export interface SignalCreateOpportunityPayload {
  title?: string;
  value?: number;
  currency?: string;
  stage?: string;
  expected_close_date?: string;
  probability?: number;
  notes?: string;
  owner_id?: string | null;
}

export interface SignalWorkflowRoutePayload {
  workflow_type: 'opportunity' | 'engagement_renewal' | 'executive_touchpoint' | string;
  opportunity_payload?: SignalCreateOpportunityPayload;
  notes?: string;
}

export interface SignalWorkflowRouteResponse {
  success: boolean;
  workflow_type: string;
  routed_entity_id?: string | null;
  routed_entity_type?: string | null;
  signal: DetectedSignal;
  message: string;
}

