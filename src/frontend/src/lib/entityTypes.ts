/**
 * Canonical lightweight entity types shared across feature modules.
 *
 * `PersonOption` and `CompanyOption` were previously declared independently
 * in activities/page.tsx, engagements/page.tsx, and engagements/[id]/page.tsx
 * (despite already being exported from opportunities/types.ts).
 */

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

/** Returns a display name for a person, falling back through available fields. */
export function formatPersonName(
  person: PersonOption,
  fallback = 'Unknown'
): string {
  const parts = [person.first_name, person.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  if (person.primary_email) return person.primary_email;
  return fallback;
}
