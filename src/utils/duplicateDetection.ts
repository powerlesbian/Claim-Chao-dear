import { Subscription, CurrencyType } from '../types';
import { getMonthlyValue } from './calculations';
//import { calculateNextPaymentDate } from './dates';

/**
 * Detect exact duplicate subscriptions
 * Duplicates = same name (case-insensitive, trimmed) AND same amount
 */
export const detectDuplicates = (
  subscriptions: Subscription[],
  displayCurrency: CurrencyType
): Set<string> => {
  const duplicateIds = new Set<string>();

  for (let i = 0; i < subscriptions.length; i++) {
    for (let j = i + 1; j < subscriptions.length; j++) {
      const sub1 = subscriptions[i];
      const sub2 = subscriptions[j];

      // Skip if either is marked as not duplicate
      if (sub1.markedAsNotDuplicate || sub2.markedAsNotDuplicate) continue;

      // Exact name match (case-insensitive, trimmed)
      const name1 = sub1.name.toLowerCase().trim();
      const name2 = sub2.name.toLowerCase().trim();
      
      if (name1 !== name2) continue;

      // Check notes - if notes are different, not a duplicate
      const notes1 = (sub1.notes || '').toLowerCase().trim();
      const notes2 = (sub2.notes || '').toLowerCase().trim();
      
      if (notes1 !== notes2) continue;

      // Exact amount match (converted to same currency)
      const amount1 = getMonthlyValue(sub1, displayCurrency);
      const amount2 = getMonthlyValue(sub2, displayCurrency);
      
      // Allow tiny floating point difference (< 1 cent)
      if (Math.abs(amount1 - amount2) > 0.01) continue;

      // All conditions met = duplicate
      duplicateIds.add(sub1.id);
      duplicateIds.add(sub2.id);
    }
  }

  return duplicateIds;
};
