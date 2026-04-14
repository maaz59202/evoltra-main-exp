export const SUPPORTED_CURRENCIES = [
  { code: 'USD', label: 'USD ($)', symbol: '$' },
  { code: 'PKR', label: 'PKR (Rs)', symbol: 'Rs' },
  { code: 'EUR', label: 'EUR (€)', symbol: '€' },
  { code: 'GBP', label: 'GBP (£)', symbol: '£' },
  { code: 'AED', label: 'AED (AED)', symbol: 'AED' },
] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code'];

export const DEFAULT_CURRENCY: SupportedCurrencyCode = 'USD';

export const getCurrencyConfig = (code?: string | null) =>
  SUPPORTED_CURRENCIES.find((currency) => currency.code === code) ||
  SUPPORTED_CURRENCIES[0];

export const formatCurrencyAmount = (
  amount: number,
  currencyCode?: string | null,
  digits = 2,
) => {
  const currency = getCurrencyConfig(currencyCode);
  return `${currency.symbol}${Number(amount).toFixed(digits)}`;
};
