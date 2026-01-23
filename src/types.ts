export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'one-off';
export type CurrencyType = 'HKD' | 'SGD' | 'USD';
export type SortOption = 'alphabetical' | 'value-high' | 'value-low';
export type CategoryType = 'Entertainment' | 'Productivity' | 'Utilities' | 'Finance' | 'Health & Fitness' | 'Education' | 'Shopping' | 'Other';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: CurrencyType;
  startDate: string;
  frequency: FrequencyType;
  category: CategoryType;
  cancelled: boolean;
  cancelledDate?: string;
  notes?: string;
  screenshot?: string;
  createdAt: string;
}

export interface UpcomingPayment {
  subscription: Subscription;
  nextPaymentDate: Date;
  daysUntil: number;
}
