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
export function sortSubscriptions(
  subscriptions: Subscription[],
  sortOption: SortOption,
  displayCurrency: CurrencyType
): Subscription[] {
  return [...subscriptions].sort((a, b) => {
    switch (sortOption) {
      case 'alphabetical':
        return a.name.localeCompare(b.name);
      case 'value-high':
        return getMonthlyValue(b, displayCurrency) - getMonthlyValue(a, displayCurrency);
      case 'value-low':
        return getMonthlyValue(a, displayCurrency) - getMonthlyValue(b, displayCurrency);
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });
}
