import { useMemo } from 'react';
import { Subscription, CurrencyType, SortOption } from '../types';
import { filterSubscriptions, sortSubscriptions } from '../utils/filters';
import { getUpcomingPayments } from '../utils/dates';
import { calculateTotalMonthly } from '../utils/calculations';

export function useSubscriptionFiltering(
  subscriptions: Subscription[],
  selectedTags: string[],
  searchQuery: string,
  sortOption: SortOption,
  displayCurrency: CurrencyType
) {
  const tagFilteredSubscriptions = useMemo(() => {
    if (selectedTags.length === 0) {
      return subscriptions;
    }
    return subscriptions.filter((sub) => {
      const subTags = sub.tags || ['Personal'];
      return subTags.some((tag) => selectedTags.includes(tag));
    });
  }, [subscriptions, selectedTags]);

  const activeSubscriptions = useMemo(() => {
    return tagFilteredSubscriptions.filter((sub) => !sub.cancelled);
  }, [tagFilteredSubscriptions]);

  const filteredSubscriptions = useMemo(() => {
    return filterSubscriptions(tagFilteredSubscriptions, searchQuery);
  }, [tagFilteredSubscriptions, searchQuery]);

  const sortedSubscriptions = useMemo(() => {
    return sortSubscriptions(filteredSubscriptions, sortOption, displayCurrency);
  }, [filteredSubscriptions, sortOption, displayCurrency]);

  const upcomingPayments = useMemo(() => {
    return getUpcomingPayments(sortedSubscriptions);
  }, [sortedSubscriptions]);

  const totalMonthly = useMemo(() => {
    return calculateTotalMonthly(tagFilteredSubscriptions, displayCurrency);
  }, [tagFilteredSubscriptions, displayCurrency]);

  return {
    tagFilteredSubscriptions,
    activeSubscriptions,
    filteredSubscriptions,
    sortedSubscriptions,
    upcomingPayments,
    totalMonthly,
  };
}
