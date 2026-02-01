import { Subscription, CurrencyType } from '../types';
import { getMonthlyValue } from './calculations';
//import { calculateNextPaymentDate } from './dates';

/**
 * Calculate Levenshtein edit distance between two strings
 */
const getEditDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
};

/**
 * Calculate similarity ratio between two strings (0-1)
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};
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
