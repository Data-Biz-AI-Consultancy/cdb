export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

export const COMMON_CURRENCIES: CurrencyOption[] = [
  { code: 'EUR', symbol: '€', name: 'Euro (€ EUR)' },
  { code: 'USD', symbol: '$', name: 'US Dollar ($ USD)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£ GBP)' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc (CHF)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (S$)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥ JPY)' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar (HK$)' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona (SEK)' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone (NOK)' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone (DKK)' },
];

const SYMBOL_MAP: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
  CAD: 'CA$',
  AUD: 'A$',
  SGD: 'S$',
  JPY: '¥',
  HKD: 'HK$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
};

export function getCurrencySymbol(currency?: string | null): string {
  if (!currency) return '$';
  const upper = currency.toUpperCase().trim();
  return SYMBOL_MAP[upper] || upper;
}

export function formatMoney(
  amount: number | string | null | undefined,
  currency?: string | null,
  options: { includeCode?: boolean } = {}
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '—';
  }

  const num = Number(amount);
  const code = (currency || 'USD').toUpperCase().trim();
  const symbol = getCurrencySymbol(code);

  const formattedNum = num.toLocaleString('en-US', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  if (symbol === code) {
    return `${code} ${formattedNum}`;
  }

  if (options.includeCode) {
    return `${symbol}${formattedNum} ${code}`;
  }

  return `${symbol}${formattedNum}`;
}
