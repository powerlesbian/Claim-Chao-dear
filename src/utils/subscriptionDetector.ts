import { Transaction } from './pdfParser';

export interface DetectedSubscription {
  name: string;
  amount: number;
  frequency: 'monthly' | 'yearly';
  category: 'Entertainment' | 'Productivity' | 'Utilities' | 'Finance' | 'Health & Fitness' | 'Education' | 'Shopping' | 'Other';
  confidence: number;
  transactions: Transaction[];
}

const COMMON_SUBSCRIPTION_KEYWORDS = [
  'netflix', 'spotify', 'apple', 'amazon', 'prime', 'hulu', 'disney',
  'youtube', 'premium', 'subscription', 'membership', 'monthly', 'annual',
  'adobe', 'microsoft', 'office', 'dropbox', 'icloud', 'google', 'gym',
  'fitness', 'streaming', 'music', 'video', 'cloud', 'storage'
];

const CATEGORY_KEYWORDS = {
  'Entertainment': [
    'netflix', 'spotify', 'hulu', 'disney', 'hbo', 'prime video', 'youtube',
    'music', 'streaming', 'gaming', 'twitch', 'playstation', 'xbox', 'nintendo'
  ],
  'Productivity': [
    'adobe', 'microsoft', 'office', 'slack', 'notion', 'asana', 'trello',
    'zoom', 'canva', 'figma', 'github', 'dropbox', 'evernote', 'todoist'
  ],
  'Utilities': [
    'internet', 'phone', 'mobile', 'electricity', 'water', 'gas', 'utility',
    'broadband', 'wifi', 'telecom', 'verizon', 'att', 'tmobile'
  ],
  'Finance': [
    'bank', 'insurance', 'investment', 'trading', 'loan', 'mortgage',
    'credit', 'savings', 'paypal', 'venmo', 'quickbooks', 'mint'
  ],
  'Health & Fitness': [
    'gym', 'fitness', 'yoga', 'health', 'wellness', 'meditation', 'therapy',
    'peloton', 'fitbit', 'myfitnesspal', 'headspace', 'calm', 'medical'
  ],
  'Education': [
    'course', 'learning', 'education', 'school', 'university', 'training',
    'udemy', 'coursera', 'skillshare', 'masterclass', 'duolingo', 'tutoring'
  ],
  'Shopping': [
    'amazon prime', 'costco', 'membership', 'delivery', 'subscription box',
    'meal kit', 'walmart', 'target', 'instacart', 'shipt'
  ]
};

function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

function hasSubscriptionKeywords(description: string): boolean {
  const normalized = normalizeDescription(description);
  return COMMON_SUBSCRIPTION_KEYWORDS.some(keyword =>
    normalized.includes(keyword)
  );
}

function detectCategory(description: string): 'Entertainment' | 'Productivity' | 'Utilities' | 'Finance' | 'Health & Fitness' | 'Education' | 'Shopping' | 'Other' {
  const normalized = normalizeDescription(description);

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return category as 'Entertainment' | 'Productivity' | 'Utilities' | 'Finance' | 'Health & Fitness' | 'Education' | 'Shopping';
    }
  }

  return 'Other';
}

function groupSimilarTransactions(transactions: Transaction[]): Transaction[][] {
  const groups: Transaction[][] = [];
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
      const amountSimilarity = amountDiff / Math.max(transactions[i].amount, transactions[j].amount);

      if (similarity > 0.6 && amountSimilarity < 0.1) {
        group.push(transactions[j]);
        used.add(j);
      }
    }

    if (group.length >= 2 || hasSubscriptionKeywords(group[0].description)) {
      groups.push(group);
    }
  }

  return groups;
}

export function detectSubscriptions(transactions: Transaction[]): DetectedSubscription[] {
  const groups = groupSimilarTransactions(transactions);
  const detectedSubscriptions: DetectedSubscription[] = [];

  for (const group of groups) {
    if (group.length === 0) continue;

    const avgAmount = group.reduce((sum, t) => sum + t.amount, 0) / group.length;

    let name = group[0].description;
    const normalized = normalizeDescription(name);
    const firstWord = normalized.split(' ')[0];
    if (firstWord.length > 3) {
      name = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
    }

    let confidence = 0;
    if (group.length >= 3) confidence = 0.9;
    else if (group.length === 2) confidence = 0.7;
    else if (hasSubscriptionKeywords(group[0].description)) confidence = 0.6;
    else confidence = 0.4;

    let frequency: 'monthly' | 'yearly' = 'monthly';
    if (group.length >= 2) {
      const dates = group.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
      const avgDaysBetween = dates.reduce((sum, date, i) => {
        if (i === 0) return 0;
        return sum + (date.getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
      }, 0) / (dates.length - 1);

      if (avgDaysBetween > 200) {
        frequency = 'yearly';
      }
    }

    const category = detectCategory(group[0].description);

    detectedSubscriptions.push({
      name,
      amount: Math.round(avgAmount * 100) / 100,
      frequency,
      category,
      confidence,
      transactions: group,
    });
  }

  return detectedSubscriptions.sort((a, b) => b.confidence - a.confidence);
}
