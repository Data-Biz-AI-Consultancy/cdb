/**
 * Normalises signal slug strings so that variant plural/singular forms
 * from different API versions resolve to the same key.
 */
export const normalizeSlug = (slug?: string | null): string => {
  if (!slug) return '';
  return slug
    .toLowerCase()
    .trim()
    .replace(/_accounts$/, '_account')
    .replace(/_conversations$/, '_conversation')
    .replace(/_contracts$/, '_contract')
    .replace(/_changes$/, '_change')
    .replace(/_events$/, '_event')
    .replace(/_signals$/, '_signal')
    .replace(/_or_funding_/, '_funding_');
};
