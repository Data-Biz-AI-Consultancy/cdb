/**
 * Person list item types and form models.
 */

export interface PersonItem {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_email?: string | null;
  primary_phone?: string | null;
  linkedin_url?: string | null;
  city?: string | null;
  country?: string | null;
  sources?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreatePersonFormData {
  first_name: string;
  last_name: string;
  primary_email: string;
  primary_phone: string;
  linkedin_url: string;
  city: string;
  country: string;
}

export interface BulkEditPersonFormData {
  city: string;
  country: string;
  add_source: string;
  remove_source: string;
}
