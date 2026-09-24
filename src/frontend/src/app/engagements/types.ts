/**
 * Types and models for Client Engagements.
 */

export interface EngagementPersonItem {
  person_id: string;
  role?: string | null;
  person_name?: string | null;
  person_email?: string | null;
  person_avatar_url?: string | null;
}

export interface EngagementCompanyItem {
  id: string;
  name: string;
  domain?: string | null;
}

export interface EngagementAISummaryActionItem {
  task: string;
  priority: 'high' | 'medium' | 'low';
  suggested_role?: string | null;
}

export interface EngagementAISummaryItem {
  executive_summary: string;
  client_sentiment: 'very_positive' | 'positive' | 'neutral' | 'needs_attention' | 'at_risk';
  sentiment_reasoning: string;
  key_highlights: string[];
  blockers_and_risks: string[];
  action_items: EngagementAISummaryActionItem[];
  activity_count_analyzed: number;
  generated_at: string;
}

export interface EngagementItem {
  id: string;
  title: string;
  company_id: string;
  opportunity_id?: string | null;
  owner_id?: string | null;
  status: 'planning' | 'active' | 'in_delivery' | 'on_hold' | 'completed' | 'cancelled';
  engagement_type: string;
  rate_type: 'hourly' | 'daily' | 'monthly' | 'fixed';
  rate_value?: number | null;
  currency: string;
  total_value?: number | null;
  contract_ref?: string | null;
  contract_status: string;
  signed_at?: string | null;
  terms_and_conditions?: string | null;
  start_date?: string | null;
  expected_end_date?: string | null;
  actual_end_date?: string | null;
  notes?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
  company?: EngagementCompanyItem | null;
  persons?: EngagementPersonItem[];
  is_overdue?: boolean;
  days_remaining?: number | null;
  days_elapsed?: number | null;
  recent_activity?: string | null;
  ai_summary?: EngagementAISummaryItem | null;
  contract_file?: {
    filename: string;
    storage_key: string;
    content_type: string;
    size_bytes: number;
    uploaded_at: string;
    download_url: string;
  } | null;
}

export interface CreateEngagementFormData {
  title: string;
  company_id: string;
  person_id?: string;
  person_role?: string;
  engagement_type: string;
  status: 'planning' | 'active' | 'in_delivery' | 'on_hold' | 'completed' | 'cancelled';
  rate_type: 'hourly' | 'daily' | 'monthly' | 'fixed';
  rate_value: string;
  currency: string;
  total_value: string;
  contract_ref: string;
  contract_status: string;
  signed_at: string;
  terms_and_conditions: string;
  start_date: string;
  expected_end_date: string;
  notes: string;
}
