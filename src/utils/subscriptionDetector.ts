import { Transaction } from './pdfParser';
import { FrequencyType, CurrencyType } from '../types';

export interface DetectedSubscription {
  name: string;
  amount: number;
  frequency: FrequencyType;
  category: string;
  confidence: number;
  transactions: Transaction[];
  currency: CurrencyType;
  date: string;
  isRecurring: boolean;
}

// Merchant name mappings for cleaner display
const MERCHANT_NAMES: Record<string, string> = {
  'spotify': 'Spotify',
  'netflix': 'Netflix',
  'apple': 'Apple',
  'amazon': 'Amazon',
  'google': 'Google',
  'microsoft': 'Microsoft',
  'adobe': 'Adobe',
  'dropbox': 'Dropbox',
  'disney': 'Disney+',
  'hbo': 'HBO',
  'youtube': 'YouTube',
  'parknshop': 'ParkNShop',
  'wellcome': 'Wellcome',
  'watsons': 'Watsons',
  'smartone': 'SmarTone',
  'sanatorium': 'HK Sanatorium',
  'shangri-la': 'Shangri-La',
  'siteground': 'SiteGround',
  'trip.com': 'Trip.com',
  'paypal': 'PayPal',
  'rimowa': 'Rimowa',
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Entertainment': [
    'netflix', 'spotify', 'hulu', 'disney', 'hbo', 'prime video', 'youtube',
    'music', 'streaming', 'gaming', 'twitch', 'playstation', 'xbox', 'nintendo',
    'cinema', 'movie', 'theatre', 'concert', 'karaoke',
  ],
  'Groceries': [
    'supermarket', 'parknshop', 'wellcome', 'market', 'grocery', 'food',
    'fusion', 'city super', 'taste', 'great', 'aeon',
  ],
  'Dining': [
    'restaurant', 'cafe', 'coffee', 'dining', 'food', 'eat', 'kitchen',
    'noodle', 'sushi', 'pizza', 'burger', 'bar', 'grill', 'bistro',
    'bakery', 'minato', 'caviar',
  ],
  'Health & Beauty': [
    'pharmacy', 'watsons', 'mannings', 'beauty', 'salon', 'spa', 'clinic',
    'hospital', 'sanatorium', 'medical', 'dental', 'optical', 'chemist',
  ],
  'Shopping': [
    'retail', 'shop', 'store', 'mall', 'boutique', 'fashion', 'clothing',
    'rimowa', 'luggage', 'leather', 'goods', 'zara', 'hm', 'uniqlo',
  ],
  'Travel': [
    'hotel', 'airline', 'flight', 'booking', 'trip', 'travel', 'shangri-la',
    'marriott', 'hilton', 'cathay', 'airport', 'taxi', 'uber', 'grab',
  ],
  'Telecom': [
    'smartone', 'csl', 'three', 'china mobile', 'pccw', 'hkt', 'telecom',
    'mobile', 'phone', 'internet', 'broadband',
  ],
  'Software': [
    'software', 'app', 'saas', 'cloud', 'hosting', 'domain', 'siteground',
    'adobe', 'microsoft', 'google', 'dropbox', 'notion', 'slack', 'github',
  ],
  'Sports & Fitness': [
    'gym', 'fitness', 'golf', 'sport', 'yoga', 'swimming', 'tennis',
    'running', 'athletic',
  ],
  'Finance': [
    'bank', 'insurance', 'investment', 'tax', 'accounting', 'late payment',
    'fee', 'charge', 'interest',
  ],
};

function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectCategory(description: string, rawCategory?: string): string {
  // Use raw category from PDF if available
  if (rawCategory) {
    const upper = rawCategory.toUpperCase();
    if (upper.includes('SUPERMARKET') || upper.includes('GENERAL GOODS')) return 'Groceries';
    if (upper.includes('RESTAURANT') || upper.includes('DINING')) return 'Dining';
    if (upper.includes('BEAUTY') || upper.includes('CHEMIST') || upper.includes('HOSPITAL')) return 'Health & Beauty';
    if (upper.includes('SPORTING')) return 'Sports & Fitness';
    if (upper.includes('LEATHER') || upper.includes('LUGGAGE')) return 'Shopping';
    if (upper.includes('HOTEL')) return 'Travel';
  }

  const normalized = normalizeDescription(description);

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return category;
    }
  }

  return 'Other';
}

function cleanMerchantName(description: string): string {
  let name = description
    .replace(/\s+/g, ' ')
    .replace(/\d{5,}/g, '') // Remove long numbers
    .replace(/\s*-\s*[A-Z]{3}-\d+/g, '') // Remove codes like "- KTS-253"
    .replace(/\s+\d+\s*$/, '') // Remove trailing numbers
    .replace(/\*+/g, ' ') // Replace asterisks with spaces
    .trim();

  // Check for known merchant mappings
  const normalized = normalizeDescription(name);
  for (const [key, displayName] of Object.entries(MERCHANT_NAMES)) {
    if (normalized.includes(key)) {
      return displayName;
    }
  }

  // Capitalize first letter of each word
  name = name
    .split(' ')
    .filter(word => word.length > 1)
    .slice(0, 3) // Take first 3 words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return name || description.slice(0, 30);
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeDescription(str1);
  const s2 = normalizeDescription(str2);

  const words1 = s1.split(' ');
  const words2 = s2.split(' ');

  let matchCount = 0;
  for (const word1 of words1) {
    if (word1.length < 3) continue;
    for (const word2 of words2) {
      if (word1 === word2) {
        matchCount++;
        break;
      }
    }
  }

  const maxWords = Math.max(words1.length, words2.length);
  return maxWords > 0 ? matchCount / maxWords : 0;
}

// Find recurring transaction patterns
function findRecurringPatterns(transactions: Transaction[]): Map<string, Transaction[]> {
  const patterns = new Map<string, Transaction[]>();
  const used = new Set<number>();

  for (let i = 0; i < transactions.length; i++) {
    if (used.has(i)) continue;

    const group: Transaction[] = [transactions[i]];
    used.add(i);

    for (let j = i + 1; j < transactions.length; j++) {
      if (used.has(j)) continue;

      const similarity = calculateSimilarity(
        transactions[i].description,
        transactions[j].description
      );

      const amountDiff = Math.abs(transactions[i].amount - transactions[j].amount);
      const amountSimilarity = transactions[i].amount > 0 
        ? amountDiff / transactions[i].amount 
        : 1;

      if (similarity > 0.5 && amountSimilarity < 0.15) {
        group.push(transactions[j]);
        used.add(j);
      }
    }

    if (group.length >= 2) {
      const key = normalizeDescription(transactions[i].description).split(' ')[0];
      patterns.set(key, group);
    }
  }

  return patterns;
}

// Convert ALL transactions to importable items
export function convertTransactionsToSubscriptions(
  transactions: Transaction[],
  defaultCurrency: CurrencyType = 'HKD'
): DetectedSubscription[] {
  const recurringPatterns = findRecurringPatterns(transactions);
  const recurringDescriptions = new Set<string>();

  // Mark which transactions are part of recurring patterns
  for (const group of recurringPatterns.values()) {
    for (const t of group) {
      recurringDescriptions.add(normalizeDescription(t.description));
    }
  }

  return transactions.map(transaction => {
    const normalized = normalizeDescription(transaction.description);
    const isRecurring = recurringDescriptions.has(normalized);
    const currency = (transaction.currency as CurrencyType) || defaultCurrency;

    return {
      name: cleanMerchantName(transaction.description),
      amount: transaction.amount,
      frequency: isRecurring ? 'monthly' : 'one-off' as FrequencyType,
      category: detectCategory(transaction.description, transaction.category),
      confidence: isRecurring ? 0.8 : 0.6,
      transactions: [transaction],
      currency,
      date: transaction.date,
      isRecurring,
    };
  });
}

// Legacy function for backward compatibility
export function detectSubscriptions(transactions: Transaction[]): DetectedSubscription[] {
  return convertTransactionsToSubscriptions(transactions);
}
