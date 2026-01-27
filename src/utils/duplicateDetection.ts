import { Subscription, CurrencyType } from '../types';
import { getMonthlyValue } from './calculations';
import { calculateNextPaymentDate } from './dates';

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
 * Detect potential duplicate subscriptions based on name, price, and payment date
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

      // Check price match
      const monthlyValue1 = getMonthlyValue(sub1, displayCurrency);
      const monthlyValue2 = getMonthlyValue(sub2, displayCurrency);
      const priceDiff = Math.abs(monthlyValue1 - monthlyValue2);
      const priceMatch = priceDiff < 0.01;

      if (!priceMatch) continue;

      // Check date match
      const nextPayment1 = !sub1.cancelled
        ? calculateNextPaymentDate(sub1.startDate, sub1.frequency)
        : null;
      const nextPayment2 = !sub2.cancelled
        ? calculateNextPaymentDate(sub2.startDate, sub2.frequency)
        : null;

      let dateMatch = false;
      if (nextPayment1 && nextPayment2) {
        const date1 = nextPayment1.toISOString().split('T')[0];
        const date2 = nextPayment2.toISOString().split('T')[0];
        dateMatch = date1 === date2;
      } else if (!nextPayment1 && !nextPayment2) {
        dateMatch = true;
      }

      if (!dateMatch) continue;

      // Check name similarity
      const normalizedName1 = sub1.name.toLowerCase().trim();
      const normalizedName2 = sub2.name.toLowerCase().trim();
      const nameSimilarity = calculateSimilarity(normalizedName1, normalizedName2);
      const nameMatch = nameSimilarity > 0.9;

      if (nameMatch) {
        duplicateIds.add(sub1.id);
        duplicateIds.add(sub2.id);
      }
    }
  }

  return duplicateIds;
};
