/**
 * Lead types, constants, and badge styling definitions.
 */

export interface Lead {
  id: string;
  person_id: string;
  company_id?: string | null;
  owner_id?: string | null;
  title?: string | null;
  stage: 'new' | 'contacted' | 'qualified' | 'stale' | 'converted' | 'disqualified' | 'expired' | string;
  source?: string | null;
  source_ref_id?: string | null;
  intent?: string | null;
  signal_strength?: 'strong' | 'medium' | 'weak' | 'high' | 'low' | string | null;
  notes?: string | null;
  description?: string | null;
  disqualification_reason?: string | null;
  converted_at?: string | null;
  converted_opportunity_id?: string | null;
  created_at: string;
  updated_at: string;
  person_name?: string | null;
  person_email?: string | null;
  person_avatar_url?: string | null;
  company_name?: string | null;
  company_domain?: string | null;
  is_stale?: boolean;
  is_expired?: boolean;
  days_inactive?: number;
  staleness_status?: string;
  last_activity_at?: string | null;
}

export const DISQUALIFICATION_REASONS = [
  { value: 'wrong_fit', label: 'Wrong Fit / Not ICP' },
  { value: 'no_budget', label: 'No Budget / Unfunded' },
  { value: 'unresponsive', label: 'Unresponsive / Ghosted' },
  { value: 'competitor', label: 'Chose Competitor' },
  { value: 'bad_timing', label: 'Bad Timing / Later' },
  { value: 'spam', label: 'Spam / Vendor Pitch' },
  { value: 'other', label: 'Other' },
];

export const INTENT_CONFIG: Record<string, { label: string; icon: string }> = {
  business_collaboration: { label: 'Business Collaboration', icon: '🎯' },
  advisory_inquiry: { label: 'Advisory Inquiry', icon: '💡' },
  consulting_project: { label: 'Consulting Project', icon: '🛠️' },
  product_demo: { label: 'Product Demo', icon: '💻' },
  speaking_engagement: { label: 'Speaking Engagement', icon: '🎤' },
  investment_inquiry: { label: 'Investment Inquiry', icon: '💰' },
  hiring_intro: { label: 'Hiring / Talent Intro', icon: '👥' },
  general_networking: { label: 'General Networking', icon: '🤝' },
};
