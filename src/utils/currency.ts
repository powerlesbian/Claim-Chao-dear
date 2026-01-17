import { CurrencyType } from '../types';

const exchangeRates: Record<CurrencyType, Record<CurrencyType, number>> = {
  HKD: {
    HKD: 1,
    SGD: 0.17,
    USD: 0.13
  },
  SGD: {
    HKD: 5.88,
    SGD: 1,
    USD: 0.74
  },
  USD: {
    HKD: 7.80,
    SGD: 1.35,
    USD: 1
  }
};

export const convertCurrency = (
  amount: number,
  fromCurrency: CurrencyType,
  toCurrency: CurrencyType
): number => {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  return amount * exchangeRates[fromCurrency][toCurrency];
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
