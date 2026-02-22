import { CurrencyType } from '../types';

// USD-based rates (1 USD = X currency)
const usdRates: Record<CurrencyType, number> = {
  USD: 1,
  HKD: 7.80,
  SGD: 1.35,
  MYR: 4.48,
  GBP: 0.79,
  CNY: 7.28,
  EUR: 0.93,
};

export const convertCurrency = (
  amount: number,
  fromCurrency: CurrencyType,
  toCurrency: CurrencyType
): number => {
  if (fromCurrency === toCurrency) return amount;
  const amountInUsd = amount / usdRates[fromCurrency];
  return amountInUsd * usdRates[toCurrency];
};

export const getDisplayCurrency = (): CurrencyType => {
  const stored = localStorage.getItem('display-currency');
  if (stored && (stored === 'HKD' || stored === 'SGD' || stored === 'USD')) {
    return stored as CurrencyType;
  }
  return 'HKD';
};

export const setDisplayCurrency = (currency: CurrencyType): void => {
  localStorage.setItem('display-currency', currency);
};
