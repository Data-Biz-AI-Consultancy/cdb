import { EngagementItem, EngagementAISummaryItem, EngagementPersonItem } from '../types';

export type { EngagementItem, EngagementAISummaryItem, EngagementPersonItem };

export interface ActivityItem {
  id: string;
  type: string;
  source: string;
  source_id?: string | null;
  occurred_at: string;
  title?: string | null;
  summary?: string | null;
  raw_content?: string | null;
  person_id?: string | null;
  company_id?: string | null;
  engagement_id?: string | null;
  person?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    primary_email?: string | null;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
}

export interface EditEngagementFormData {
  title: string;
  status: 'planning' | 'active' | 'in_delivery' | 'on_hold' | 'completed' | 'cancelled';
  engagement_type: string;
  currency: string;
  rate_type: 'hourly' | 'daily' | 'monthly' | 'fixed';
  rate_value: string;
  total_value: string;
  contract_ref: string;
  contract_status: string;
  signed_at: string;
  terms_and_conditions: string;
  start_date: string;
  expected_end_date: string;
  notes: string;
}

export interface LogActivityFormData {
  title: string;
  type: string;
  source: string;
  person_id: string;
  summary: string;
  raw_content: string;
  occurred_at: string;
}
