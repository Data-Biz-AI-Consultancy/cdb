import { describe, it, expect } from 'vitest';
import { formatMoney, getCurrencySymbol, COMMON_CURRENCIES } from './currency';

describe('currency utilities', () => {
  it('correctly maps currency symbols', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
    expect(getCurrencySymbol('eur')).toBe('€');
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencySymbol('GBP')).toBe('£');
    expect(getCurrencySymbol('CHF')).toBe('CHF');
  });

  it('formats money properly with Euro and USD', () => {
    expect(formatMoney(1500, 'EUR')).toBe('€1,500');
    expect(formatMoney(1500)).toBe('€1,500');
    expect(getCurrencySymbol()).toBe('€');
    expect(formatMoney(25000, 'USD')).toBe('$25,000');
    expect(formatMoney('82500.50', 'EUR')).toBe('€82,500.50');
    expect(formatMoney(null, 'EUR')).toBe('—');
  });

  it('provides comprehensive list of supported common currencies', () => {
    expect(COMMON_CURRENCIES.some((c) => c.code === 'EUR')).toBe(true);
    expect(COMMON_CURRENCIES.some((c) => c.code === 'USD')).toBe(true);
    expect(COMMON_CURRENCIES.some((c) => c.code === 'GBP')).toBe(true);
  });
});
