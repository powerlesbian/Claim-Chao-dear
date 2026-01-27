import { Subscription, SortOption, CurrencyType } from '../types';
import { getMonthlyValue } from './calculations';

/**
 * Filter subscriptions by search query
 */
export const filterSubscriptions = (
  subscriptions: Subscription[],
  searchQuery: string
): Subscription[] => {
  if (!searchQuery.trim()) return subscriptions;

  const query = searchQuery.toLowerCase();
  return subscriptions.filter(
    (sub) =>
      sub.name.toLowerCase().includes(query) ||
      sub.notes?.toLowerCase().includes(query) ||
      sub.currency.toLowerCase().includes(query) ||
      sub.frequency.toLowerCase().includes(query)
  );
};

/**
 * Sort subscriptions by the selected option
 */
export const sortSubscriptions = (
  subscriptions: Subscription[],
  sortOption: SortOption,
  displayCurrency: CurrencyType
): Subscription[] => {
  const sorted = [...subscriptions];

  switch (sortOption) {
    case 'alphabetical':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'value-high':
      return sorted.sort(
        (a, b) =>
          getMonthlyValue(b, displayCurrency) - getMonthlyValue(a, displayCurrency)
      );
    case 'value-low':
      return sorted.sort(
        (a, b) =>
          getMonthlyValue(a, displayCurrency) - getMonthlyValue(b, displayCurrency)
      );
    default:
      return sorted;
  }
};
