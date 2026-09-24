export interface SignalQualityMetrics {
  total_detected: number;
  total_actioned: number;
  total_dismissed: number;
  total_resolved: number;
  total_active: number;
  action_rate: number;
  dismissal_rate: number;
  precision_proxy: number;
  needs_verification_rate: number;
  conflict_rate: number;
  total_false_positives?: number;
  false_positive_rate?: number;
  quality_warning_rate?: number;
  quality_warnings_count?: number;
  source_reliability_breakdown?: {
    high: number;
    medium: number;
    low: number;
    unreliable: number;
  };
  feedback_reasons?: Record<string, number>;
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
