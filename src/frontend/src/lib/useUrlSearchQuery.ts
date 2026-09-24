'use client';

import { useEffect, useState } from 'react';

/**
 * On first mount, reads a query string value from the URL (`?q=` or `?search=`
 * by default) and returns it as the initial state. Subsequent changes are
 * managed by the returned setter — the URL is NOT updated (that would require
 * Next.js router.push which these pages don't use).
 *
 * Previously duplicated in:
 *   - companies/hooks/useCompanies.ts
 *   - persons/page.tsx
 *
 * @param keys   Ordered list of query param keys to check. First match wins.
 *               Defaults to `['q', 'search']`.
 */
export function useUrlSearchQuery(keys: string[] = ['q', 'search']): [string, (v: string) => void] {
  const [query, setQuery] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    for (const key of keys) {
      const val = params.get(key);
      if (val) {
        setQuery(val);
        break;
      }
    }
    // Only run on mount — deps intentionally empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [query, setQuery];
}
