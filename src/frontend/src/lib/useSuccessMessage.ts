'use client';

import { useState, useCallback } from 'react';

/**
 * Generic transient success message hook.
 * Extracted from the identical `showSuccess` pattern used in
 * companies/page.tsx and useCompanyData.ts.
 *
 * @param durationMs How long to show the message (default: 4 000 ms).
 */
export function useSuccessMessage(durationMs = 4000) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = useCallback(
    (msg: string) => {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), durationMs);
    },
    [durationMs]
  );

  const dismissSuccess = useCallback(() => setSuccessMessage(null), []);

  return { successMessage, showSuccess, dismissSuccess, setSuccessMessage };
}
