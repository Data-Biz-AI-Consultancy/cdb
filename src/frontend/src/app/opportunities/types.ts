'use client';

// Re-export shared signal primitives to avoid duplication with signals/types.ts
export type {
  DetectedSignalStatus,
  SignalSeverity,
} from '@/lib/signalBadges';

// Re-export canonical stage definitions
export { PIPELINE_STAGES as STAGES } from '@/lib/pipelineStages';
export type { StageDefinition } from '@/lib/pipelineStages';

export interface OpportunityPerson {
  person_id: string;
  role?: string | null;
  person_name?: string | null;
  person_email?: string | null;
  person_avatar_url?: string | null;
}

export interface OpportunityCompany {
  company_id: string;
  role?: string | null;
  company_name?: string | null;
  company_domain?: string | null;
}

export interface Opportunity {
  id: string;
  title: string;
  stage: 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost' | string;
  value?: number | string | null;
  currency?: string | null;
  probability?: number | null;
  expected_close_date?: string | null;
  source_lead_id?: string | null;
  notes?: string | null;
  description?: string | null;
  attributes?: Record<string, any>;
  persons?: OpportunityPerson[];
  companies?: OpportunityCompany[];
  created_at: string;
  updated_at: string;
  is_stale?: boolean;
  is_expired?: boolean;
  days_inactive?: number;
  staleness_status?: string;
  last_activity_at?: string | null;
  is_overdue?: boolean;
  days_overdue?: number;
}

export interface OpportunityHistoryItem {
  id: string;
  opportunity_id: string;
  action_id: string;
  action?: {
    id: string;
    name: string;
    category: string;
    description?: string;
    icon?: string;
    color?: string;
  } | null;
  field_name?: string | null;
  old_value?: any;
  new_value?: any;
  changes: Record<string, any>;
  summary?: string | null;
  created_at: string;
}

export interface PersonOption {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email?: string | null;
}

export interface CompanyOption {
  id: string;
  name: string;
  domain?: string | null;
}

/**
 * Supporting evidence shape attached to a detected signal.
 * Canonical version lives in signals/types.ts as SupportingEvidence;
 * this alias keeps the name that opportunities components use.
 */
export interface DetectedSignalEvidence {
  evidence_type?: string;
  source_entity_type?: string;
  source_entity_id?: string | null;
  source_display?: string | null;
  trigger_event_title?: string | null;
  why_it_matters_now?: string | null;
  occurred_at?: string | null;
  days_elapsed?: number | null;
  excerpt?: string | null;
  evidence_status?: string;
  evidence_notes?: string[];
  commercial_context?: Record<string, any>;
  relationship_context?: Record<string, any>;
  key_metrics?: Record<string, any>;
  verification_status?: string;
  source_reliability?: string;
  data_quality_flags?: string[];
  is_restricted?: boolean;
  disclosure_notes?: string[];
  has_quality_warning?: boolean;
}

/**
 * A person connected to an opportunity's detected signal.
 * Kept here for backwards compatibility; canonical type in signals/types.ts.
 */
export interface ConnectedPerson {
  id: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  primary_email?: string | null;
  role?: string | null;
  linkedin_url?: string | null;
}

export interface OpportunityDetectedSignal {
  id: string;
  signal_id: string;
  signal?: {
    id: string;
    name: string;
    category: string;
    target_entity: string;
    severity: string;
    description?: string | null;
    business_interpretation?: string;
    recommended_action?: Record<string, any>;
    icon?: string | null;
    color?: string | null;
    is_active?: boolean;
  };
  company_id?: string | null;
  company_name?: string | null;
  person_id?: string | null;
  person_name?: string | null;
  connected_persons?: ConnectedPerson[];
  opportunity_id?: string | null;
  opportunity_title?: string | null;
  status: 'active' | 'acknowledged' | 'actioned' | 'snoozed' | 'dismissed' | 'resolved';
  severity: 'critical' | 'high' | 'medium' | 'low';
  score?: number | null;
  priority_score?: number | null;
  priority_tier?: 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | string;
  effective_polarity?: 'opportunity' | 'risk' | string;
  confidence_score?: number | null;
  confidence_tier?: string | null;
  is_uncertain?: boolean;
  uncertainty_reasons?: string[];
  has_data_quality_warning?: boolean;
  data_quality_flags?: string[];
  source_reliability?: string | null;
  evidence?: DetectedSignalEvidence | Record<string, any> | null;
  why_it_matters_now?: string | null;
  title: string;
  summary?: string | null;
  metadata?: Record<string, any>;
  routed_opportunity_id?: string | null;
  routed_opportunity_title?: string | null;
  actioned_at?: string | null;
  resolution_notes?: string | null;
  snoozed_until?: string | null;
  detected_at: string;
}
